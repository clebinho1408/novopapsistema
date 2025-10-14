import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function initClient() {
  if (_client) return _client;
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  _client = postgres(connectionString, {
    prepare: false,
    max: 10,
  });
  
  return _client;
}

function initDb() {
  if (_db) return _db;
  _db = drizzle(initClient(), { schema });
  return _db;
}

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(target, prop) {
    const c = initClient();
    return (c as any)[prop];
  },
  apply(target, thisArg, args) {
    const c = initClient();
    return (c as any)(...args);
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const d = initDb();
    return (d as any)[prop];
  }
});

export * from '../shared/schema';
