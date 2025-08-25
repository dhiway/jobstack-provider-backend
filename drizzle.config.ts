import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  dbCredentials: {
    url: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@127.0.0.1:${process.env.DATABASE_PORT}/${process.env.POSTGRES_DB}`,
  },
});
