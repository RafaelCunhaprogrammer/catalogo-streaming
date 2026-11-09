import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepare } from './helpers';

// Conta criada por tests/e2e/seed-expired.mjs antes do servidor subir (teste grátis já acabado). Valores só de teste local.
const EXPIRED_EMAIL = 'expirado@teste.local';
const EXPIRED_PASSWORD = 'senha-expirado-1';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
  expect(results.violations.map((v) => `${label} ${v.id}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('conta nova começa com a faixa do teste grátis e o item Planos no menu', async ({ page }) => {
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill('Bia');
  await page.getByLabel('E-mail').fill(`bia-${Date.now()}@ex.com`);
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await page.getByLabel('Confirme a senha').fill('senha-forte-1');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByText('Teste grátis: faltam')).toBeVisible();
  await expect(page.getByRole('status').getByRole('link', { name: 'Assinar' })).toBeVisible();
  await page.getByRole('button', { name: 'Menu do perfil Bia' }).click();
  await expect(page.getByRole('link', { name: 'Planos' })).toBeVisible();
  await expectNoViolations(page, '/');
});

test('teste acabado leva aos planos; pagar com Pix libera o catálogo; cancelar mantém o acesso até o fim', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(EXPIRED_EMAIL);
  await page.getByLabel('Senha').fill(EXPIRED_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'));
  await page.goto('/explorar');
  if (new URL(page.url()).pathname === '/perfis') {
    // Entrou sem perfil escolhido: escolhe o único perfil e tenta de novo.
    await page.getByRole('button', { name: 'Ex', exact: true }).click();
    await page.waitForURL((url) => url.pathname !== '/perfis');
    await page.goto('/explorar');
  }
  await expect(page).toHaveURL(/\/assinar\?motivo=expirou/);
  await expect(page.getByText('Seu teste grátis acabou. Escolha um plano para continuar assistindo.')).toBeVisible();
  await expectNoViolations(page, '/assinar');

  await page.getByRole('link', { name: 'Assinar Mensal' }).click();
  await page.waitForURL('**/assinar/pagamento**');
  await expect(page.getByText('Ambiente de demonstração: nenhum valor é cobrado.')).toBeVisible();
  await page.getByRole('tab', { name: 'Pix' }).click();
  await page.getByRole('button', { name: 'Já paguei (simulação)' }).click();
  await expect(page.getByText('Assinatura ativa até')).toBeVisible();
  await expectNoViolations(page, '/assinar/pagamento');

  await page.goto('/explorar');
  await expect(page).toHaveURL(/\/explorar$/);

  await page.goto('/conta');
  await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
  await page.getByRole('button', { name: 'Sim, cancelar' }).click();
  await expect(page.getByText('Sua assinatura termina em').first()).toBeVisible();
});
