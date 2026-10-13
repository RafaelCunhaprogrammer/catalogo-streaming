// Ordem de preferência. O TMDB raramente tem trailer dublado no Brasil; o inglês vem antes
// da versão de Portugal porque ganha legendas em português no player (ver trailerEmbedUrl).
const PREFERENCE = [
  { lang: 'pt-BR', match: (v) => v.iso_639_1 === 'pt' && v.iso_3166_1 === 'BR', type: 'Trailer' },
  { lang: 'pt-BR', match: (v) => v.iso_639_1 === 'pt' && v.iso_3166_1 === 'BR', type: 'Teaser' },
  { lang: 'en', match: (v) => v.iso_639_1 === 'en', type: 'Trailer' },
  { lang: 'en', match: (v) => v.iso_639_1 === 'en', type: 'Teaser' },
  { lang: 'pt-PT', match: (v) => v.iso_639_1 === 'pt' && v.iso_3166_1 !== 'BR', type: 'Trailer' },
  { lang: 'pt-PT', match: (v) => v.iso_639_1 === 'pt' && v.iso_3166_1 !== 'BR', type: 'Teaser' },
];

export function pickTrailer(videos = []) {
  const youtube = (videos ?? []).filter((v) => v.site === 'YouTube' && v.key);
  for (const { lang, match, type } of PREFERENCE) {
    const best = youtube
      .filter((v) => match(v) && v.type === type)
      .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)))[0];
    if (best) return { key: best.key, lang };
  }
  return null;
}

// A qualidade do vídeo fica a cargo do YouTube, que a adapta à conexão de quem assiste.
export function trailerEmbedUrl(key, { autoplay = false, muted = false, loop = false, subtitles = false } = {}) {
  const params = new URLSearchParams({ rel: '0', playsinline: '1', enablejsapi: '1', modestbranding: '1', hl: 'pt-BR' });
  if (autoplay) params.set('autoplay', '1');
  if (muted) params.set('mute', '1');
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', key);
  }
  if (subtitles) {
    params.set('cc_load_policy', '1');
    params.set('cc_lang_pref', 'pt');
  }
  return `https://www.youtube-nocookie.com/embed/${key}?${params}`;
}
