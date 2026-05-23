import { serve } from '@hono/node-server';
import { app } from './app';
import { d1Adapter } from './d1-adapter';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.NODE_ENV === 'production' ? 5000 : 3000);

console.log(`🚀 Starting Hono Node.js server on port ${PORT}...`);
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

if (process.env.NODE_ENV === 'production') {
  const { serveStatic } = await import('@hono/node-server/serve-static');
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

serve({
  fetch: (request: Request) => app.fetch(request, { DB: d1Adapter } as any),
  port: PORT,
});

console.log(`✅ Server running at http://localhost:${PORT}`);
