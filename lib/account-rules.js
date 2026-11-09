// Quem pode o quê. No Kids, sair do perfil ou entrar em áreas de adulto pede o PIN (modo adulto).
export const profileSwitchAllowed = (viewer) => Boolean(viewer?.user) && ((!viewer.kids && !viewer.kidsLock) || viewer.parentMode);
export const adultAreaAllowed = profileSwitchAllowed;
export const canChangeAccount = (viewer) => Boolean(viewer?.user) && !viewer.isDemo;

// A conta de demonstração é a mesma para todos os visitantes: o que um muda, todos veem até o reset.
// Por isso ela não cria nem exclui perfis, e na edição só troca o avatar (dos desenhos) e a cor.
export const DEMO_PROFILES_LOCKED = 'Na conta de demonstração, dá para trocar só o avatar e a cor. Crie sua conta para personalizar o resto.';

export function demoProfileEditError(current, input, { photo }) {
  if (photo) return DEMO_PROFILES_LOCKED;
  const sameName = String(input.name ?? '').trim() === current.name;
  const sameKind = input.kind === current.kind;
  const sameRating = (input.kind === 'kids' ? input.maxRating : null) === (current.kind === 'kids' ? current.maxRating : null);
  return sameName && sameKind && sameRating ? null : DEMO_PROFILES_LOCKED;
}

// Evita redirecionar para outro site depois de entrar.
export function safeReturnPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  // O navegador apaga tabulação e quebras de linha do endereço: "/\t/site" viraria "//site".
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return '/';
  return path;
}
