import { test, expect } from '@playwright/test';
import { prepare, signInDemo } from './helpers';

// Do celular pequeno ao desktop, passando pelos tablets em que o topo já quebrou (768 e 820).
const LARGURAS = [320, 360, 390, 768, 820, 1024, 1280];
const VISITANTE = ['/', '/entrar', '/criar-conta', '/esqueci-senha'];
const LOGADO = ['/', '/filmes', '/explorar', '/busca?q=filme', '/minha-lista', '/filme/101', '/serie/201', '/perfis', '/perfis/gerenciar', '/conta'];

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

// Nada pode alargar a página (rolagem para o lado) e os botões do topo ficam dentro da tela.
async function conferir(page, caminho, largura) {
  await page.goto(caminho);
  await page.waitForLoadState('networkidle');
  const medida = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const fora = [...document.querySelectorAll('header button, header a')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > W + 1;
      })
      .map((el) => el.getAttribute('aria-label') || el.textContent.trim());
    return { W, scroll: document.documentElement.scrollWidth, fora };
  });
  expect.soft(medida.scroll, `${caminho} em ${largura}px alarga a página`).toBeLessThanOrEqual(medida.W);
  expect.soft(medida.fora, `${caminho} em ${largura}px tem botão do topo fora da tela`).toEqual([]);
}

test('visitante: sem rolagem para o lado do celular ao desktop', async ({ page }) => {
  test.setTimeout(180000);
  for (const largura of LARGURAS) {
    await page.setViewportSize({ width: largura, height: 800 });
    for (const caminho of VISITANTE) await conferir(page, caminho, largura);
  }
});

test('logado: sem rolagem para o lado do celular ao desktop', async ({ page }) => {
  test.setTimeout(300000);
  await signInDemo(page, 'Pai');
  for (const largura of LARGURAS) {
    await page.setViewportSize({ width: largura, height: 800 });
    for (const caminho of LOGADO) await conferir(page, caminho, largura);
  }
});

test('no celular de 320 px, a logo e os botões do topo cabem numa linha só', async ({ page }) => {
  await signInDemo(page, 'Pai');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/explorar');
  const logo = await page.getByRole('link', { name: /Início$/ }).first().boundingBox();
  const ajustes = await page.getByRole('button', { name: 'Abrir configurações' }).boundingBox();
  expect(Math.abs(logo.y + logo.height / 2 - (ajustes.y + ajustes.height / 2))).toBeLessThan(8);
});

test.describe('tela de toque', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('campos com letra de pelo menos 16 px (o iPhone não dá zoom ao tocar)', async ({ page }) => {
    await signInDemo(page, 'Pai');
    await page.goto('/explorar');
    const tamanhos = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => [el.name || el.type, parseFloat(getComputedStyle(el).fontSize)]),
    );
    expect(tamanhos.length).toBeGreaterThan(0);
    for (const [campo, tamanho] of tamanhos) expect(tamanho, campo).toBeGreaterThanOrEqual(16);
  });
});
