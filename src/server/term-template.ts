import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { PDFDocument } from 'pdf-lib';
import { TERM_TEMPLATE_MAX_BYTES, type TermTemplateSettings } from '../shared/term-template';
import { getTermStorage, TermStorageNotConfiguredError, type TermStorageEnv } from './term-storage';

interface TermRecord {
  agency_id: number;
  enabled: boolean | number;
  object_key: string;
  filename: string;
  size: number;
  file_data?: string | null;
  updated_at: string;
}
type TermEnv = { Bindings: Env & TermStorageEnv; Variables: { user: { agency_id: number; role: string } } };

class TermFileMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TermFileMissingError';
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let termSchemaEnsured = false;
let enabledColIsInteger = false;

async function ensureTermTemplateSchema(db: D1Database) {
  if (termSchemaEnsured) return;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS agency_term_templates (
        agency_id INTEGER PRIMARY KEY REFERENCES agencies(id),
        enabled BOOLEAN NOT NULL DEFAULT false,
        object_key TEXT NOT NULL,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        file_data TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ).run();
  } catch {
    // Table may already exist with different dialect defaults
  }

  try {
    await db.prepare('ALTER TABLE agency_term_templates ADD COLUMN IF NOT EXISTS file_data TEXT').run();
  } catch {
    try {
      await db.prepare('ALTER TABLE agency_term_templates ADD COLUMN file_data TEXT').run();
    } catch {
      // Column likely already exists
    }
  }

  try {
    const { results } = await db.prepare(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agency_term_templates' AND column_name = 'enabled'"
    ).all<{ column_name?: string; data_type?: string }>();
    const row = results?.[0];
    const dataType = String(row?.data_type || '').toLowerCase();
    if (dataType.includes('int')) {
      try {
        await db.prepare('ALTER TABLE agency_term_templates ALTER COLUMN enabled DROP DEFAULT').run();
        await db.prepare('ALTER TABLE agency_term_templates ALTER COLUMN enabled TYPE BOOLEAN USING (COALESCE(enabled, 0) <> 0)').run();
        await db.prepare('ALTER TABLE agency_term_templates ALTER COLUMN enabled SET DEFAULT FALSE').run();
        enabledColIsInteger = false;
      } catch {
        enabledColIsInteger = true;
      }
    } else if (dataType === 'boolean') {
      enabledColIsInteger = false;
    }
  } catch {
    // SQLite / D1 / in-memory does not expose information_schema
  }

  termSchemaEnsured = true;
}

async function loadTermBytes(env: TermEnv['Bindings'], row: TermRecord): Promise<Uint8Array> {
  try {
    return await getTermStorage(env).get(row.object_key);
  } catch {
    // Fallback to database-stored base64 copy when container disk/object storage is empty
    if (row.file_data && row.file_data.trim().length > 0) {
      const bytes = base64ToUint8(row.file_data.trim());
      try {
        await getTermStorage(env).put(row.object_key, bytes);
      } catch {
        // Best-effort cache re-warm
      }
      return bytes;
    }
    throw new TermFileMissingError(
      'Arquivo do termo não encontrado neste servidor. Reenvie o PDF em Configurações → Modelo de Termo.'
    );
  }
}

export async function validateTermPdf(bytes: Uint8Array): Promise<void> {
  if (!bytes.length || bytes.length > TERM_TEMPLATE_MAX_BYTES) {
    throw new Error('Envie um PDF de até 5 MB, com somente uma página.');
  }
  if (!new TextDecoder().decode(bytes.slice(0, 8)).startsWith('%PDF-')) {
    throw new Error('O arquivo não é um PDF válido.');
  }
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false });
  } catch {
    throw new Error('PDF inválido ou protegido por senha. Envie um PDF acessível, sem criptografia.');
  }
  if (document.isEncrypted) throw new Error('O PDF não pode ser criptografado.');
  if (document.getPageCount() !== 1) throw new Error('O PDF do termo deve ter somente uma página.');
  const { width, height } = document.getPage(0).getSize();
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('O PDF não possui uma página válida.');
  }
}

function settings(row: TermRecord | null): TermTemplateSettings {
  return {
    enabled: row?.enabled === true || row?.enabled === 1,
    filename: row?.filename ?? null, size: row?.size ?? null, updated_at: row?.updated_at ?? null,
    file_url: row ? `/api/term-template/file?version=${encodeURIComponent(row.object_key)}` : null,
  };
}

export const termTemplateRoutes = new Hono<TermEnv>();
termTemplateRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
termTemplateRoutes.use('*', bodyLimit({
  maxSize: TERM_TEMPLATE_MAX_BYTES + 65536,
  onError: c => c.json({ error: 'Envie um PDF de até 5 MB.' }, 413),
}));

