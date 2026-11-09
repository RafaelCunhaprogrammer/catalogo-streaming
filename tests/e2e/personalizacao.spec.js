import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { prepare, signInDemo } from './helpers';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(tags).exclude('iframe').analyze();
  expect(results.violations.map((v) => `${label} ${v.id}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('personalização: avatares nos perfis, trocar o avatar e escolher a capa da Minha lista', async ({ page }) => {
  test.setTimeout(150000);
  await signInDemo(page, 'Pai');

  // "Quem está assistindo?" com os desenhos no lugar das iniciais.
  await page.goto('/perfis');
  await expect(page.locator('main svg[data-avatar]')).toHaveCount(3); // fora o do menu do topo
  await expectNoViolations(page, 'perfis');

  // Trocar o avatar do Pai para Jambu e ver no topo do site.
  await page.goto('/perfis/gerenciar');
  await page.getByRole('listitem').filter({ hasText: 'Pai' }).getByRole('button', { name: 'Editar' }).click();
  const form = page.getByRole('form', { name: 'Editar Pai' });
  await form.getByText('Jambu', { exact: true }).click(); // clica no rótulo, como uma pessoa
  await expect(form.getByRole('radio', { name: 'Jambu' })).toBeChecked();
  await expectNoViolations(page, 'formulário do perfil');
  // No celular, as fileiras de avatares rolam de lado sem alargar a página.
  await page.setViewportSize({ width: 390, height: 844 });
  const largura = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(largura[0]).toBeLessThanOrEqual(largura[1]);
  await page.setViewportSize({ width: 1280, height: 720 });
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(form).toBeHidden();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu do perfil Pai' }).locator('svg[data-avatar="jambu"]')).toBeVisible();

  // Um favorito com imagem vira a capa da Minha lista.
  const favoritar = page.getByRole('button', { name: 'Favoritar Série Brilhante' }).first();
  if (await favoritar.isVisible()) await favoritar.click();
  await expect(page.getByRole('button', { name: 'Remover Série Brilhante dos favoritos' }).first()).toBeVisible();
  await page.goto('/minha-lista');
  const capa = page.getByRole('region', { name: 'Capa do perfil' });
  await capa.getByRole('button', { name: 'Editar capa' }).click();
  const painel = page.getByRole('dialog', { name: 'Capa do perfil' });
  await painel.getByRole('radio', { name: 'Filme ou série favorito' }).check();
  await painel.getByLabel('Favorito da capa').selectOption({ label: 'Série Brilhante' });
  await expectNoViolations(page, 'painel da capa');
  await painel.getByRole('button', { name: 'Salvar' }).click();
  await expect(painel).toBeHidden();
  await expect(capa).toHaveAttribute('data-cover', 'imagem');
  // A cor veio da imagem servida pelo TMDB simulado.
  await expect(page.locator('[data-cover-accent="true"]')).toHaveCount(1);
  await expectNoViolations(page, 'Minha lista com capa');

  // Voltar para a página padrão.
  await capa.getByRole('button', { name: 'Editar capa' }).click();
  await painel.getByRole('radio', { name: 'Usar página padrão' }).check();
  await painel.getByRole('button', { name: 'Salvar' }).click();
  await expect(painel).toBeHidden();
  await expect(capa).toHaveAttribute('data-cover', 'padrao');
});

// Lista os arquivos (caminhos relativos) guardados na pasta local de fotos.
function arquivosDeFotos() {
  const raiz = path.resolve('.data/fotos');
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(raiz, path.join(e.parentPath ?? e.path, e.name)));
}

test('foto própria: escolher, recortar, salvar, aparecer no topo e ser apagada ao trocar de avatar', async ({ page }) => {
  test.skip(!!process.env.BLOB_READ_WRITE_TOKEN, 'Este teste confere a pasta local de fotos; com BLOB_READ_WRITE_TOKEN definido as fotos iriam para o Blob real.');
  test.setTimeout(150000);
  await signInDemo(page, 'Pai');
  await page.goto('/perfis/gerenciar');
  await page.getByRole('listitem').filter({ hasText: 'Pai' }).getByRole('button', { name: 'Editar' }).click();
  const form = page.getByRole('form', { name: 'Editar Pai' });

  await form.getByLabel('Escolher foto').setInputFiles('tests/fixtures/foto-teste.png');
  await expect(form.getByLabel('Zoom')).toBeVisible();
  await expectNoViolations(page, 'recorte da foto');
  await form.getByRole('button', { name: 'Usar esta foto' }).click();
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(form).toBeHidden();

  await page.goto('/');
  const foto = page.getByRole('button', { name: 'Menu do perfil Pai' }).locator('img');
  await expect(foto).toBeVisible();
  await expect(foto).toHaveAttribute('src', /^\/api\/foto\//);
  const guardadas = arquivosDeFotos();
  expect(guardadas.length).toBeGreaterThan(0);

  // Voltar para um desenho apaga o arquivo da foto.
  await page.goto('/perfis/gerenciar');
  await page.getByRole('listitem').filter({ hasText: 'Pai' }).getByRole('button', { name: 'Editar' }).click();
  const form2 = page.getByRole('form', { name: 'Editar Pai' });
  await form2.getByText('Açaí', { exact: true }).click();
  await form2.getByRole('button', { name: 'Salvar' }).click();
  await expect(form2).toBeHidden();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu do perfil Pai' }).locator('svg[data-avatar="acai"]')).toBeVisible();
  const restantes = arquivosDeFotos();
  for (const f of guardadas) expect(restantes).not.toContain(f);
});
