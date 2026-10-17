import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';

export async function runMigrations(conn, migrationsFolder = path.resolve(process.cwd(), 'drizzle')) {
  const migrate = conn.kind === 'pglite' ? migratePglite : migratePg;
  await migrate(conn.db, { migrationsFolder });
}
