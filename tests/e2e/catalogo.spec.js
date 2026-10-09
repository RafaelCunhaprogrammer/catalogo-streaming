import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Nada de rede externa: YouTube e imagens do TMDB ficam bloqueados nos testes.
async function blockExternal(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
}

async function skipEntry(page, prefs) {
  await page.addInitScript((saved) => {
    sessionStorage.setItem('catalogo:entrou', '1');
    if (saved && !localStorage.getItem('catalogo:prefs')) localStorage.setItem('catalogo:prefs', JSON.stringify(saved));
  }, prefs ?? null);
}

test.describe('tela de entrada', () => {
  test('aparece no Início e some ao clicar em Entrar', async ({ page }) => {
    await blockExternal(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Como você quer se sentir hoje?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeHidden();
  });
});

test.describe('catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternal(page);
  });

  test('Início mostra destaque, humores e fileiras', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Destaque: Aventura Neon' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Relaxar/ })).toHaveAttribute('href', '/explorar?humor=relaxar');
    await expect(page.getByRole('heading', { name: 'Em alta na Netflix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Terror' })).toBeVisible();
  });

  test('busca mostra só títulos disponíveis e Enter abre os resultados', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('combobox', { name: 'Buscar filmes e séries' }).fill('Aventura');
    await expect(page.getByRole('search').getByRole('link', { name: 'Aventura Neon (2024)', exact: true })).toBeVisible();
    await expect(page.getByText('Aventura Indisponível')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Buscar filmes e séries' }).press('Enter');
    await expect(page).toHaveURL(/\/busca\?q=Aventura$/);
    await expect(page.getByRole('heading', { name: 'Resultados para “Aventura”' })).toBeVisible();
  });

  test('página do filme mostra detalhes, onde assistir e recomendações', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/filme/101');
    await expect(page.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeVisible();
    await expect(page.getByText('2h 8min')).toBeVisible();
    await expect(page.getByLabel('Classificação indicativa: 12 anos')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Onde assistir' }).getByRole('img', { name: 'Netflix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Você também pode gostar' })).toBeVisible();
  });

  test('página da série mostra temporadas', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/serie/201');
    await expect(page.getByText('2 temporadas')).toBeVisible();
    await expect(page.getByLabel('Classificação indicativa: 14 anos')).toBeVisible();
  });

  test('título inexistente mostra Não encontrado', async ({ page }) => {
    await skipEntry(page);
    const response = await page.goto('/filme/999');
    expect(response.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Não encontrado' })).toBeVisible();
  });

  test('Explorar troca para séries pelo endereço', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('link', { name: 'Séries' }).click();
    await expect(page).toHaveURL(/tipo=serie/);
    await expect(page.getByRole('link', { name: /Série Brilhante/ })).toBeVisible();
  });

  test('o modo de cor escolhido continua depois de recarregar', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('button', { name: 'Abrir configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).getByText('Claro', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'claro');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'claro');
  });

  test('Meus streamings filtra as fileiras do Início', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir configurações' }).click();
    await page.getByRole('checkbox', { name: 'Netflix' }).check();
    await page.getByRole('button', { name: 'Fechar configurações' }).click();
    await expect(page.getByRole('heading', { name: 'Em alta na Globoplay' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Em alta na Netflix' })).toBeVisible();
  });
});

test.describe('acessibilidade (WCAG 2.1 AA)', () => {
  for (const theme of ['escuro', 'claro']) {
    for (const path of ['/', '/explorar', '/filme/101']) {
      test(`${path} no modo ${theme}`, async ({ page }) => {
        await blockExternal(page);
        await skipEntry(page, { version: 1, theme });
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('iframe')
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
      });
    }
  }
});
