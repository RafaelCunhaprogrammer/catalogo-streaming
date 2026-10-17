import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { parentalPins } from './db/schema.js';

const scrypt = promisify(scryptCb);
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 5 * 60 * 1000;

export const isValidPin = (pin) => typeof pin === 'string' && /^\d{4}$/.test(pin);

// "sal:hash" em hexadecimal; o PIN em si nunca é guardado.
export async function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function pinMatches(pin, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

async function getRow(db, userId) {
  const [row] = await db.select().from(parentalPins).where(eq(parentalPins.userId, userId));
  return row ?? null;
}

export async function hasPin(db, userId) {
  return Boolean(await getRow(db, userId));
}

export async function setPin(db, userId, pin) {
  if (!isValidPin(pin)) return { ok: false, error: 'O PIN tem 4 números.' };
  const values = { pinHash: await hashPin(pin), failedAttempts: 0, lockedUntil: null, updatedAt: new Date() };
  await db
    .insert(parentalPins)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: parentalPins.userId, set: values });
  return { ok: true };
}

export async function verifyPin(db, userId, pin, now = new Date()) {
  const row = await getRow(db, userId);
  if (!row) return { ok: false, reason: 'sem-pin' };
  if (row.lockedUntil && row.lockedUntil > now) return { ok: false, reason: 'bloqueado', lockedUntil: row.lockedUntil };

  // Bloqueio vencido: começa uma nova série de tentativas.
  const attempts = row.lockedUntil ? 0 : row.failedAttempts;
  if (isValidPin(pin) && (await pinMatches(pin, row.pinHash))) {
    await db.update(parentalPins).set({ failedAttempts: 0, lockedUntil: null }).where(eq(parentalPins.userId, userId));
    return { ok: true };
  }
  const failed = attempts + 1;
  if (failed >= PIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + PIN_LOCK_MS);
    await db.update(parentalPins).set({ failedAttempts: 0, lockedUntil }).where(eq(parentalPins.userId, userId));
    return { ok: false, reason: 'bloqueado', lockedUntil };
  }
  await db.update(parentalPins).set({ failedAttempts: failed, lockedUntil: null }).where(eq(parentalPins.userId, userId));
  return { ok: false, reason: 'incorreto', remaining: PIN_MAX_ATTEMPTS - failed };
}

export function pinMessage(result, now = new Date()) {
  if (result.reason === 'incorreto') {
    return result.remaining === 1 ? 'PIN incorreto. Resta 1 tentativa.' : `PIN incorreto. Restam ${result.remaining} tentativas.`;
  }
  if (result.reason === 'bloqueado') {
    const minutes = Math.max(1, Math.ceil((new Date(result.lockedUntil) - now) / 60000));
    return `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
  }
  if (result.reason === 'sem-pin') return 'Esta conta ainda não tem PIN dos pais.';
  return '';
}
