// Avatares regionais (Etapa D): ilustrações próprias, sem personagens de marcas.
// Os desenhos ficam em components/profiles/avatars.jsx.
export const AVATARS = [
  { slug: 'acai', label: 'Açaí', set: 'adulto' },
  { slug: 'cupuacu', label: 'Cupuaçu', set: 'adulto' },
  { slug: 'pupunha', label: 'Pupunha', set: 'adulto' },
  { slug: 'jambu', label: 'Jambu', set: 'adulto' },
  { slug: 'castanha', label: 'Castanha', set: 'adulto' },
  { slug: 'ver-o-peso', label: 'Ver-o-Peso', set: 'adulto' },
  { slug: 'boto', label: 'Boto', set: 'kids' },
  { slug: 'preguica', label: 'Preguiça', set: 'kids' },
  { slug: 'arara', label: 'Arara', set: 'kids' },
  { slug: 'peixe-boi', label: 'Peixe-boi', set: 'kids' },
  { slug: 'tracaja', label: 'Tracajá', set: 'kids' },
  { slug: 'onca', label: 'Onça', set: 'kids' },
  // Lendas do Pará: com graça, nada assustador (todos os perfis, inclusive Kids).
  { slug: 'curupira', label: 'Curupira', set: 'lendas' },
  { slug: 'mapinguari', label: 'Mapinguari', set: 'lendas' },
  { slug: 'matinta-perera', label: 'Matinta Perera', set: 'lendas' },
  { slug: 'boto-encantado', label: 'Boto encantado', set: 'lendas' },
  { slug: 'iara', label: 'Iara', set: 'lendas' },
  { slug: 'cobra-grande', label: 'Cobra Grande', set: 'lendas' },
  { slug: 'moca-do-taxi', label: 'Moça do Táxi', set: 'lendas' },
];

export const AVATAR_GROUPS = [
  { set: 'adulto', label: 'Frutas e símbolos do Pará' },
  { set: 'kids', label: 'Bichos da Amazônia' },
  { set: 'lendas', label: 'Lendas do Pará' },
];

const KIDS_ORDER = ['kids', 'lendas', 'adulto'];

const SLUGS = new Set(AVATARS.map((a) => a.slug));

export const isAvatar = (slug) => typeof slug === 'string' && SLUGS.has(slug);

export const defaultAvatar = (kind) => (kind === 'kids' ? 'boto' : 'acai');

// Qualquer perfil escolhe qualquer avatar; no Kids, os bichos e as lendas vêm primeiro.
export function avatarGroupsFor(kind) {
  const groups = AVATAR_GROUPS.map((g) => ({ ...g, avatars: AVATARS.filter((a) => a.set === g.set) }));
  if (kind !== 'kids') return groups;
  return [...groups].sort((a, b) => KIDS_ORDER.indexOf(a.set) - KIDS_ORDER.indexOf(b.set));
}
