// api/index.ts — Vercel serverless function (ESM bundle)
// Este arquivo é empacotado pelo esbuild durante o build:vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/server/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
      res.status(500).json({ error: 'NEON_DATABASE_URL não configurada nas env vars da Vercel.' });
      return;
    }

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

    // Chamar Hono app
    const response = await app.fetch(request);

    // Copiar status
    res.status(response.status);

    // Copiar headers (Set-Cookie múltiplos)
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

    // Enviar body
    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));

  } catch (err: any) {
    console.error('❌ Erro no handler Vercel:', err?.message, err?.stack);
    res.status(500).json({
      error: 'Erro interno do servidor',
      detail: err?.message || 'Erro desconhecido',
    });
  }
}
