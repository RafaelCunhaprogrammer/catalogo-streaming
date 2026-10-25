import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepare, signInDemo } from './helpers';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(tags).exclude('iframe').analyze();
  expect(results.violations.map((v) => `${label} ${v.id}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('listas: favoritar, acompanhar a série, ver no Início e na Minha lista, e favoritar no Kids', async ({ page }) => {
  await signInDemo(page, 'Pai');

  // Favoritar pelo cartaz no Início.
  await page.getByRole('button', { name: 'Favoritar Série Brilhante' }).first().click();
  await expect(page.getByRole('button', { name: 'Remover Série Brilhante dos favoritos' }).first()).toBeVisible();

  // Página da série: Assistindo e "+1 episódio".
  await page.goto('/serie/201');
  await page.getByRole('button', { name: 'Assistindo Série Brilhante' }).click();
  await expect(page.getByRole('group', { name: 'Onde você parou' })).toBeVisible();
  await page.getByRole('button', { name: '+1 episódio' }).click();
  await expect(page.getByLabel('Temporada')).toHaveValue('1');
  await expect(page.getByLabel('Episódio')).toHaveValue('2');
  await expectNoViolations(page, '/serie/201');

  // Início: Continuar assistindo.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Continuar assistindo' })).toBeVisible();
  await expect(page.getByText('Parei no T1 E2')).toBeVisible();

  // Minha lista: Favoritos (1), remover e desfazer.
  await page.getByRole('link', { name: 'Minha lista' }).first().click();
  await expect(page).toHaveURL(/\/minha-lista/);
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible();
  await expectNoViolations(page, '/minha-lista');
  await page.getByRole('button', { name: 'Remover Série Brilhante desta lista' }).click();
  await expect(page.getByRole('tab', { name: 'Favoritos (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible();

  // Kids: troca de perfil com PIN, abre um título liberado e favorita.
  await page.getByRole('button', { name: 'Menu do perfil Pai' }).click();
  await page.getByRole('menuitem', { name: 'Trocar perfil' }).or(page.getByRole('link', { name: 'Trocar perfil' })).click();
  await page.waitForURL('**/perfis');
  await page.getByRole('button', { name: 'Pequeno', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.goto('/filme/101');
  await page.getByRole('button', { name: 'Digitar o PIN' }).click();
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Aventura Neon/ })).toBeVisible();
  const heart = page.getByRole('button', { name: /^Favoritar Aventura Neon/ });
  await heart.click();
  await expect(page.getByRole('button', { name: /^Remover Aventura Neon.* dos favoritos/ })).toBeVisible();
});
