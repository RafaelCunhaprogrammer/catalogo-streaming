// Quem pode o quê. No Kids, sair do perfil ou entrar em áreas de adulto pede o PIN (modo adulto).
export const profileSwitchAllowed = (viewer) => Boolean(viewer?.user) && ((!viewer.kids && !viewer.kidsLock) || viewer.parentMode);
export const adultAreaAllowed = profileSwitchAllowed;
export const canChangeAccount = (viewer) => Boolean(viewer?.user) && !viewer.isDemo;

// Evita redirecionar para outro site depois de entrar.
export function safeReturnPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  // O navegador apaga tabulação e quebras de linha do endereço: "/\t/site" viraria "//site".
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return '/';
  return path;
}
