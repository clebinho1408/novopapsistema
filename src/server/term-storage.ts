// Portable private App Storage access. Node injects the Replit SDK adapter;
// Cloudflare uses the same GCS bucket with a narrowly scoped service account.
export interface TermFileStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export interface TermStorageEnv {
  TERM_FILES?: TermFileStorage;
  TERM_STORAGE_BUCKET?: string;
  TERM_STORAGE_SERVICE_ACCOUNT?: string;
}

export function getTermStorage(env: TermStorageEnv): TermFileStorage {
  if (env.TERM_FILES) return env.TERM_FILES;
  if (!env.TERM_STORAGE_BUCKET || !env.TERM_STORAGE_SERVICE_ACCOUNT) {
    throw new Error('Armazenamento do termo não configurado. Configure o App Storage e o acesso deste servidor.');
  }
  return new GoogleTermStorage(env.TERM_STORAGE_BUCKET, env.TERM_STORAGE_SERVICE_ACCOUNT);
}

function base64url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

class GoogleTermStorage implements TermFileStorage {
  private token?: string;
  constructor(private bucket: string, private credentials: string) {}

  private async authorization(): Promise<string> {
    if (this.token) return `Bearer ${this.token}`;
    const account = JSON.parse(this.credentials);
    const encoder = new TextEncoder();
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const claims = base64url(encoder.encode(JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.read_write',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600,
    })));
    const raw = atob(account.private_key.replace(/-----[^-]+-----|\s/g, ''));
    const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(raw, c => c.charCodeAt(0)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(`${header}.${claims}`));
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${base64url(new Uint8Array(signature))}`,
      }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('Não foi possível autenticar o armazenamento do termo.');
    const result = await response.json() as { access_token?: string };
    if (!result.access_token) throw new Error('Armazenamento sem autorização.');
    this.token = result.access_token;
    return `Bearer ${this.token}`;
  }

  private url(key: string): string {
    return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucket)}/o/${encodeURIComponent(key)}`;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const response = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucket)}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { Authorization: await this.authorization(), 'Content-Type': 'application/pdf' },
        body: bytes as BodyInit, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Não foi possível salvar o PDF no App Storage.');
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await fetch(`${this.url(key)}?alt=media`, {
      headers: { Authorization: await this.authorization() }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Não foi possível carregar o PDF do termo.');
    return new Uint8Array(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(this.url(key), {
      method: 'DELETE', headers: { Authorization: await this.authorization() }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok && response.status !== 404) throw new Error('Falha ao remover arquivo antigo do termo.');
  }
}
