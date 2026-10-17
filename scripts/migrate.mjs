// Uso: npm run db:migrate
import { mkdirSync } from 'node:fs';
import { createDb } from '../lib/db/index.js';
import { runMigrations } from '../lib/db/migrate.js';

const url = process.env.DATABASE_URL;
if (url?.startsWith('pglite:') && url !== 'pglite:memory') mkdirSync(url.slice('pglite:'.length), { recursive: true });
const conn = createDb(url);
await runMigrations(conn);
await conn.client.end?.();
await conn.client.close?.();
console.log('Banco atualizado.');
