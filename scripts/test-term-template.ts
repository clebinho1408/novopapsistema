import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { Miniflare } from 'miniflare';
import { app } from '../src/server/app';
import { validateTermPdf } from '../src/server/term-template';
import { getTermStorage, TermStorageNotConfiguredError, type TermStorageEnv } from '../src/server/term-storage';
import { TERM_TEMPLATE_SERVICES, serviceUsesTermTemplate } from '../src/shared/term-template';

// Real SQLite statements and production authentication middleware; test-only
// database/storage fixtures never change application auth or a real agency.
const directory = mkdtempSync(join(tmpdir(), 'term-tests-'));
const database = join(directory, 'data.sqlite');
const python = `import sqlite3,json,sys
db=sqlite3.connect(sys.argv[1])
db.row_factory=sqlite3.Row
data=json.loads(sys.stdin.read())
cur=db.execute(data['sql'],data.get('params',[]))
rows=[dict(x) for x in cur.fetchall()] if cur.description else []
db.commit()
print(json.dumps(rows))`;
function sql(query: string, params: unknown[] = []) {
  return JSON.parse(execFileSync('python3', ['-c', python, database], {
    input: JSON.stringify({ sql: query, params }), encoding: 'utf8',
  }));
}
const DB = {
  prepare(query: string) {
    let params: unknown[] = [];
    return {
      bind(...values: unknown[]) { params = values; return this; },
      async first() { return sql(query, params)[0] ?? null; },
      async all() { return { results: sql(query, params) }; },
      async run() {
        if (failMetadataSave && query.includes('INSERT INTO agency_term_templates')) throw new Error('fixture DB failure');
        sql(query, params);
        return { success: true };
      },
    };
  },
};
const objects = new Map<string, Uint8Array>();
let failUpload = false;
let failDownload = false;
let failMetadataSave = false;
let r2Runtime: Miniflare | undefined;
const TERM_FILES = {
  async put(key: string, bytes: Uint8Array) {
    if (failUpload) throw new Error('fixture unavailable');
    objects.set(key, bytes.slice());
  },
  async get(key: string) {
    if (failDownload || !objects.has(key)) throw new Error('fixture unavailable');
    return objects.get(key)!;
  },
  async delete(key: string) { objects.delete(key); },
};
let storageEnv: TermStorageEnv = { TERM_FILES };
async function request(path = '', method = 'GET', session?: string, body?: BodyInit, headers: Record<string, string> = {}) {
  const response = await app.request(`http://example.test/api/term-template${path}`, {
    method, headers: { ...headers, ...(session ? { Cookie: `session_token=${session}` } : {}) }, body,
  }, { DB, ...storageEnv } as any);
  return response;
}
async function upload(bytes: Uint8Array, session = 'admin', filename = 'termo.pdf') {
  const form = new FormData();
  form.set('file', new File([bytes], filename, { type: 'application/pdf' }));
  return request('', 'POST', session, form);
}
async function toggle(enabled: boolean, session = 'admin') {
  return request('', 'PATCH', session, JSON.stringify({ enabled }), { 'Content-Type': 'application/json' });
}
async function pdf(pages: number) {
  const document = await PDFDocument.create();
  for (let i = 0; i < pages; i++) document.addPage([595.28, 841.89]);
  return document.save();
}

