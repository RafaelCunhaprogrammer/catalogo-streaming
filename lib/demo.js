import { eq } from 'drizzle-orm';
import { demoState, profiles, user } from './db/schema.js';
import { PROFILE_COLORS, createProfile } from './profiles.js';
import { setPin } from './pin.js';

export const DEMO_EMAIL = 'demo@paidegua.app';
export const DEMO_PIN = '1234';
export const DEMO_PROFILES = [
  { name: 'Pai', color: PROFILE_COLORS[3], kind: 'adulto' },
  { name: 'Mãe', color: PROFILE_COLORS[1], kind: 'adulto' },
  { name: 'Pequeno', color: PROFILE_COLORS[2], kind: 'kids', maxRating: '10' },
];

// Data no horário de Belém (UTC−3), no formato AAAA-MM-DD.
export const belemDate = (now) => new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function resetDemo(db, userId, now = new Date()) {
  await db.delete(profiles).where(eq(profiles.userId, userId));
  // Um a um, para manter a ordem de criação (Pai, Mãe, Pequeno).
  for (let i = 0; i < DEMO_PROFILES.length; i += 1) {
    const { profile } = await createProfile(db, userId, DEMO_PROFILES[i]);
    await db.update(profiles).set({ createdAt: new Date(now.getTime() + i) }).where(eq(profiles.id, profile.id));
  }
  await setPin(db, userId, DEMO_PIN);
  const lastReset = belemDate(now);
  await db.insert(demoState).values({ id: 1, lastReset }).onConflictDoUpdate({ target: demoState.id, set: { lastReset } });
}

export async function resetDemoIfNeeded(db, userId, now = new Date()) {
  const [state] = await db.select().from(demoState).where(eq(demoState.id, 1));
  if (state?.lastReset === belemDate(now)) return false;
  await resetDemo(db, userId, now);
  return true;
}

export async function ensureDemoAccount(db, auth, password, now = new Date()) {
  const [existing] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL));
  if (existing) return existing.id;
  const created = await auth.api.signUpEmail({ body: { name: 'Família Demonstração', email: DEMO_EMAIL, password } });
  await resetDemo(db, created.user.id, now);
  return created.user.id;
}
