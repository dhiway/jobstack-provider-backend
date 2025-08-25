import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@127.0.0.1:${process.env.DATABASE_PORT}/${process.env.POSTGRES_DB}`,
  ssl: false,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
