import { describe, it, expect } from 'vitest';
import { AVATARS, AVATAR_GROUPS, avatarGroupsFor, defaultAvatar, isAvatar } from '@/lib/avatars';

describe('avatares regionais', () => {
  it('12 avatares, na ordem aprovada: 6 adultos e 6 Kids', () => {
    expect(AVATARS.map((a) => a.slug)).toEqual([
      'acai', 'cupuacu', 'pupunha', 'jambu', 'castanha', 'ver-o-peso',
      'boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca',
    ]);
    expect(AVATARS.filter((a) => a.set === 'kids')).toHaveLength(6);
    expect(AVATARS.find((a) => a.slug === 'ver-o-peso').label).toBe('Ver-o-Peso');
  });

  it('reconhece só os slugs da lista', () => {
    expect(isAvatar('boto')).toBe(true);
    expect(isAvatar('mickey')).toBe(false);
    expect(isAvatar(null)).toBe(false);
  });

  it('avatar padrão: Açaí no adulto, Boto no Kids', () => {
    expect(defaultAvatar('adulto')).toBe('acai');
    expect(defaultAvatar('kids')).toBe('boto');
  });

  it('grupos: o Kids vê os bichos primeiro, mas todos os avatares aparecem', () => {
    expect(AVATAR_GROUPS.map((g) => g.label)).toEqual(['Frutas e símbolos do Pará', 'Bichos da Amazônia']);
    expect(avatarGroupsFor('kids').map((g) => g.set)).toEqual(['kids', 'adulto']);
    expect(avatarGroupsFor('adulto').map((g) => g.set)).toEqual(['adulto', 'kids']);
    expect(avatarGroupsFor('kids')[0].avatars.map((a) => a.slug)).toEqual(['boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca']);
  });
});
