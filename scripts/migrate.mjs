// Uso: npm run db:migrate
import { mkdirSync } from 'node:fs';
import { createDb } from '../lib/db/index.js';
import { runMigrations, shouldMigrate } from '../lib/db/migrate.js';

if (!shouldMigrate()) {
  // Prévia da Vercel: o banco é o da produção, então as migrações esperam o build de produção.
  console.log(`Migrações puladas (VERCEL_ENV=${process.env.VERCEL_ENV}): só o build de produção migra.`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (url?.startsWith('pglite:') && url !== 'pglite:memory') mkdirSync(url.slice('pglite:'.length), { recursive: true });
const conn = createDb(url);
await runMigrations(conn);
await conn.client.end?.();
await conn.client.close?.();
console.log('Banco atualizado.');
