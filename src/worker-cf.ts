/**
 * Cloudflare Workers entry point
 * - API requests (/api/*) → Hono app with Neon D1 adapter
 * - Everything else → static assets (with SPA fallback to index.html)
 */
import { app } from './server/app';
import { NeonD1Database } from './server/d1-adapter-neon';

interface Env {
  NEON_DATABASE_URL: string;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const db = new NeonD1Database(env.NEON_DATABASE_URL);
      return app.fetch(request, { DB: db, ...env }, ctx);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const indexUrl = new URL('/index.html', request.url).toString();
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
    return response;
  },
};
