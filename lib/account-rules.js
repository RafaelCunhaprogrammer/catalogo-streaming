// Quem pode o quê. No Kids, sair do perfil ou entrar em áreas de adulto pede o PIN (modo adulto).
export const profileSwitchAllowed = (viewer) => Boolean(viewer?.user) && (!viewer.kids || viewer.parentMode);
export const adultAreaAllowed = profileSwitchAllowed;
export const canChangeAccount = (viewer) => Boolean(viewer?.user) && !viewer.isDemo;

// Evita redirecionar para outro site depois de entrar.
export function safeReturnPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  return path;
}
