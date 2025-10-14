/**
 * D1 Adapter for PostgreSQL
 * Simulates Cloudflare D1 API using PostgreSQL
 * This allows existing D1 code to work with PostgreSQL with minimal changes
 */
import { client } from './storage';

interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<any>;
}

class PostgresD1PreparedStatement implements D1PreparedStatement {
  private sql: string;
  private params: any[];

  constructor(sql: string) {
    // Convert SQLite syntax to PostgreSQL
    this.sql = this.convertSQLiteToPostgres(sql);
    this.params = [];
  }

  private convertSQLiteToPostgres(sql: string): string {
    // Convert AUTOINCREMENT to SERIAL (though we won't use this in INSERTs)
    sql = sql.replace(/AUTOINCREMENT/gi, '');
    
    // Convert datetime('now') to CURRENT_TIMESTAMP
    sql = sql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
    
    // Convert SQLite's || for string concatenation (PostgreSQL also uses ||)
    // No change needed
    
    // Convert BOOLEAN values: SQLite uses 1/0, PostgreSQL uses TRUE/FALSE
    // But in our case, the schema uses BOOLEAN already, so we'll handle this in bind()
    
    // Convert ? placeholders to $1, $2, etc.
    let paramIndex = 1;
    sql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    return sql;
  }

  bind(...params: any[]): D1PreparedStatement {
    // Just store parameters as-is - no conversion needed
    this.params = params;
    return this;
  }

  async first<T = any>(): Promise<T | null> {
    try {
      const result = await client.unsafe(this.sql, this.params);
      return (result[0] as T) || null;
    } catch (error) {
      console.error('D1 Adapter Error (first):', error);
      console.error('SQL:', this.sql);
      console.error('Params:', this.params);
      throw error;
    }
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    try {
      const results = await client.unsafe(this.sql, this.params);
      return { results: results as unknown as T[] };
    } catch (error) {
      console.error('D1 Adapter Error (all):', error);
      console.error('SQL:', this.sql);
      console.error('Params:', this.params);
      throw error;
    }
  }

  async run(): Promise<any> {
    try {
      await client.unsafe(this.sql, this.params);
      return { success: true };
    } catch (error) {
      console.error('D1 Adapter Error (run):', error);
      console.error('SQL:', this.sql);
      console.error('Params:', this.params);
      throw error;
    }
  }
}

export class PostgresD1Database {
  prepare(sql: string): D1PreparedStatement {
    return new PostgresD1PreparedStatement(sql);
  }
}

// Export singleton instance
export const d1Adapter = new PostgresD1Database();
