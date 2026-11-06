import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

// Com certificado (Supabase), o servidor é conferido por ele. O sslmode sai do endereço porque,
// no pg, o que vem no endereço substitui a opção ssl.
export function pgConfig(url, ca) {
  if (!ca) return { connectionString: url, max: 5 };
  const address = new URL(url);
  address.searchParams.delete('sslmode');
  return { connectionString: address.href, max: 5, ssl: { ca: ca.replace(/\\n/g, '\n') } };
}

// 'pglite:memory' ou 'pglite:<pasta>' → PostgreSQL em processo (dev e testes); outro endereço → Supabase/PostgreSQL.
export function createDb(url) {
  if (!url) throw new Error('Defina DATABASE_URL em .env.local');
  if (url.startsWith('pglite:')) {
    const where = url.slice('pglite:'.length);
    const client = where === 'memory' ? new PGlite() : new PGlite(where);
    return { db: drizzlePglite(client, { schema }), client, kind: 'pglite' };
  }
  const client = new pg.Pool(pgConfig(url, process.env.DATABASE_CA_CERT));
  return { db: drizzlePg(client, { schema }), client, kind: 'pg' };
}

// Uma conexão por processo; guardada em globalThis para sobreviver ao recarregamento do `npm run dev`.
export function getDb() {
  if (!globalThis.__paideguaDb) globalThis.__paideguaDb = createDb(process.env.DATABASE_URL);
  return globalThis.__paideguaDb.db;
}
