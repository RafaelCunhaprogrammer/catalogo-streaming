// Bloqueia rede externa (YouTube e imagens) e pula a abertura.
export async function prepare(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
  await page.addInitScript(() => sessionStorage.setItem('paidegua:abertura', '1'));
}

// Entra na conta de demonstração e escolhe um perfil ("Pai", "Mãe" ou "Pequeno").
export async function signInDemo(page, profile = 'Pai') {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Experimentar sem cadastro' }).click();
  await page.waitForURL('**/perfis');
  await page.getByRole('button', { name: profile, exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
}
