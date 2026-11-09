// Bloqueia rede externa (YouTube e imagens) e pula a abertura.
export async function prepare(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
  await page.addInitScript(() => sessionStorage.setItem('paidegua:abertura', '1'));
}

// Cria uma conta de teste nova (no banco do ponta a ponta) e cai no Início com o primeiro perfil.
// Para o que a conta de demonstração não deixa fazer, como foto própria.
export async function signUpFresh(page, name = 'Ana') {
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('E-mail').fill(`${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ex.com`);
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await page.getByLabel('Confirme a senha').fill('senha-forte-1');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

// Entra na conta de demonstração e escolhe um perfil ("Pai", "Mãe" ou "Pequeno").
export async function signInDemo(page, profile = 'Pai') {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Experimentar sem cadastro' }).click();
  await page.waitForURL('**/perfis');
  await page.getByRole('button', { name: profile, exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
}
