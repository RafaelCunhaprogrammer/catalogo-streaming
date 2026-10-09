// Uso: node --env-file=.env.local scripts/list-providers.mjs
const res = await fetch('https://api.themoviedb.org/3/watch/providers/movie?watch_region=BR&language=pt-BR', {
  headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
});
const { results } = await res.json();
results
  .sort((a, b) => (a.display_priorities?.BR ?? 999) - (b.display_priorities?.BR ?? 999))
  .slice(0, 40)
  .forEach((p) => console.log(String(p.provider_id).padStart(5), p.provider_name));
