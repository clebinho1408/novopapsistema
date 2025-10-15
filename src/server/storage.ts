import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function initClient() {
  if (_client) return _client;
  
  // Use only NEON_DATABASE_URL (external Neon database)
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }
  
  _client = postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 60,
    connect_timeout: 30,
    max_lifetime: 60 * 30,
    onnotice: () => {}, // Suppress notices
  });
  
  return _client;
}

function initDb() {
  if (_db) return _db;
  _db = drizzle(initClient(), { schema });
  return _db;
}

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    const c = initClient();
    return (c as any)[prop];
  },
  apply(_target, _thisArg, args) {
    const c = initClient();
    return (c as any)(...args);
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const d = initDb();
    return (d as any)[prop];
  }
});

export * from '../shared/schema';
