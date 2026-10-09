export function brazilCertification(details, type) {
  if (type === 'movie') {
    const br = details.release_dates?.results?.find((r) => r.iso_3166_1 === 'BR');
    const cert = br?.release_dates?.map((d) => d.certification?.trim()).find(Boolean);
    return cert || null;
  }
  const br = details.content_ratings?.results?.find((r) => r.iso_3166_1 === 'BR');
  return br?.rating?.trim() || null;
}
