import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { db } from "./db";

// Environment type for Node.js server (not Cloudflare)
interface Env {
  DB: typeof db;
}

const app = new Hono<{ Bindings: Env }>();

// Inject PostgreSQL database into context
app.use("*", async (c, next) => {
  c.env = { DB: db } as any;
  await next();
});

app.use("*", cors({
  origin: (origin) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://localhost:5000",
    ];

    if (!origin) return allowedOrigins[0];

    const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
    if (replitDomain) {
      allowedOrigins.push(`https://${replitDomain}`);
      allowedOrigins.push(`http://${replitDomain}`);
    }

    if (allowedOrigins.includes(origin)) return origin;
    if (origin.includes('.replit.dev')) return origin;

    return allowedOrigins[0];
  },
  credentials: true,
}));

// Import all routes from worker
// Note: We'll need to refactor worker/index.ts to export routes separately
console.log("Server initialized with PostgreSQL database");

// Start server
const port = process.env.PORT || 3000;
serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`✅ Server running on http://localhost:${info.port}`);
});

export default app;
