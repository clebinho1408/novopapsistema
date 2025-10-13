import { Pool, PoolClient, QueryResult } from 'pg';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// D1-like interface adapter for PostgreSQL
export class PostgresAdapter {
  private client: Pool | PoolClient;

  constructor(client?: PoolClient) {
    this.client = client || pool;
  }

  // Prepare a SQL statement (returns a query builder)
  prepare(sql: string) {
    return new PostgresQuery(sql, this.client);
  }

  // Execute a raw SQL query
  async exec(sql: string): Promise<QueryResult> {
    return this.client.query(sql);
  }

  // Get a transaction client
  async transaction<T>(callback: (db: PostgresAdapter) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter = new PostgresAdapter(client);
      const result = await callback(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Query builder that mimics D1's prepare().bind() pattern
class PostgresQuery {
  private sql: string;
  private params: any[] = [];
  private client: Pool | PoolClient;

  constructor(sql: string, client: Pool | PoolClient) {
    this.sql = sql;
    this.client = client;
  }

  // Bind parameters (D1-style with ?)
  bind(...params: any[]) {
    this.params = params;
    return this;
  }

  // Execute and return first row (D1-style .first())
  async first<T = any>(): Promise<T | null> {
    const pgSql = this.convertToPgSql(this.sql);
    const result = await this.client.query(pgSql, this.params);
    return result.rows[0] || null;
  }

  // Execute and return all rows (D1-style .all())
  async all<T = any>(): Promise<{ results: T[] }> {
    const pgSql = this.convertToPgSql(this.sql);
    const result = await this.client.query(pgSql, this.params);
    return { results: result.rows };
  }

  // Execute without returning results (D1-style .run())
  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    const pgSql = this.convertToPgSql(this.sql);
    const result = await this.client.query(pgSql, this.params);
    return {
      success: true,
      meta: { changes: result.rowCount || 0 }
    };
  }

  // Convert D1-style SQL (with ?) to PostgreSQL-style (with $1, $2, etc.)
  private convertToPgSql(sql: string): string {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }
}

// Export the default database instance
export const db = new PostgresAdapter();

// Export pool for direct access if needed
export { pool };
