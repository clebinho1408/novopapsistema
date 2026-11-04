// Node uses the Replit SDK adapter; Cloudflare uses a private R2 binding.
export interface TermFileStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export interface TermStorageEnv {
  TERM_FILES?: TermFileStorage;
  TERM_PDFS?: R2Bucket;
}

export class TermStorageNotConfiguredError extends Error {
  constructor() {
    super('Armazenamento do termo não configurado. No Cloudflare, vincule o bucket R2 privado como TERM_PDFS e publique novamente.');
  }
}

export function getTermStorage(env: TermStorageEnv): TermFileStorage {
  if (env.TERM_FILES) return env.TERM_FILES;
  if (!env.TERM_PDFS) throw new TermStorageNotConfiguredError();
  const bucket = env.TERM_PDFS;
  return {
    async put(key, bytes) {
      const result = await bucket.put(key, bytes, {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
      });
      if (!result) throw new Error('O arquivo do termo já existe. Tente novamente.');
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) throw new Error('PDF do termo não encontrado no armazenamento.');
      return new Uint8Array(await object.arrayBuffer());
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
