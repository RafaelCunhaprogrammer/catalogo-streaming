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
];

export const AVATAR_GROUPS = [
  { set: 'adulto', label: 'Frutas e símbolos do Pará' },
  { set: 'kids', label: 'Bichos da Amazônia' },
];

const SLUGS = new Set(AVATARS.map((a) => a.slug));

export const isAvatar = (slug) => typeof slug === 'string' && SLUGS.has(slug);

export const defaultAvatar = (kind) => (kind === 'kids' ? 'boto' : 'acai');

// Qualquer perfil escolhe qualquer avatar; o grupo do próprio tipo vem primeiro.
export function avatarGroupsFor(kind) {
  const groups = AVATAR_GROUPS.map((g) => ({ ...g, avatars: AVATARS.filter((a) => a.set === g.set) }));
  return kind === 'kids' ? [...groups].reverse() : groups;
}
