import { describe, it, expect } from 'vitest';
import { AVATARS, AVATAR_GROUPS, avatarGroupsFor, defaultAvatar, isAvatar } from '@/lib/avatars';

const LENDAS = ['curupira', 'mapinguari', 'matinta-perera', 'boto-encantado', 'iara', 'cobra-grande', 'moca-do-taxi'];

describe('avatares regionais', () => {
  it('19 avatares: os 12 aprovados, na mesma ordem, e as 7 lendas do Pará no fim', () => {
    expect(AVATARS.map((a) => a.slug)).toEqual([
      'acai', 'cupuacu', 'pupunha', 'jambu', 'castanha', 'ver-o-peso',
      'boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca',
      ...LENDAS,
    ]);
    expect(AVATARS.filter((a) => a.set === 'kids')).toHaveLength(6);
    expect(AVATARS.filter((a) => a.set === 'lendas').map((a) => a.label)).toEqual([
      'Curupira', 'Mapinguari', 'Matinta Perera', 'Boto encantado', 'Iara', 'Cobra Grande', 'Moça do Táxi',
    ]);
    expect(AVATARS.find((a) => a.slug === 'ver-o-peso').label).toBe('Ver-o-Peso');
  });

  it('reconhece só os slugs da lista', () => {
    expect(isAvatar('boto')).toBe(true);
    expect(isAvatar('matinta-perera')).toBe(true);
    expect(isAvatar('mickey')).toBe(false);
    expect(isAvatar(null)).toBe(false);
  });

  it('avatar padrão: Açaí no adulto, Boto no Kids', () => {
    expect(defaultAvatar('adulto')).toBe('acai');
    expect(defaultAvatar('kids')).toBe('boto');
  });

  it('três grupos; todos os perfis (inclusive Kids) veem todos, o Kids com os bichos e as lendas primeiro', () => {
    expect(AVATAR_GROUPS.map((g) => g.label)).toEqual(['Frutas e símbolos do Pará', 'Bichos da Amazônia', 'Lendas do Pará']);
    expect(avatarGroupsFor('kids').map((g) => g.set)).toEqual(['kids', 'lendas', 'adulto']);
    expect(avatarGroupsFor('adulto').map((g) => g.set)).toEqual(['adulto', 'kids', 'lendas']);
    expect(avatarGroupsFor('kids')[0].avatars.map((a) => a.slug)).toEqual(['boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca']);
    expect(avatarGroupsFor('kids')[1].avatars.map((a) => a.slug)).toEqual(LENDAS);
  });
});
