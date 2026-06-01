/**
 * D1 Adapter for Neon PostgreSQL (Cloudflare Workers compatible)
 * Uses @neondatabase/serverless which works via HTTP — no TCP needed.
 * Interface is identical to d1-adapter.ts so app.ts needs zero changes.
 */
import { neon } from '@neondatabase/serverless';

function convertSQLiteToPostgres(sql: string): string {
  sql = sql.replace(/AUTOINCREMENT/gi, '');
  sql = sql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  let paramIndex = 1;
  sql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return sql;
}

class NeonPreparedStatement {
  private sql: string;
  private params: any[] = [];
  private queryFn: any;

  constructor(sql: string, queryFn: any) {
    this.sql = convertSQLiteToPostgres(sql);
    this.queryFn = queryFn;
  }

  bind(...params: any[]) {
    this.params = params;
    return this;
  }

  async first<T = any>(): Promise<T | null> {
    const result = await this.queryFn(this.sql, this.params);
    return (result[0] as T) || null;
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    const result = await this.queryFn(this.sql, this.params);
    return { results: result as unknown as T[] };
  }

  async run(): Promise<any> {
    await this.queryFn(this.sql, this.params);
    return { success: true };
  }
}

export class NeonD1Database {
  private queryFn: any;

  constructor(connectionString: string) {
    this.queryFn = neon(connectionString);
  }

  prepare(sql: string) {
    return new NeonPreparedStatement(sql, this.queryFn);
  }
}
