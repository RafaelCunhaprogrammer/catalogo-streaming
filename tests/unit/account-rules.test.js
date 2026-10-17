import { describe, it, expect } from 'vitest';
import { profileSwitchAllowed, adultAreaAllowed, canChangeAccount, safeReturnPath } from '@/lib/account-rules';

const visitor = { user: null, kids: false, parentMode: false, isDemo: false };
const adult = { user: { id: 'u1' }, kids: false, parentMode: true, isDemo: false };
const kids = { user: { id: 'u1' }, kids: true, parentMode: false, isDemo: false };
const kidsWithPin = { ...kids, parentMode: true };

describe('regras da conta', () => {
  it('no Kids, trocar perfil e áreas de adulto pedem o PIN', () => {
    expect(profileSwitchAllowed(adult)).toBe(true);
    expect(profileSwitchAllowed(kids)).toBe(false);
    expect(profileSwitchAllowed(kidsWithPin)).toBe(true);
    expect(profileSwitchAllowed(visitor)).toBe(false);
    expect(adultAreaAllowed(kids)).toBe(false);
    expect(adultAreaAllowed(kidsWithPin)).toBe(true);
  });

  it('a conta de demonstração não troca senha nem é excluída', () => {
    expect(canChangeAccount(adult)).toBe(true);
    expect(canChangeAccount({ ...adult, isDemo: true })).toBe(false);
  });

  it('só volta para caminhos do próprio site', () => {
    expect(safeReturnPath('/filme/1?x=2')).toBe('/filme/1?x=2');
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '', null, 'filme/1']) expect(safeReturnPath(bad)).toBe('/');
  });
});
