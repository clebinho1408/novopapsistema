import { serve } from '@hono/node-server';
import { app } from './app';

const port = 3000;

console.log(`🚀 Starting Hono Node.js server on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});

console.log(`✅ Server running at http://localhost:${port}`);
