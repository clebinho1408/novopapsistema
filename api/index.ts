import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/server/app.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Montar URL completa
  const host = req.headers.host || 'localhost';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const url = `${protocol}://${host}${req.url}`;

  // Ler body como Buffer
  const bodyChunks: Buffer[] = [];
  for await (const chunk of req as any) {
    bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const bodyBuffer = Buffer.concat(bodyChunks);

  // Montar headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Criar Web Request
  const request = new Request(url, {
    method: req.method || 'GET',
    headers,
    body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : bodyBuffer,
  });

  // Chamar o Hono app
  const response = await app.fetch(request);

  // Copiar status
  res.status(response.status);

  // Copiar headers (incluindo Set-Cookie)
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const existing = res.getHeader('set-cookie');
      if (existing) {
        res.setHeader('set-cookie', [...(Array.isArray(existing) ? existing : [existing as string]), value]);
      } else {
        res.setHeader('set-cookie', value);
      }
    } else {
      res.setHeader(key, value);
    }
  });

  // Enviar body
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}
