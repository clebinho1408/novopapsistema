import type { VercelRequest, VercelResponse } from '@vercel/node';

// Importação dinâmica para evitar problemas de módulo no cold start
let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = import('../src/server/app').then(m => m.app);
  }
  return appPromise;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verificar env vars obrigatórias
    if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
      console.error('❌ NEON_DATABASE_URL não está definida nas variáveis de ambiente da Vercel!');
      res.status(500).json({ 
        error: 'Configuração do servidor incompleta: variável NEON_DATABASE_URL não encontrada.' 
      });
      return;
    }

    const app = await getApp();

    // Montar URL completa
    const host = (req.headers.host as string) || 'localhost';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const url = `${protocol}://${host}${req.url}`;

    // Ler body como Buffer
    const bodyChunks: Buffer[] = [];
    for await (const chunk of req as any) {
      bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const bodyBuffer = Buffer.concat(bodyChunks);

    // Montar headers Web-API
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value as string);
      }
    }

    // Criar Web Request
    const request = new Request(url, {
      method: req.method || 'GET',
      headers,
      body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : bodyBuffer,
    });

    // Chamar Hono
    const response = await app.fetch(request);

    // Status
    res.status(response.status);

    // Headers (incluindo Set-Cookie múltiplos)
    const setCookies: string[] = [];
    response.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookies.push(value);
      } else {
        res.setHeader(key, value);
      }
    });
    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }

    // Body
    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));

  } catch (err: any) {
    console.error('❌ Erro no handler Vercel:', err?.message, err?.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      detail: err?.message || 'Erro desconhecido' 
    });
  }
}
