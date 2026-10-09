export function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function formatSeasons(n) {
  if (!n) return null;
  return n === 1 ? '1 temporada' : `${n} temporadas`;
}

export function certificationLabel(cert) {
  return cert === 'L' ? 'Classificação indicativa: livre' : `Classificação indicativa: ${cert} anos`;
}

// Cores oficiais da classificação indicativa brasileira.
export const CERTIFICATION_STYLES = {
  L: 'bg-green-600 text-white',
  10: 'bg-sky-600 text-white',
  12: 'bg-yellow-400 text-black',
  14: 'bg-orange-500 text-black',
  16: 'bg-red-600 text-white',
  18: 'bg-black text-white border border-white/40',
};
