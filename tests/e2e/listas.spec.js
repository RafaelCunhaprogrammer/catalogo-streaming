import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepare, signInDemo } from './helpers';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(tags).exclude('iframe').analyze();
  expect(results.violations.map((v) => `${label} ${v.id}`)).toEqual([]);
}

// Deixa o perfil sem marcações: o banco do e2e pode ser reaproveitado entre execuções.
async function clearLists(page) {
  await page.goto('/minha-lista');
  for (const tab of ['Favoritos', 'Assistindo', 'Já assisti']) {
    await page.getByRole('tab', { name: `${tab} (` }).click();
    const remove = page.getByRole('button', { name: /^Remover .* desta lista$/ });
    while ((await remove.count()) > 0) {
      const before = await remove.count();
      await remove.first().click();
      await expect(remove).toHaveCount(before - 1);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('listas: favoritar, acompanhar a série, ver no Início e na Minha lista, e favoritar no Kids', async ({ page }) => {
  await signInDemo(page, 'Pai');
  await clearLists(page);
  await page.goto('/');

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

  // Já assisti: remover e desfazer devolve o filme, e a volta fica gravada (recarregar mantém).
  await page.goto('/filme/101');
  const watched = page.getByRole('button', { name: 'Já assisti Aventura Neon', exact: true });
  await expect(watched).toHaveAttribute('aria-pressed', 'false');
  await watched.click();
  await expect(watched).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/minha-lista?aba=ja-assisti');
  await expect(page.getByRole('tab', { name: 'Já assisti (1)' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Remover Aventura Neon desta lista' }).click();
  await expect(page.getByRole('tab', { name: 'Já assisti (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('button', { name: 'Remover Aventura Neon desta lista' })).toBeVisible();
  await expect(page.locator('[data-actors]')).toHaveAttribute('data-actors', '0'); // envios terminados
  await expect(page.getByText('Não foi possível salvar. Tente de novo.')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Já assisti (1)' })).toBeVisible();

  // Kids: troca de perfil com PIN, abre um título liberado e favorita.
  await page.getByRole('button', { name: 'Menu do perfil Pai' }).click();
  await page.getByRole('link', { name: 'Trocar perfil' }).click();
  await page.waitForURL('**/perfis');
  await page.getByRole('button', { name: 'Pequeno', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.goto('/filme/101');
  await page.getByRole('button', { name: 'Digitar o PIN' }).click();
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aventura Neon', exact: true })).toBeVisible();
  const add = page.getByRole('button', { name: 'Favoritar Aventura Neon', exact: true });
  const remove = page.getByRole('button', { name: 'Remover Aventura Neon dos favoritos', exact: true });
  await expect(add.or(remove)).toBeVisible(); // espera a página hidratar antes de decidir
  if (await remove.isVisible()) await remove.click(); // sobra de uma execução anterior
  await add.click();
  await expect(remove).toBeVisible();
  await remove.click(); // deixa o banco limpo
  await expect(add).toBeVisible();
});
