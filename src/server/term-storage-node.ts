import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TermFileStorage } from './term-storage';

export function resolveTermFilePath(baseDir: string, key: string): string {
  const normalizedKey = key.replace(/^\/+/, '');
  if (!normalizedKey || normalizedKey.includes('\0')) {
    throw new Error('Chave do arquivo do termo inválida.');
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, normalizedKey);
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error('Caminho do arquivo do termo inválido.');
  }
  return resolvedTarget;
}

export function createNodeTermStorage(customBaseDir?: string): TermFileStorage {
  if (!process.env.TERM_STORAGE_BUCKET && !process.env.REPLIT_DEPLOYMENT) {
    const baseDir = path.resolve(
      customBaseDir || process.env.TERM_STORAGE_DIR || path.join(process.cwd(), 'data', 'term-files')
    );

    return {
      async put(key, bytes) {
        const target = resolveTermFilePath(baseDir, key);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
      },
      async get(key) {
        const target = resolveTermFilePath(baseDir, key);
        try {
          const data = await readFile(target);
          return new Uint8Array(data);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            throw new Error('PDF do termo não encontrado.');
          }
          throw error;
        }
      },
      async delete(key) {
        const target = resolveTermFilePath(baseDir, key);
        try {
          await unlink(target);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw error;
          }
        }
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
