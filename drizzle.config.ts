import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
