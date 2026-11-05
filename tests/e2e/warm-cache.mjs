// O cache do TMDB começa vazio em cada execução e o primeiro Início faz dezenas de consultas.
// Aquece antes dos testes, para eles não disputarem essa primeira carga.
export default async function warmCache(config) {
  const { baseURL } = config.projects[0].use;
  const response = await fetch(new URL('/', baseURL));
  await response.text(); // a página vem em partes: só termina quando todas as fileiras chegam
}
