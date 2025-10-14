// Re-export the Hono app from server/app.ts
// This allows Cloudflare Workers preview to still work if needed
import { app } from '../server/app';

export default app;
