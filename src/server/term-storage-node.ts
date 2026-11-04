import { Client } from '@replit/object-storage';
import type { TermFileStorage } from './term-storage';

export function createNodeTermStorage(): TermFileStorage {
  // Do not initialize the SDK during startup: an unconfigured bucket must not
  // take the rest of the application down.
  let client: Client | undefined;
  function storage(): Client {
    return client ||= new Client(process.env.TERM_STORAGE_BUCKET ? { bucketId: process.env.TERM_STORAGE_BUCKET } : undefined);
  }
  return {
    async put(key, bytes) {
      const result = await storage().uploadFromBytes(key, Buffer.from(bytes), { compress: false });
      if (!result.ok) throw new Error('Não foi possível salvar o PDF no App Storage.');
    },
    async get(key) {
      const result = await storage().downloadAsBytes(key);
      if (!result.ok) throw new Error('Não foi possível carregar o PDF do App Storage.');
      return new Uint8Array(result.value[0]);
    },
    async delete(key) {
      const result = await storage().delete(key, { ignoreNotFound: true });
      if (!result.ok) throw new Error('Não foi possível remover o PDF antigo.');
    },
  };
}
