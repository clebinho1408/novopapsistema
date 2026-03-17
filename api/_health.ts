import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const neonUrl = process.env.NEON_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  
  const dbStatus = neonUrl || dbUrl 
    ? `✅ Configurada (${neonUrl ? 'NEON_DATABASE_URL' : 'DATABASE_URL'})` 
    : '❌ NÃO configurada!';

  // Testar conexão real com o banco
  let dbConnection = '⏳ Testando...';
  try {
    if (neonUrl || dbUrl) {
      const postgres = (await import('postgres')).default;
      const sql = postgres((neonUrl || dbUrl)!, { max: 1, connect_timeout: 5 });
      await sql`SELECT 1 as ok`;
      await sql.end();
      dbConnection = '✅ Conexão com banco OK!';
    } else {
      dbConnection = '❌ Sem URL de banco configurada';
    }
  } catch (err: any) {
    dbConnection = `❌ Erro de conexão: ${err?.message}`;
  }

  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      database_url: dbStatus,
    },
    database_connection: dbConnection,
  });
}
