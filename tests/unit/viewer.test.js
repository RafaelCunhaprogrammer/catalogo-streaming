// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { signValue, verifySignedValue } from '@/lib/auth/signed-cookie';
import {
  buildViewer, encodeUnlocked, decodeUnlocked, encodeParentMode, parentModeActive,
  titleKey, VISITOR_MAX_RATING, MAX_UNLOCKED, PARENT_MODE_MS, DEMO_EMAIL,
} from '@/lib/auth/viewer-core';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const adulto = { id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', maxRating: null, prefs: {} };
const kids = { id: 'p2', userId: 'u1', name: 'Pequeno', color: '#ec4899', kind: 'kids', maxRating: '10', prefs: {} };
const session = { user: { id: 'u1', name: 'Ana', email: 'ana@ex.com' } };
const base = { session, profiles: [adulto, kids], secret: SECRET, now: 1_000_000 };

describe('cookies assinados', () => {
  it('ida e volta, e recusa valor adulterado', () => {
    const signed = signValue('p1', SECRET);
    expect(verifySignedValue(signed, SECRET)).toBe('p1');
    expect(verifySignedValue(signed.replace('p1', 'p2'), SECRET)).toBeNull();
    expect(verifySignedValue(signValue('p1', 'outro-segredo-qualquer-com-32-chars!!'), SECRET)).toBeNull();
    expect(verifySignedValue(undefined, SECRET)).toBeNull();
    expect(verifySignedValue('sem-assinatura', SECRET)).toBeNull();
  });
});

describe('buildViewer', () => {
  it('visitante: sem conta, vitrine até 14 anos', () => {
    const v = buildViewer({ ...base, session: null, profiles: [] });
    expect(v).toMatchObject({ user: null, profile: null, needsProfile: false, kids: false, maxRating: VISITOR_MAX_RATING });
    expect(VISITOR_MAX_RATING).toBe('14');
  });

  it('logado sem perfil escolhido precisa escolher', () => {
    const v = buildViewer({ ...base, profileCookie: undefined });
    expect(v).toMatchObject({ user: { id: 'u1' }, profile: null, needsProfile: true });
  });

  it('perfil adulto: sem limite de classificação', () => {
    const v = buildViewer({ ...base, profileCookie: signValue('p1', SECRET) });
    expect(v).toMatchObject({ profile: { id: 'p1' }, needsProfile: false, kids: false, maxRating: null });
  });

  it('perfil Kids: faixa do perfil e títulos liberados', () => {
    const v = buildViewer({
      ...base,
      profileCookie: signValue('p2', SECRET),
      unlockedCookie: encodeUnlocked(['movie-1'], SECRET),
    });
    expect(v).toMatchObject({ kids: true, maxRating: '10' });
    expect(v.unlocked.has('movie-1')).toBe(true);
    expect(v.unlocked.has('tv-1')).toBe(false);
  });

  it('cookie de perfil de outra conta, adulterado ou de perfil excluído é ignorado', () => {
    expect(buildViewer({ ...base, profileCookie: signValue('perfil-de-outra-conta', SECRET) }).needsProfile).toBe(true);
    expect(buildViewer({ ...base, profileCookie: 'p1.assinatura-falsa' }).needsProfile).toBe(true);
    expect(buildViewer({ ...base, profiles: [kids], profileCookie: signValue('p1', SECRET) }).needsProfile).toBe(true);
  });

  it('modo adulto (PIN digitado) vale por 10 minutos', () => {
    const cookie = encodeParentMode(1_000_000, SECRET);
    expect(parentModeActive(cookie, SECRET, 1_000_000 + PARENT_MODE_MS - 1)).toBe(true);
    expect(parentModeActive(cookie, SECRET, 1_000_000 + PARENT_MODE_MS + 1)).toBe(false);
    expect(parentModeActive('123.falso', SECRET, 1_000_000)).toBe(false);
    const v = buildViewer({ ...base, profileCookie: signValue('p2', SECRET), parentCookie: cookie, now: 1_000_000 + 1000 });
    expect(v.parentMode).toBe(true);
  });

  it('conta de demonstração é reconhecida', () => {
    const v = buildViewer({ ...base, session: { user: { id: 'u9', name: 'Demo', email: DEMO_EMAIL } }, profiles: [] });
    expect(v.isDemo).toBe(true);
  });
});

describe('títulos liberados', () => {
  it('chave por tipo e id', () => {
    expect(titleKey({ type: 'movie', id: 1 })).toBe('movie-1');
    expect(titleKey({ type: 'tv', id: 1 })).toBe('tv-1');
  });

  it('cookie adulterado vira lista vazia e o tamanho é limitado', () => {
    expect(decodeUnlocked('movie-1.falso', SECRET).size).toBe(0);
    const many = Array.from({ length: 200 }, (_, i) => `movie-${i}`);
    const set = decodeUnlocked(encodeUnlocked(many, SECRET), SECRET);
    expect(set.size).toBe(MAX_UNLOCKED);
    expect(set.has('movie-199')).toBe(true); // guarda os mais recentes
  });

  it('ignora chaves em formato estranho', () => {
    const set = decodeUnlocked(encodeUnlocked(['movie-1', 'filme-2', 'tv-x', 'tv-3'], SECRET), SECRET);
    expect([...set]).toEqual(['movie-1', 'tv-3']);
  });
});
