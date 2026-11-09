import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';

// Na Vercel, as prévias (preview/development) usam o mesmo DATABASE_URL da produção: migrar no build
// de uma prévia mudaria o banco de produção antes da revisão. Só o build de produção migra.
export const shouldMigrate = (env = process.env) => !env.VERCEL_ENV || env.VERCEL_ENV === 'production';

export async function runMigrations(conn, migrationsFolder = path.resolve(process.cwd(), 'drizzle')) {
  const migrate = conn.kind === 'pglite' ? migratePglite : migratePg;
  await migrate(conn.db, { migrationsFolder });
}
