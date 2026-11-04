const assert = require('node:assert/strict');
const fs = require('node:fs');

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!entry.resolved) continue;
  const url = new URL(entry.resolved);
  assert.equal(url.protocol, 'https:', `Download sem HTTPS: ${name}`);
  assert.equal(url.hostname, 'registry.npmjs.org',
    `Dependência não portável para publicação externa: ${name}. Confira o lockfile após instalar pacotes.`);
}

const pages = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
assert.equal(pages.pages_build_output_dir, './dist');
assert.equal(pages.main, undefined, 'A entrada de Worker não deve ser usada pelo Pages');
assert.equal(pages.assets, undefined, 'A configuração de assets do Worker deve ficar no arquivo separado');
const worker = JSON.parse(fs.readFileSync('wrangler.worker.json', 'utf8'));
assert.equal(worker.main, 'src/worker-cf.ts');
assert.deepEqual(pages.d1_databases, worker.d1_databases, 'Conferir os vínculos do D1 ao alterar os ambientes');
assert.ok(fs.existsSync('functions/api/[[path]].ts'), 'Entrada da API Pages ausente');
console.log('PASS: lockfile público/HTTPS, configuração Pages, API e Worker separados com D1 preservado');
