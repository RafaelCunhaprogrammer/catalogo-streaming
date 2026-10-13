import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Nada de rede externa: YouTube e imagens do TMDB ficam bloqueados nos testes.
async function blockExternal(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
}

async function skipEntry(page, prefs) {
  await page.addInitScript((saved) => {
    sessionStorage.setItem('paidegua:abertura', '1');
    if (saved && !localStorage.getItem('catalogo:prefs')) localStorage.setItem('catalogo:prefs', JSON.stringify(saved));
  }, prefs ?? null);
}

test.describe('abertura', () => {
  test('a abertura do Ver-o-Peso aparece, some sozinha e não volta na mesma visita', async ({ page }) => {
    await blockExternal(page);
    await page.goto('/');
    const intro = page.getByRole('dialog', { name: "Abertura do Pai d'Égua" });
    await expect(intro).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toHaveCount(0);
    await expect(intro).toBeHidden({ timeout: 8000 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Como você quer se sentir hoje?' })).toBeVisible();
    await expect(intro).toHaveCount(0);
  });
});

test.describe('catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternal(page);
  });

  test('Início mostra destaque, humores e fileiras', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Destaque: Aventura Neon: A Longa Jornada do Herói Esquecido' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Relaxar/ })).toHaveAttribute('href', '/explorar?humor=relaxar');
    await expect(page.getByRole('heading', { name: 'Em alta na Netflix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Terror' })).toBeVisible();
  });

  test('setas do destaque voltam e avançam com cliques reais', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 640 });
    const hero = page.getByRole('region', { name: /^Destaque:/ });
    await expect(hero).toHaveAttribute('aria-label', 'Destaque: Aventura Neon: A Longa Jornada do Herói Esquecido');
    await page.getByRole('button', { name: 'Destaque anterior' }).click();
    await expect(hero).not.toHaveAttribute('aria-label', 'Destaque: Aventura Neon: A Longa Jornada do Herói Esquecido');
    await page.getByRole('button', { name: 'Próximo destaque' }).click();
    await expect(hero).toHaveAttribute('aria-label', 'Destaque: Aventura Neon: A Longa Jornada do Herói Esquecido');
  });

  test('setas do destaque não ficam por cima do título e só aparecem ao passar o mouse', async ({ page }) => {
    await skipEntry(page);
    await page.setViewportSize({ width: 1280, height: 640 });
    await page.goto('/');
    const back = page.getByRole('button', { name: 'Destaque anterior' });
    const title = page.getByRole('heading', { level: 2, name: /Aventura Neon/ });
    const a = await back.boundingBox();
    const b = await title.boundingBox();
    const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps).toBe(false);
    await page.mouse.move(5, 5);
    await expect(back).toHaveCSS('opacity', '0');
    await page.getByRole('region', { name: /^Destaque:/ }).hover();
    await expect(back).toHaveCSS('opacity', '1');
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

  test('resultados da busca têm Todos, Filmes e Séries, e "Ver todos" responde na hora', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('combobox', { name: 'Buscar filmes e séries' }).fill('Aventura');
    await page.getByRole('link', { name: 'Ver todos os resultados' }).click();
    await expect(page).toHaveURL(/\/busca\?q=Aventura$/);
    const tipos = page.getByRole('navigation', { name: 'Tipo de resultado' });
    await expect(tipos.getByRole('link', { name: 'Todos' })).toHaveAttribute('aria-current', 'page');
    await tipos.getByRole('link', { name: 'Filmes' }).click();
    await expect(page).toHaveURL(/\/busca\?q=Aventura&tipo=filme$/);
    await expect(page.getByRole('link', { name: /Aventura Neon/ }).first()).toBeVisible();
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
    await page.getByRole('navigation', { name: 'Tipo' }).getByRole('link', { name: 'Séries' }).click();
    await expect(page).toHaveURL(/tipo=serie/);
    await expect(page.getByRole('link', { name: /Série Brilhante/ })).toBeVisible();
  });

  test('o modo de cor escolhido continua depois de recarregar', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('button', { name: 'Abrir configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).locator('label', { has: page.getByRole('radio', { name: 'Claro' }) }).click();
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
