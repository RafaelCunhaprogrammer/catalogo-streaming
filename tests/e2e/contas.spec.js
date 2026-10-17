import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepare, signInDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('visitante vê só a vitrine e é levado a entrar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
  await page.goto('/filme/101');
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Ffilme%2F101$/);
  await expect(page.getByText('Entre ou crie sua conta para continuar.')).toBeVisible();
  const api = await page.request.get('/api/explorar');
  expect(api.status()).toBe(401);
});

test('criar conta leva direto ao Início com o primeiro perfil', async ({ page }) => {
  const email = `ana-${Date.now()}@ex.com`;
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill('Ana');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await page.getByLabel('Confirme a senha').fill('senha-forte-1');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'Menu do perfil Ana' })).toBeVisible();
});

test('entrar com senha errada mostra a mensagem certa', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('demo@paidegua.app');
  await page.getByLabel('Senha').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  // O Next também tem um role=alert (anunciador de rotas): o erro é procurado dentro do formulário.
  await expect(page.locator('form').getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
});

test('demonstração: três perfis e o Kids marcado', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Experimentar sem cadastro' }).click();
  await page.waitForURL('**/perfis');
  for (const name of ['Pai', 'Mãe', 'Pequeno']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByText('Kids')).toBeVisible();
});

test('Kids: título acima da faixa só abre com o PIN', async ({ page }) => {
  await signInDemo(page, 'Pequeno');
  await page.goto('/filme/101'); // classificação 12, perfil até 10
  await expect(page.getByRole('heading', { name: 'Este título precisa de um adulto' })).toBeVisible();
  await expect(page.getByText('Uma aventura brilhante')).toHaveCount(0);
  await page.getByRole('button', { name: 'Digitar o PIN' }).click();
  await page.getByLabel('PIN dos pais').fill('0000');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('PIN incorreto. Restam 4 tentativas.');
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Aventura Neon/ })).toBeVisible();
});

test('Kids: sair do perfil e abrir áreas de adulto pedem o PIN', async ({ page }) => {
  await signInDemo(page, 'Pequeno');
  for (const path of ['/perfis', '/perfis/gerenciar', '/conta']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Área de adultos' })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu do perfil Pequeno' }).click();
  await page.getByRole('button', { name: 'Trocar perfil' }).click();
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page).toHaveURL(/\/perfis$/);
  await expect(page.getByRole('heading', { name: 'Quem está assistindo?' })).toBeVisible();
});

test('acessibilidade das telas de conta', async ({ page }) => {
  for (const path of ['/entrar', '/criar-conta', '/esqueci-senha']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
  await signInDemo(page, 'Pai');
  for (const path of ['/perfis', '/perfis/gerenciar', '/conta']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze();
    expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});

test('Kids: fechar o navegador não libera o perfil adulto', async ({ page, browser }) => {
  await signInDemo(page, 'Pequeno');
  // "Reabrir o navegador": só os cookies com validade sobrevivem (a sessão da conta e a trava do Kids).
  const lasting = (await page.context().cookies()).filter((c) => c.expires > 0);
  const reopened = await browser.newContext();
  await reopened.addCookies(lasting);
  const again = await reopened.newPage();
  await prepare(again);
  await again.goto('/perfis');
  await again.getByRole('button', { name: 'Pai', exact: true }).click();
  await expect(again.getByRole('dialog', { name: 'Área de adultos' })).toBeVisible();
  await again.getByLabel('PIN dos pais').fill('1234');
  await again.getByRole('button', { name: 'Confirmar' }).click();
  await again.waitForURL((url) => url.pathname === '/');
  await expect(again.getByRole('button', { name: 'Menu do perfil Pai' })).toBeVisible();
  await reopened.close();
});
