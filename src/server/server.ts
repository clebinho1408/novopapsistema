import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { db } from "./db";

// Import worker app (we'll need to modify it to export the app)
// For now, create a simple proxy that injects PostgreSQL

const PORT = parseInt(process.env.PORT || "3000");

console.log("🔧 Initializing Node.js server with PostgreSQL...");

// Create and start server
// We'll need to refactor worker/index.ts to be database-agnostic
// For now, let's create a minimal test server

const app = new Hono();

app.use("*", async (c, next) => {
  // Inject PostgreSQL database into context
  c.env = { DB: db } as any;
  await next();
});

app.get("/api/health", async (c) => {
  try {
    await db.prepare("SELECT 1").first();
    return c.json({ status: "healthy", database: "postgresql" });
  } catch (error) {
    return c.json({ status: "unhealthy", error: String(error) }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`✅ Server running on http://localhost:${info.port}`);
  console.log(`📊 Database: PostgreSQL (${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'configured'})`);
});

export default app;
