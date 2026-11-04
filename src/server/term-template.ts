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
  updated_at: string;
}
type TermEnv = { Bindings: Env & TermStorageEnv; Variables: { user: { agency_id: number; role: string } } };

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
  const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
    .bind(c.get('user').agency_id).first<TermRecord>();
  return c.json(settings(row));
});

termTemplateRoutes.get('/file', async c => {
  const agencyId = c.get('user').agency_id;
  const row = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
    .bind(agencyId).first<TermRecord>();
  if (!row || (c.req.query('version') && c.req.query('version') !== row.object_key)) {
    return c.json({ error: 'Modelo não encontrado ou substituído. Atualize a prévia.' }, 404);
  }
  try {
    const bytes = await getTermStorage(c.env).get(row.object_key);
    return new Response(bytes as BodyInit, { headers: {
      'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="termo.pdf"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return c.json({ error: 'Não foi possível carregar o termo. Verifique o armazenamento e tente novamente.' }, 503);
  }
});

termTemplateRoutes.post('/', async c => {
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
  let storage;
  try {
    storage = getTermStorage(c.env);
    const key = `private/agency-terms/${user.agency_id}/${crypto.randomUUID()}.pdf`;
    const previous = await c.env.DB.prepare('SELECT * FROM agency_term_templates WHERE agency_id = ?')
      .bind(user.agency_id).first<TermRecord>();
    await storage.put(key, bytes);
    try {
      await c.env.DB.prepare(`INSERT INTO agency_term_templates (agency_id, enabled, object_key, filename, size)
        VALUES (?, false, ?, ?, ?) ON CONFLICT (agency_id) DO UPDATE SET
        object_key = excluded.object_key, filename = excluded.filename, size = excluded.size, updated_at = CURRENT_TIMESTAMP`)
        .bind(user.agency_id, key, file.name.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'termo.pdf', bytes.length).run();
    } catch (error) {
      await storage.delete(key).catch(() => {});
      throw error;
    }
    // Delete only the superseded object. New keys are immutable and random.
    if (previous) await storage.delete(previous.object_key).catch(() => {});
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
      await validateTermPdf(await getTermStorage(c.env).get(row.object_key));
    } catch {
      return c.json({ error: 'Não foi possível validar o PDF salvo. Confira o armazenamento ou substitua o arquivo.' }, 503);
    }
  }
  const updated = await c.env.DB.prepare(`UPDATE agency_term_templates SET enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE agency_id = ? AND object_key = ? RETURNING *`).bind(enabled, user.agency_id, row.object_key).first<TermRecord>();
  if (!updated) return c.json({ error: 'O modelo mudou. Atualize e tente novamente.' }, 409);
  return c.json(settings(updated));
});
