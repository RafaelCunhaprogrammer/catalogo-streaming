// Só para os testes de ponta a ponta: cria uma conta cujo teste grátis já acabou.
// Roda antes do servidor subir (o banco PGlite fica preso ao servidor depois disso).
import { eq } from 'drizzle-orm';
import { createDb } from '../../lib/db/index.js';
import { createAuth } from '../../lib/auth/create-auth.js';
import { createProfile, PROFILE_COLORS } from '../../lib/profiles.js';
import { subscriptions, user } from '../../lib/db/schema.js';

export const EXPIRED_EMAIL = 'expirado@teste.local';
export const EXPIRED_PASSWORD = 'senha-expirado-1';

const conn = createDb(process.env.DATABASE_URL);
const auth = createAuth({
  db: conn.db,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  sendResetEmail: async () => {},
  rateLimit: false,
  withNextCookies: false,
});
let [existing] = await conn.db.select().from(user).where(eq(user.email, EXPIRED_EMAIL));
if (!existing) {
  const created = await auth.api.signUpEmail({ body: { name: 'Expirado', email: EXPIRED_EMAIL, password: EXPIRED_PASSWORD } });
  existing = created.user;
}
await createProfile(conn.db, existing.id, { name: 'Ex', color: PROFILE_COLORS[0], kind: 'adulto', avatar: 'acai' });
const past = new Date(Date.now() - 60 * 60 * 1000);
await conn.db.insert(subscriptions)
  .values({ userId: existing.id, status: 'teste', trialEndsAt: past, updatedAt: new Date() })
  .onConflictDoUpdate({ target: subscriptions.userId, set: { status: 'teste', plan: null, periodEnd: null, trialEndsAt: past } });
await conn.client.end?.();
await conn.client.close?.();
console.log(`Conta com teste expirado pronta: ${EXPIRED_EMAIL}`);
