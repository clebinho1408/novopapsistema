import http from 'node:http';
import { getRequestListener, serve } from '@hono/node-server';
import { app } from './app';
import { d1Adapter } from './d1-adapter';
import { createNodeTermStorage } from './term-storage-node';

// AI Studio container sets CONTROL_PLANE_PORT/DEFAULT_APP_PORT and reserves PORT=8080 for nginx (app must bind 3000).
// External hosts like Shard Cloud expect production web apps to listen on 0.0.0.0:80 (or process.env.PORT).
const isAiStudioContainer = Boolean(
  process.env.CONTROL_PLANE_PORT || process.env.DEFAULT_APP_PORT
);

const PORT = process.env.APP_PORT
  ? parseInt(process.env.APP_PORT, 10)
  : isAiStudioContainer
    ? parseInt(process.env.DEFAULT_APP_PORT || '3000', 10)
    : process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : process.env.NODE_ENV === 'development'
        ? 3000
        : 80;
const HOST = '0.0.0.0';
const termFiles = createNodeTermStorage();

const bindings = { DB: d1Adapter, TERM_FILES: termFiles };

console.log(`🚀 Starting PAP - Sistema server on http://${HOST}:${PORT}...`);
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

if (process.env.NODE_ENV === 'production') {
  const { serveStatic } = await import('@hono/node-server/serve-static');
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));

  serve(
    {
      fetch: (request: Request) => app.fetch(request, bindings as never),
      port: PORT,
      hostname: HOST,
    },
    (info) => {
      console.log(`✅ Production server running at http://${HOST}:${info.port}`);
    }
  );
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'spa',
  });

  const honoListener = getRequestListener((request: Request) =>
    app.fetch(request, bindings as never)
  );

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url.startsWith('/api/') || url === '/api' || url === '/health') {
      return honoListener(req, res);
    }
    return vite.middlewares(req, res);
  });

  server.listen(PORT, HOST, () => {
    console.log(`✅ Dev server running at http://${HOST}:${PORT}`);
  });
}
