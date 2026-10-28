// Classificação indicativa brasileira, da mais livre à mais restrita.
export const RATING_ORDER = ['L', '10', '12', '14', '16', '18'];

// O TMDB às vezes guarda mais de uma classificação para o Brasil (ex.: The Chosen tem 12 e 10).
// Por precaução, vale a mais restritiva; um valor fora da escala só conta se não houver outro.
function strictest(values) {
  const clean = values.map((v) => v?.trim()).filter(Boolean);
  const known = clean.filter((v) => RATING_ORDER.includes(v));
  if (known.length) return known.reduce((a, b) => (RATING_ORDER.indexOf(b) > RATING_ORDER.indexOf(a) ? b : a));
  return clean[0] || null;
}

export function brazilCertification(details, type) {
  if (type === 'movie') {
    const br = (details.release_dates?.results ?? []).filter((r) => r.iso_3166_1 === 'BR');
    return strictest(br.flatMap((r) => (r.release_dates ?? []).map((d) => d.certification)));
  }
  const br = (details.content_ratings?.results ?? []).filter((r) => r.iso_3166_1 === 'BR');
  return strictest(br.map((r) => r.rating));
}
