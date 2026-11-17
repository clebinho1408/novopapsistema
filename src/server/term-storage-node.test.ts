import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createNodeTermStorage, resolveTermFilePath } from './term-storage-node';

test('createNodeTermStorage persists PDFs on disk across storage instances', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pap-term-storage-'));
  try {
    const key = 'private/agency-terms/1/sample.pdf';
    const sampleBytes = new TextEncoder().encode('%PDF-1.4\n%test\n');

    const writer = createNodeTermStorage(dir);
    await writer.put(key, sampleBytes);

    const reader = createNodeTermStorage(dir);
    const loaded = await reader.get(key);
    assert.deepEqual(Array.from(loaded), Array.from(sampleBytes));

    await reader.delete(key);
    await assert.rejects(() => reader.get(key), /PDF do termo não encontrado/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resolveTermFilePath blocks directory traversal keys', () => {
  assert.throws(
    () => resolveTermFilePath('/tmp/terms', '../../etc/passwd'),
    /Caminho do arquivo do termo inválido/
  );
});
