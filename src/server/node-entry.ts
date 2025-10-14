import { serve } from '@hono/node-server';
import { app } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.NODE_ENV === 'production' ? 5000 : 3000);

console.log(`🚀 Starting Hono Node.js server on port ${PORT}...`);
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✅ Server running at http://localhost:${PORT}`);
