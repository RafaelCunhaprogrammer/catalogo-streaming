import { describe, it, expect } from 'vitest';
import { AVATARS, AVATAR_GROUPS, avatarGroupsFor, defaultAvatar, isAvatar } from '@/lib/avatars';

const SABORES = ['carimbo', 'manicoba', 'tacaca', 'camarao', 'cirio'];
const LENDAS = ['curupira', 'mapinguari', 'matinta-perera', 'boto-encantado', 'iara', 'cobra-grande', 'moca-do-taxi'];

describe('avatares regionais', () => {
  it('28 avatares: os 12 aprovados primeiro, na mesma ordem, e os novos depois', () => {
    expect(AVATARS.map((a) => a.slug)).toEqual([
      'acai', 'cupuacu', 'pupunha', 'jambu', 'castanha', 'ver-o-peso',
      'boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca',
      ...LENDAS,
      'uirapuru', ...SABORES,
      'urubu', 'garca', 'barquinho',
    ]);
    expect(avatarGroupsFor('adulto')[0].avatars.map((a) => a.label)).toEqual(['Açaí', 'Cupuaçu', 'Pupunha', 'Jambu', 'Castanha', 'Ver-o-Peso', 'Barquinho']);
    expect(AVATARS.filter((a) => a.set === 'sabores').map((a) => a.label)).toEqual(['Carimbó', 'Maniçoba', 'Tacacá', 'Camarão', 'Círio de Nazaré']);
    expect(AVATARS.filter((a) => a.set === 'kids')).toHaveLength(9);
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

  it('quatro grupos; todos os perfis (inclusive Kids) veem todos, o Kids com bichos, lendas e sabores primeiro', () => {
    expect(AVATAR_GROUPS.map((g) => g.label)).toEqual(['Frutas e símbolos do Pará', 'Bichos da Amazônia', 'Lendas do Pará', 'Sabores e festas do Pará']);
    expect(avatarGroupsFor('kids').map((g) => g.set)).toEqual(['kids', 'lendas', 'sabores', 'adulto']);
    expect(avatarGroupsFor('adulto').map((g) => g.set)).toEqual(['adulto', 'kids', 'lendas', 'sabores']);
    expect(avatarGroupsFor('kids')[0].avatars.map((a) => a.slug)).toEqual(['boto', 'preguica', 'arara', 'peixe-boi', 'tracaja', 'onca', 'uirapuru', 'urubu', 'garca']);
    expect(avatarGroupsFor('kids')[1].avatars.map((a) => a.slug)).toEqual(LENDAS);
  });
});
