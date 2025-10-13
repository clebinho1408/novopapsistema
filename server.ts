import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { db } from "./src/server/db";
import {
  CreateCityRequestSchema,
  CreateProfessionalRequestSchema,
} from "./src/shared/types";

// Define environment interface  
interface Env {
  DB: typeof db;
  R2_BUCKET: null;
}

// Create Hono app with PostgreSQL database
const app = new Hono<{ Bindings: Env }>();

// Inject PostgreSQL database into context
app.use("*", async (c, next) => {
  (c.env as any) = {
    DB: db,
    R2_BUCKET: null, // Stub for R2 - not needed for now
  };
  await next();
});

// CORS configuration  
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

// Helper functions
function generateSessionToken() {
  return Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('');
}

async function systemAuthMiddleware(c: any, next: any) {
  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    return c.json({ error: "No session token" }, 401);
  }

  // PostgreSQL uses NOW() instead of datetime('now')
  const session = await c.env.DB.prepare(
    "SELECT s.*, u.*, a.name as agency_name FROM user_sessions s JOIN system_users u ON s.user_id = u.id JOIN agencies a ON u.agency_id = a.id WHERE s.session_token = ? AND s.expires_at > NOW() AND u.is_active = true"
  ).bind(sessionToken).first();

  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  c.set("user", session as any);
  await next();
}

function getUserWithAgency(c: any) {
  const user = c.get("user") as any;
  return user || null;
}

// Import all routes from worker/index.ts
// For now, manually copy the essential routes

// Health check
app.get("/api/health", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
    return c.json({ status: "healthy", database: "postgresql" });
  } catch (error) {
    return c.json({ status: "unhealthy", error: String(error) }, 500);
  }
});

// TODO: Import all other routes from worker/index.ts
// This is a minimal server to test PostgreSQL connection
// Next step: copy all routes or refactor worker to export createApp()

const PORT = parseInt(process.env.PORT || "3000");

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`✅ Server running on http://localhost:${info.port}`);
  console.log(`📊 Database: PostgreSQL`);
});

export default app;
