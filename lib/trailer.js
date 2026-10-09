const PREFERENCE = [['pt', 'Trailer'], ['pt', 'Teaser'], ['en', 'Trailer'], ['en', 'Teaser']];

function score(video) {
  return (video.iso_3166_1 === 'BR' ? 2 : 0) + (video.official ? 1 : 0);
}

export function pickTrailer(videos = []) {
  const youtube = (videos ?? []).filter((v) => v.site === 'YouTube' && v.key);
  for (const [lang, type] of PREFERENCE) {
    const best = youtube
      .filter((v) => v.iso_639_1 === lang && v.type === type)
      .sort((a, b) => score(b) - score(a))[0];
    if (best) return best.key;
  }
  return null;
}

export function trailerEmbedUrl(key, { autoplay = false, muted = false, loop = false } = {}) {
  const params = new URLSearchParams({ rel: '0', playsinline: '1', enablejsapi: '1', modestbranding: '1' });
  if (autoplay) params.set('autoplay', '1');
  if (muted) params.set('mute', '1');
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', key);
  }
  return `https://www.youtube-nocookie.com/embed/${key}?${params}`;
}
