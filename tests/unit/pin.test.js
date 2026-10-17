// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user, parentalPins } from '@/lib/db/schema';
import {
  PIN_MAX_ATTEMPTS, PIN_LOCK_MS, isValidPin, hasPin, setPin, verifyPin, pinMessage,
} from '@/lib/pin';

let db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
});

describe('PIN dos pais', () => {
  it('aceita só 4 números', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const bad of ['123', '12345', '12a4', '', ' 1234', null]) expect(isValidPin(bad)).toBe(false);
  });

  it('guarda protegido, nunca o número', async () => {
    expect(await hasPin(db, 'u1')).toBe(false);
    expect(await setPin(db, 'u1', '4321')).toEqual({ ok: true });
    const [row] = await db.select().from(parentalPins);
    expect(row.pinHash).not.toContain('4321');
    expect(await hasPin(db, 'u1')).toBe(true);
    expect(await setPin(db, 'u1', '12')).toEqual({ ok: false, error: 'O PIN tem 4 números.' });
  });

  it('confere o PIN e conta as tentativas restantes', async () => {
    await setPin(db, 'u1', '4321');
    expect(await verifyPin(db, 'u1', '4321')).toEqual({ ok: true });
    expect(await verifyPin(db, 'u1', '0000')).toEqual({ ok: false, reason: 'incorreto', remaining: 4 });
    expect(pinMessage({ ok: false, reason: 'incorreto', remaining: 4 })).toBe('PIN incorreto. Restam 4 tentativas.');
    expect(pinMessage({ ok: false, reason: 'incorreto', remaining: 1 })).toBe('PIN incorreto. Resta 1 tentativa.');
  });

  it('5 erros bloqueiam por 5 minutos, mesmo com o PIN certo; depois libera', async () => {
    await setPin(db, 'u1', '4321');
    const t0 = new Date('2026-10-17T12:00:00Z');
    for (let i = 0; i < PIN_MAX_ATTEMPTS - 1; i += 1) await verifyPin(db, 'u1', '0000', t0);
    const fifth = await verifyPin(db, 'u1', '0000', t0);
    expect(fifth).toMatchObject({ ok: false, reason: 'bloqueado' });
    const in4min = new Date(t0.getTime() + 4 * 60 * 1000);
    expect(await verifyPin(db, 'u1', '4321', in4min)).toMatchObject({ ok: false, reason: 'bloqueado' });
    expect(pinMessage(fifth, in4min)).toBe('Muitas tentativas. Tente de novo em 1 minuto.');
    const in6min = new Date(t0.getTime() + PIN_LOCK_MS + 60 * 1000);
    expect(await verifyPin(db, 'u1', '4321', in6min)).toEqual({ ok: true });
    expect(await verifyPin(db, 'u1', '0000', in6min)).toMatchObject({ remaining: 4 });
  });

  it('acertar zera as tentativas', async () => {
    await setPin(db, 'u1', '4321');
    await verifyPin(db, 'u1', '0000');
    await verifyPin(db, 'u1', '4321');
    expect(await verifyPin(db, 'u1', '0000')).toMatchObject({ remaining: 4 });
  });

  it('conta sem PIN', async () => {
    expect(await verifyPin(db, 'u1', '1234')).toEqual({ ok: false, reason: 'sem-pin' });
  });

  it('trocar o PIN desbloqueia e zera tentativas', async () => {
    await setPin(db, 'u1', '4321');
    for (let i = 0; i < PIN_MAX_ATTEMPTS; i += 1) await verifyPin(db, 'u1', '0000');
    await setPin(db, 'u1', '9999');
    expect(await verifyPin(db, 'u1', '9999')).toEqual({ ok: true });
  });
});
