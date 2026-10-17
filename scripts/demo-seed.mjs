// Uso: npm run demo:seed  (cria a conta de demonstração, se ainda não existir)
import { createDb } from '../lib/db/index.js';
import { createAuth } from '../lib/auth/create-auth.js';
import { ensureDemoAccount, DEMO_EMAIL } from '../lib/demo.js';

const conn = createDb(process.env.DATABASE_URL);
const auth = createAuth({
  db: conn.db,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  sendResetEmail: async () => {},
  rateLimit: false,
  withNextCookies: false,
});
await ensureDemoAccount(conn.db, auth, process.env.DEMO_PASSWORD || 'demo-paidegua-2026');
await conn.client.end?.();
await conn.client.close?.();
console.log(`Conta de demonstração pronta: ${DEMO_EMAIL}`);
