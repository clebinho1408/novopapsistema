/**
 * D1 Adapter for PostgreSQL
 * Simulates Cloudflare D1 API using PostgreSQL
 * This allows existing D1 code to work with PostgreSQL with minimal changes
 */
import { client } from './storage';
import { inMemoryD1Adapter } from './in-memory-db';

interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<any>;
}

let pgEverSucceeded = false;
let useInMemoryFallback = false;

function isPgUnavailableError(error: any): boolean {
  const code = error?.code;
  const msg = String(error?.message || '');
  return (
    code === '28P01' ||
    code === '28000' ||
    code === '3D000' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'CONNECT_TIMEOUT' ||
    msg.includes('password authentication failed')
  );
}

class PostgresD1PreparedStatement implements D1PreparedStatement {
  private rawSql: string;
  private sql: string;
  private params: any[];

  constructor(sql: string) {
    this.rawSql = sql;
    // Convert SQLite syntax to PostgreSQL
    this.sql = this.convertSQLiteToPostgres(sql);
    this.params = [];
  }

  private convertSQLiteToPostgres(sql: string): string {
    sql = sql.replace(/AUTOINCREMENT/gi, '');
    sql = sql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

    let paramIndex = 1;
    sql = sql.replace(/\?/g, () => `$${paramIndex++}`);

    return sql;
  }

  bind(...params: any[]): D1PreparedStatement {
    this.params = params;
    return this;
  }

  async first<T = any>(): Promise<T | null> {
    if (useInMemoryFallback) {
      return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).first<T>();
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await client.unsafe(this.sql, this.params);
        pgEverSucceeded = true;
        return (result[0] as T) || null;
      } catch (error: any) {
        lastError = error;
        console.error(`D1 Adapter Error (first) - Attempt ${attempt}/${maxRetries}:`, error);

        if (!pgEverSucceeded && isPgUnavailableError(error)) {
          console.warn(`[AI Studio] Postgres unavailable (${error.code || 'error'}) — falling back to in-memory database`);
          useInMemoryFallback = true;
          return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).first<T>();
        }

        if ((error.code === 'CONNECT_TIMEOUT' || error.code === 'XX000') && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    if (useInMemoryFallback) {
      return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).all<T>();
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const results = await client.unsafe(this.sql, this.params);
        pgEverSucceeded = true;
        return { results: results as unknown as T[] };
      } catch (error: any) {
        lastError = error;
        console.error(`D1 Adapter Error (all) - Attempt ${attempt}/${maxRetries}:`, error);

        if (!pgEverSucceeded && isPgUnavailableError(error)) {
          console.warn(`[AI Studio] Postgres unavailable (${error.code || 'error'}) — falling back to in-memory database`);
          useInMemoryFallback = true;
          return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).all<T>();
        }

        if ((error.code === 'CONNECT_TIMEOUT' || error.code === 'XX000') && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async run(): Promise<any> {
    if (useInMemoryFallback) {
      return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).run();
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await client.unsafe(this.sql, this.params);
        pgEverSucceeded = true;
        return { success: true };
      } catch (error: any) {
        lastError = error;
        console.error(`D1 Adapter Error (run) - Attempt ${attempt}/${maxRetries}:`, error);

        if (!pgEverSucceeded && isPgUnavailableError(error)) {
          console.warn(`[AI Studio] Postgres unavailable (${error.code || 'error'}) — falling back to in-memory database`);
          useInMemoryFallback = true;
          return inMemoryD1Adapter.prepare(this.rawSql).bind(...this.params).run();
        }

        if ((error.code === 'CONNECT_TIMEOUT' || error.code === 'XX000') && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }
}

export class PostgresD1Database {
  prepare(sql: string): D1PreparedStatement {
    if ((!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) || useInMemoryFallback) {
      return inMemoryD1Adapter.prepare(sql);
    }
    return new PostgresD1PreparedStatement(sql);
  }
}

// Export singleton instance
export const d1Adapter = new PostgresD1Database();
