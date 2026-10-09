const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path, size = 'w342') {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
