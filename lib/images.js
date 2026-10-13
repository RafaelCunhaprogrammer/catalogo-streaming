const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path, size = 'w342') {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

// Tamanhos que o TMDB oferece para cada tipo de imagem. O navegador escolhe pelo srcset
// o menor arquivo que fica nítido naquela tela (inclusive telas de alta densidade).
const SETS = {
  poster: { fallback: 'w500', sizes: [['w342', 342], ['w500', 500], ['w780', 780]] },
  backdrop: { fallback: 'w1280', sizes: [['w780', 780], ['w1280', 1280], ['original', 3840]] },
  logo: { fallback: 'w154', sizes: [['w92', 92], ['w154', 154], ['w300', 300]] },
  profile: { fallback: 'w185', sizes: [['w185', 185], ['h632', 632]] },
};

export function imageSet(path, kind) {
  if (!path) return null;
  const { fallback, sizes } = SETS[kind];
  return {
    src: imageUrl(path, fallback),
    srcSet: sizes.map(([size, width]) => `${imageUrl(path, size)} ${width}w`).join(', '),
  };
}