termTemplateRoutes.get('/', async c => {
  await ensureTermTemplateSchema(c.env.DB);
  const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
    .bind(c.get('user').agency_id).first<TermRecord>();
  return c.json(settings(row));
});

termTemplateRoutes.get('/file', async c => {
  await ensureTermTemplateSchema(c.env.DB);
  const agencyId = c.get('user').agency_id;
  const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
    .bind(agencyId).first<TermRecord>();
  if (!row || (c.req.query('version') && c.req.query('version') !== row.object_key)) {
    return c.json({ error: 'Modelo não encontrado ou substituído. Atualize a prévia.' }, 404);
  }
  try {
    const bytes = await loadTermBytes(c.env, row);
    return new Response(bytes as BodyInit, { headers: {
      'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="termo.pdf"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (error instanceof TermFileMissingError) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: 'Não foi possível carregar o termo. Verifique o armazenamento e tente novamente.' }, 503);
  }
});

termTemplateRoutes.post('/', async c => {
  await ensureTermTemplateSchema(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Acesso negado' }, 403);
  let file: File;
  let bytes: Uint8Array;
  try {
    const form = await c.req.formData();
    const candidate = form.get('file');
    if (!candidate || typeof candidate === 'string') throw new Error('Selecione o arquivo PDF.');
    file = candidate;
    if (file.size > TERM_TEMPLATE_MAX_BYTES) throw new Error('Envie um PDF de até 5 MB.');
    bytes = new Uint8Array(await file.arrayBuffer());
    await validateTermPdf(bytes);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'PDF inválido.' }, 400);
  }

  try {
    const key = `private/agency-terms/${user.agency_id}/${crypto.randomUUID()}.pdf`;
    const previous = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
      .bind(user.agency_id).first<TermRecord>();

    let storage: ReturnType<typeof getTermStorage> | null = null;
    try {
      storage = getTermStorage(c.env);
      await storage.put(key, bytes);
    } catch (storageErr) {
      if (storageErr instanceof TermStorageNotConfiguredError) {
        storage = null;
      } else {
        console.warn('Term storage put warning (persisting in DB):', storageErr);
      }
    }

    const encodedData = uint8ToBase64(bytes);
    const safeFilename =
      Array.from(file.name)
        .filter((ch) => {
          const code = ch.charCodeAt(0);
          return code >= 0x20 && code !== 0x7f;
        })
        .join('')
        .slice(0, 200) || 'termo.pdf';
    const initialEnabled = enabledColIsInteger ? 0 : false;

    try {
      await c.env.DB.prepare(`INSERT INTO agency_term_templates (agency_id, enabled, object_key, filename, size, file_data)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (agency_id) DO UPDATE SET
        object_key = excluded.object_key, filename = excluded.filename, size = excluded.size, file_data = excluded.file_data, updated_at = CURRENT_TIMESTAMP`)
        .bind(user.agency_id, initialEnabled, key, safeFilename, bytes.length, encodedData).run();
    } catch (error) {
      if (storage) await storage.delete(key).catch(() => {});
      throw error;
    }

    // Delete only the superseded object. New keys are immutable and random.
    if (previous && storage) await storage.delete(previous.object_key).catch(() => {});
    const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
      .bind(user.agency_id).first<TermRecord>();
    return c.json(settings(row));
  } catch (error) {
    const message = error instanceof TermStorageNotConfiguredError
      ? error.message
      : 'Não foi possível salvar o termo. Verifique o armazenamento de arquivos. O modelo anterior foi mantido.';
    return c.json({ error: message }, 503);
  }
});

termTemplateRoutes.patch('/', async c => {
  await ensureTermTemplateSchema(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Acesso negado' }, 403);
  let enabled: boolean;
  try {
    const body = await c.req.json();
    if (typeof body.enabled !== 'boolean') throw new Error();
    enabled = body.enabled;
  } catch {
    return c.json({ error: 'Informe ativado ou desativado.' }, 400);
  }
  const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
    .bind(user.agency_id).first<TermRecord>();
  if (!row) return c.json({ error: 'Envie um PDF válido antes de ativar o termo.' }, 400);
  if (enabled) {
    try {
      await validateTermPdf(await loadTermBytes(c.env, row));
    } catch (error) {
      if (error instanceof TermFileMissingError) {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: 'Não foi possível validar o PDF salvo. Confira o armazenamento ou substitua o arquivo.' }, 503);
    }
  }
  const enabledParam = enabledColIsInteger ? (enabled ? 1 : 0) : enabled;
  const updated = await c.env.DB.prepare(`UPDATE agency_term_templates SET enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE agency_id = ? AND object_key = ? RETURNING *`).bind(enabledParam, user.agency_id, row.object_key).first<TermRecord>();
  if (!updated) return c.json({ error: 'O modelo mudou. Atualize e tente novamente.' }, 409);
  return c.json(settings(updated));
});
