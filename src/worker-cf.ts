/**
 * Cloudflare Workers entry point
 * - API requests (/api/*) → Hono app com D1 nativo (c.env.DB)
 * - Tudo mais → assets estáticos (com fallback SPA para index.html)
 */
import { app } from './server/app';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const indexUrl = new URL('/index.html', request.url).toString();
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
    return response;
  },
};