try {
  sql('CREATE TABLE agencies (id INTEGER PRIMARY KEY, name TEXT)');
  sql('CREATE TABLE system_users (id INTEGER PRIMARY KEY, agency_id INTEGER, role TEXT, is_active BOOLEAN)');
  sql('CREATE TABLE user_sessions (user_id INTEGER, session_token TEXT, expires_at TIMESTAMP)');
  sql(readFileSync('migrations/25.sql', 'utf8'));
  sql("INSERT INTO agencies VALUES (1,'Agency one'), (2,'Agency two')");
  for (const [id, agency, role, session] of [
    [1, 1, 'administrator', 'admin'], [2, 1, 'supervisor', 'supervisor'],
    [3, 1, 'collaborator', 'collaborator'], [4, 2, 'administrator', 'other'],
  ]) {
    sql('INSERT INTO system_users VALUES (?,?,?,true)', [id, agency, role]);
    sql("INSERT INTO user_sessions VALUES (?,?,datetime('now','+1 day'))", [id, session]);
  }
  const one = await pdf(1);
  const two = await pdf(2);
  await validateTermPdf(one);
  for (const invalid of [two, new Uint8Array(), new TextEncoder().encode('%PDF-1.7\nbroken'), new TextEncoder().encode('Not a PDF'), new Uint8Array(5242881)]) {
    await assert.rejects(validateTermPdf(invalid));
  }
  // Encrypted PDF: pdf-lib must reject the encryption dictionary, not silently
  // load with ignoreEncryption. Fixture needs no real password.
  const encrypted = new TextEncoder().encode(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj
4 0 obj << /Filter /Standard /V 1 /R 2 /Length 40 >> endobj
trailer << /Root 1 0 R /Encrypt 4 0 R >>
%%EOF`);
  await assert.rejects(validateTermPdf(encrypted));
  assert.equal((await request()).status, 401);
  assert.equal((await request('/file')).status, 401);
  for (const role of ['supervisor', 'collaborator']) {
    assert.equal((await upload(one, role)).status, 403);
    assert.equal((await toggle(true, role)).status, 403);
  }
  const initial = await (await request('', 'GET', 'admin')).json() as any;
  assert.deepEqual(initial, { enabled: false, filename: null, size: null, updated_at: null, file_url: null });
  assert.equal((await toggle(true)).status, 400);
  const savedResponse = await upload(one);
  assert.equal(savedResponse.status, 200);
  const saved = await savedResponse.json() as any;
  assert.equal(saved.enabled, false);
  assert.equal(saved.filename, 'termo.pdf');
  assert.equal(objects.size, 1);
  assert.equal((await toggle(true)).status, 200);
  for (const invalid of [two, new Uint8Array(), new TextEncoder().encode('bad.pdf'), encrypted, new Uint8Array(5242881)]) {
    assert.equal((await upload(invalid)).status, 400);
    const current = await (await request('', 'GET', 'admin')).json() as any;
    assert.equal(current.enabled, true);
    assert.equal(current.file_url, saved.file_url);
    assert.equal(objects.size, 1);
  }
  failUpload = true;
  assert.equal((await upload(one)).status, 503);
  failUpload = false;
  assert.equal((await (await request('', 'GET', 'admin')).json() as any).file_url, saved.file_url);
  for (const session of ['admin', 'supervisor', 'collaborator']) {
    const response = await request('/file', 'GET', session);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), one);
  }
  assert.equal((await request('/file', 'GET', 'other')).status, 404);
  assert.equal((await (await request('', 'GET', 'other')).json() as any).filename, null);
  assert.equal((await toggle(false, 'other')).status, 400);
  assert.equal((await upload(one, 'other', 'outra.pdf')).status, 200);
  assert.equal((await (await request('', 'GET', 'admin')).json() as any).filename, 'termo.pdf');
  failDownload = true;
  assert.equal((await request('/file', 'GET', 'admin')).status, 503);
  assert.equal((await toggle(true)).status, 503);
  // Deactivation doesn't require working storage and retains the PDF.
  assert.equal((await toggle(false)).status, 200);
  failDownload = false;
  assert.equal((await toggle(true)).status, 200);
  const replacement = await (await upload(one, 'admin', 'novo.pdf')).json() as any;
  assert.equal(replacement.enabled, true);
  assert.notEqual(replacement.file_url, saved.file_url);
  assert.equal(objects.size, 2); // one current model per agency
  assert.equal((await request(saved.file_url.replace('/api/term-template', ''), 'GET', 'admin')).status, 404);
  const persisted = await (await request('', 'GET', 'admin')).json() as any;
  assert.deepEqual(persisted, replacement);
  for (const service of TERM_TEMPLATE_SERVICES) assert.equal(serviceUsesTermTemplate(service), true);
  for (const service of [undefined, '', 'Renovação', 'Renovação + EAR + PCD', '1º Habilitação ']) {
    assert.equal(serviceUsesTermTemplate(service), false);
  }
  console.log('PASS: single-page validation, malformed/encrypted/oversized rejection, real SQLite upsert, authentication, all roles, tenant isolation, preservation, replacement, toggles, persistence, storage errors and exact six services');

  // Use the actual local Cloudflare R2 runtime, not a hand-written bucket mock.
  sql('DELETE FROM agency_term_templates');
  r2Runtime = new Miniflare({
    modules: true, compatibilityDate: '2025-06-17',
    script: 'export default { fetch() { return new Response(null, { status: 404 }); } };',
    r2Buckets: ['TERM_PDFS'],
  });
  const bucket = await r2Runtime.getR2Bucket('TERM_PDFS');
  storageEnv = { TERM_PDFS: bucket as unknown as R2Bucket };
  const storage = getTermStorage(storageEnv);
  await storage.put('adapter-check.pdf', one);
  assert.deepEqual(await storage.get('adapter-check.pdf'), one);
  assert.equal((await bucket.head('adapter-check.pdf'))?.httpMetadata?.contentType, 'application/pdf');
  assert.equal((await bucket.head('adapter-check.pdf'))?.httpMetadata?.cacheControl, 'private, no-store');
  await assert.rejects(storage.put('adapter-check.pdf', two));
  assert.deepEqual(await storage.get('adapter-check.pdf'), one);
  await storage.delete('adapter-check.pdf');
  await assert.rejects(storage.get('adapter-check.pdf'));
  await storage.delete('adapter-check.pdf'); // missing objects are safe to delete
  assert.throws(() => getTermStorage({}), TermStorageNotConfiguredError);

  assert.equal((await upload(one)).status, 200);
  assert.equal((await toggle(true)).status, 200);
  const r2Saved = await (await request('', 'GET', 'admin')).json() as any;
  assert.equal(r2Saved.filename, 'termo.pdf');
  const key = sql('SELECT object_key FROM agency_term_templates WHERE agency_id = 1')[0].object_key;
  assert.ok(key.startsWith('private/agency-terms/1/'));
  assert.equal((await bucket.list()).objects.length, 1);
  assert.equal((await request('/file')).status, 401);
  assert.equal((await request('/file', 'GET', 'other')).status, 404);
  assert.equal((await upload(one, 'collaborator')).status, 403);
  const downloaded = await request('/file', 'GET', 'admin');
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), one);
  assert.equal((await upload(two)).status, 400);
  failMetadataSave = true;
  assert.equal((await upload(one, 'admin', 'rollback.pdf')).status, 503);
  failMetadataSave = false;
  assert.equal((await bucket.list()).objects.length, 1); // remove the uncommitted upload
  assert.deepEqual(await (await request('', 'GET', 'admin')).json(), r2Saved);
  storageEnv = {};
  const unconfigured = await upload(one);
  assert.equal(unconfigured.status, 503);
  assert.match((await unconfigured.json() as any).error, /TERM_PDFS/);
  assert.deepEqual(await (await request('', 'GET', 'admin')).json(), r2Saved);
  storageEnv = { TERM_PDFS: bucket as unknown as R2Bucket };
  const r2ReplacementResponse = await upload(one, 'admin', 'novo-r2.pdf');
  assert.equal(r2ReplacementResponse.status, 200);
  const r2Replacement = await r2ReplacementResponse.json() as any;
  assert.equal(r2Replacement.enabled, true);
  assert.equal(r2Replacement.filename, 'novo-r2.pdf');
  assert.notEqual(r2Replacement.file_url, r2Saved.file_url);
  assert.equal(await bucket.get(key), null);
  assert.equal((await bucket.list()).objects.length, 1);
  assert.deepEqual(await (await request('', 'GET', 'admin')).json(), r2Replacement);
  assert.equal((await toggle(false)).status, 200);
  assert.equal((await bucket.list()).objects.length, 1);
  console.log('PASS: actual local R2 runtime, PDF metadata, immutable writes, authenticated upload/read, agency isolation, persistence, replacement cleanup, rollback cleanup and missing-binding error');
} finally {
  await r2Runtime?.dispose();
  rmSync(directory, { recursive: true, force: true });
}
