import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Managed Cloud SQL Configuration (Region: asia-southeast1, Owner: Danish Khan <khandanish0503@gmail.com>)
export const CLOUD_SQL_CONFIG = {
  region: 'asia-southeast1',
  adminOwnerName: 'Danish Khan',
  adminOwnerEmail: 'khandanish0503@gmail.com',
  sslEnabled: true,
} as const;

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST || '';
    // TCP hosts use explicit TLS/SSL; Cloud SQL Auth Proxy Unix sockets (/cloudsql/...) encrypt traffic via the managed proxy
    const sslConfig = host.startsWith('/')
      ? false
      : { rejectUnauthorized: false };

    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      ssl: sslConfig,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const postgresConfigured = Boolean(
  process.env.SQL_HOST?.trim() &&
    process.env.SQL_USER?.trim() &&
    process.env.SQL_DB_NAME?.trim()
);

const pool = createPool();

export const db = drizzle(pool, { schema });
