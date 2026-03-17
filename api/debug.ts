import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const steps: string[] = [];
  try {
    steps.push('1. Iniciando debug...');
    
    // Teste 1: importar postgres diretamente
    steps.push('2. Importando postgres...');
    const postgres = (await import('postgres')).default;
    steps.push('3. postgres importado OK');

    const url = process.env.NEON_DATABASE_URL!;
    steps.push('4. Criando conexão...');
    
    const sql = postgres(url, { 
      max: 1, 
      connect_timeout: 10,
      prepare: false,
    });
    steps.push('5. Conexão criada');

    // Teste 2: query simples
    steps.push('6. Executando query...');
    const result = await sql`SELECT u.id, u.name, u.email, u.role FROM system_users u LIMIT 1`;
    steps.push(`7. Query OK — encontrou ${result.length} usuário(s)`);
    
    await sql.end();
    steps.push('8. Conexão encerrada');

    // Teste 3: importar o app Hono
    steps.push('9. Importando app Hono...');
    const { app } = await import('../src/server/app');
    steps.push('10. App Hono importado OK');

    res.status(200).json({ 
      ok: true, 
      steps,
      users_found: result.length,
      sample_user: result[0] ? { id: result[0].id, role: result[0].role } : null
    });
  } catch (err: any) {
    res.status(500).json({ 
      ok: false, 
      steps,
      error: err?.message,
      stack: err?.stack?.split('\n').slice(0, 5),
    });
  }
}
