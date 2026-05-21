import postgres from 'postgres';
import { writeFileSync } from 'fs';

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('NEON_DATABASE_URL ou DATABASE_URL não definido');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: connectionString.includes('neon') || connectionString.includes('sslmode=require') ? 'require' : false,
  connect_timeout: 30,
});

const TABLES_ORDER = [
  'agencies',
  'system_users',
  'user_sessions',
  'cities',
  'professionals',
  'process_steps',
  'fees',
  'step_processes',
  'process_selected_steps',
  'process_selected_fees',
  'agency_instructions',
];

function escapeValue(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const lines: string[] = [];
  lines.push('-- Dados exportados do Neon PostgreSQL para D1 (SQLite)');
  lines.push('-- Gerado em: ' + new Date().toISOString());
  lines.push('');
  lines.push('PRAGMA foreign_keys = OFF;');
  lines.push('');

  for (const table of TABLES_ORDER) {
    try {
      const rows = await sql.unsafe(`SELECT * FROM ${table} ORDER BY id`);
      if (rows.length === 0) {
        console.log(`  ${table}: 0 linhas (vazio)`);
        continue;
      }
      const columns = Object.keys(rows[0]);
      lines.push(`-- ${table} (${rows.length} linhas)`);
      lines.push(`DELETE FROM ${table};`);
      for (const row of rows) {
        const values = columns.map(c => escapeValue((row as any)[c])).join(', ');
        lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});`);
      }
      lines.push('');
      console.log(`  ${table}: ${rows.length} linhas`);
    } catch (err: any) {
      console.error(`  ${table}: ERRO - ${err.message}`);
    }
  }

  lines.push('PRAGMA foreign_keys = ON;');

  writeFileSync('d1-data.sql', lines.join('\n'));
  console.log('\n✅ Arquivo d1-data.sql gerado com sucesso!');
  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
