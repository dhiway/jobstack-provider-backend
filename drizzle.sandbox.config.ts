import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  dbCredentials: {
    url: `postgres://${process.env.SANDBOX_POSTGRES_USER || 'sandbox_user'}:${process.env.SANDBOX_POSTGRES_PASSWORD || 'sandbox_password'}@127.0.0.1:${process.env.SANDBOX_DATABASE_PORT || '5433'}/${process.env.SANDBOX_POSTGRES_DB || 'jobstack_provider_sandbox'}`,
  },
});

