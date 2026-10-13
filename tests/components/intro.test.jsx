import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithSettings } from '../helpers/render-with-settings';
import { IntroScene, INTRO_SESSION_KEY, INTRO_MS, INTRO_CALM_MS } from '@/components/IntroScene';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const flush = () => act(async () => {});
const intro = () => screen.queryByRole('dialog', { name: "Abertura do Pai d'Égua" });

beforeEach(() => {
  pathname = '/';
});
afterEach(() => vi.useRealTimers());

describe('IntroScene', () => {
  it('mostra a cena do Ver-o-Peso ao abrir o site e some sozinha no fim', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mercado de Ferro do Ver-o-Peso/ })).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(INTRO_MS); });
    expect(intro()).not.toBeInTheDocument();
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBe('1');
  });

  it('dá para pular com o botão, com um clique na cena ou com Esc', async () => {
    renderWithSettings(<IntroScene />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pular abertura' }));
    expect(intro()).not.toBeInTheDocument();

    sessionStorage.clear();
    const { unmount } = renderWithSettings(<IntroScene />);
    await flush();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(intro()).not.toBeInTheDocument();
    unmount();
  });

  it('não aparece de novo na mesma visita', async () => {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).not.toBeInTheDocument();
  });

  it('não aparece em links diretos para páginas internas', async () => {
    pathname = '/filme/101';
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).not.toBeInTheDocument();
  });

  it('no Modo sensorial calmo mostra a imagem final parada por pouco tempo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />, { calm: true });
    await flush();
    expect(intro()).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(INTRO_CALM_MS); });
    expect(intro()).not.toBeInTheDocument();
    expect(INTRO_CALM_MS).toBeLessThan(INTRO_MS);
  });
});
