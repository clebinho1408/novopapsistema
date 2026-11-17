import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;
let _mockWarned = false;

const mockClient = Object.assign(
  async () => [],
  { unsafe: async () => [] }
) as unknown as ReturnType<typeof postgres>;

const noOpQuery = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: { data?: unknown }) => d?.data ?? {},
  update: async (d: { data?: unknown }) => d?.data ?? {},
  delete: async () => ({}),
};

const mockDb = new Proxy({}, {
  get: (_target, prop) => (prop === 'query' ? new Proxy({}, { get: () => noOpQuery }) : async () => []),
}) as unknown as ReturnType<typeof drizzle>;

function initClient() {
  if (_client) return _client;

  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    if (!_mockWarned) {
      _mockWarned = true;
      console.warn('[AI Studio] DATABASE_URL/NEON_DATABASE_URL not set — using in-memory database');
    }
    return mockClient;
  }

  try {
    console.log('🔌 Connecting to database:', connectionString.includes('neon') ? 'Neon (external)' : 'PostgreSQL');
    _client = postgres(connectionString, {
      prepare: false,
      max: 10,
      idle_timeout: 60,
      connect_timeout: 30,
      max_lifetime: 60 * 30,
      onnotice: () => {},
    });
    return _client;
  } catch (error) {
    console.warn('[AI Studio] Database connection failed — using mock:', error);
    return mockClient;
  }
}

function initDb() {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    return mockDb;
  }
  try {
    _db = drizzle(initClient(), { schema });
    return _db;
  } catch (error) {
    console.warn('[AI Studio] Drizzle not connected — using mock:', error);
    return mockDb;
  }
}

export const client = new Proxy((() => {}) as unknown as ReturnType<typeof postgres>, {
  get(_target, prop) {
    const c = initClient();
    return (c as unknown as Record<string | symbol, unknown>)[prop];
  },
  apply(_target, _thisArg, args) {
    const c = initClient();
    return (c as unknown as (...a: unknown[]) => unknown)(...args);
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const d = initDb();
    return (d as unknown as Record<string | symbol, unknown>)[prop];
  }
});

export * from '../shared/schema';
