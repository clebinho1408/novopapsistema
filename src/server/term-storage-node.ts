import type { TermFileStorage } from './term-storage';

// In-memory store fallback when Replit Object Storage is not configured
const memoryFiles = new Map<string, Uint8Array>();

export function createNodeTermStorage(): TermFileStorage {
  if (!process.env.TERM_STORAGE_BUCKET && !process.env.REPLIT_DEPLOYMENT) {
    return {
      async put(key, bytes) {
        memoryFiles.set(key, new Uint8Array(bytes));
      },
      async get(key) {
        const file = memoryFiles.get(key);
        if (!file) throw new Error('PDF do termo não encontrado.');
        return file;
      },
      async delete(key) {
        memoryFiles.delete(key);
      },
    };
  }

  let client: {
    uploadFromBytes: (k: string, b: Buffer, opts: { compress: boolean }) => Promise<{ ok: boolean }>;
    downloadAsBytes: (k: string) => Promise<{ ok: boolean; value: [Uint8Array] }>;
    delete: (k: string, opts: { ignoreNotFound: boolean }) => Promise<{ ok: boolean }>;
  } | undefined;

  async function storage() {
    if (!client) {
      const { Client } = await import('@replit/object-storage');
      client = new Client(process.env.TERM_STORAGE_BUCKET ? { bucketId: process.env.TERM_STORAGE_BUCKET } : undefined) as unknown as typeof client;
    }
    return client!;
  }

  return {
    async put(key, bytes) {
      const result = await (await storage()).uploadFromBytes(key, Buffer.from(bytes), { compress: false });
      if (!result.ok) throw new Error('Não foi possível salvar o PDF no App Storage.');
    },
    async get(key) {
      const result = await (await storage()).downloadAsBytes(key);
      if (!result.ok) throw new Error('Não foi possível carregar o PDF do App Storage.');
      return new Uint8Array(result.value[0]);
    },
    async delete(key) {
      const result = await (await storage()).delete(key, { ignoreNotFound: true });
      if (!result.ok) throw new Error('Não foi possível remover o PDF antigo.');
    },
  };
}
