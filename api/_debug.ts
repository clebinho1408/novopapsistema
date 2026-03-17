import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/server/app';   // import estático

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const steps: string[] = [];
  try {
    steps.push('1. app importado com import estático ✅');

    // Testar conexão direta com postgres
    steps.push('2. Testando conexão ao banco...');
    const postgres = (await import('postgres')).default;
    const sql = postgres(process.env.NEON_DATABASE_URL!, { max: 1, connect_timeout: 10, prepare: false });
    const result = await sql`SELECT u.id, u.role FROM system_users u LIMIT 1`;
    await sql.end();
    steps.push(`3. Banco OK — ${result.length} usuário(s) encontrado(s) ✅`);

    // Testar o app Hono diretamente
    steps.push('4. Testando app.fetch()...');
    const testReq = new Request('https://papsistema.vercel.app/api/public/agencies');
    const testRes = await app.fetch(testReq);
    const body = await testRes.text();
    steps.push(`5. app.fetch() OK — status ${testRes.status} ✅`);

    res.status(200).json({ ok: true, steps, agencies_sample: body.slice(0, 200) });
  } catch (err: any) {
    res.status(500).json({ ok: false, steps, error: err?.message, stack: err?.stack?.split('\n').slice(0, 6) });
  }
}
