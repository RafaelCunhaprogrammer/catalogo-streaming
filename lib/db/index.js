import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

// 'pglite:memory' ou 'pglite:<pasta>' → PostgreSQL em processo (dev e testes); outro endereço → Neon/PostgreSQL.
export function createDb(url) {
  if (!url) throw new Error('Defina DATABASE_URL em .env.local');
  if (url.startsWith('pglite:')) {
    const where = url.slice('pglite:'.length);
    const client = where === 'memory' ? new PGlite() : new PGlite(where);
    return { db: drizzlePglite(client, { schema }), client, kind: 'pglite' };
  }
  const client = new pg.Pool({ connectionString: url, max: 5 });
  return { db: drizzlePg(client, { schema }), client, kind: 'pg' };
}

// Uma conexão por processo; guardada em globalThis para sobreviver ao recarregamento do `npm run dev`.
export function getDb() {
  if (!globalThis.__paideguaDb) globalThis.__paideguaDb = createDb(process.env.DATABASE_URL);
  return globalThis.__paideguaDb.db;
}
