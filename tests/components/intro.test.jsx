import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithSettings } from '../helpers/render-with-settings';
import {
  IntroScene, INTRO_SESSION_KEY, INTRO_MS, INTRO_CALM_MS, INTRO_MAX_MS, INTRO_VIDEO_SRC, INTRO_FADE_MS, INTRO_LEAD_MS, REPLAY_EVENT, INTRO_DONE_EVENT,
} from '@/components/IntroScene';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const flush = () => act(async () => {});
const intro = () => screen.queryByRole('dialog', { name: "Abertura do Pai d'Égua" });

// O jsdom não toca vídeo: simulamos o play() do navegador.
let playMock;
beforeEach(() => {
  pathname = '/';
  playMock = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('IntroScene', () => {
  it('toca o vídeo de abertura com som e, quando termina, segue direto para a transição', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />);
    await flush();
    const video = screen.getByTestId('intro-video');
    expect(video).toHaveAttribute('src', INTRO_VIDEO_SRC);
    expect(playMock).toHaveBeenCalled();
    expect(video.muted).toBe(false);
    expect(screen.queryByRole('button', { name: 'Ativar som' })).not.toBeInTheDocument();
    await act(async () => { fireEvent.ended(video); });
    expect(intro()).toHaveAttribute('data-leaving', 'true');
    const done = vi.fn();
    window.addEventListener(INTRO_DONE_EVENT, done);
    await act(async () => { vi.advanceTimersByTime(INTRO_FADE_MS); });
    window.removeEventListener(INTRO_DONE_EVENT, done);
    expect(intro()).not.toBeInTheDocument();
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBe('1');
    // avisa o destaque que pode voltar a tocar o trailer
    expect(done).toHaveBeenCalled();
  });

  it('a transição começa no último segundo do vídeo, sem pausa no fim, e libera a cobertura do Início', async () => {
    document.documentElement.setAttribute('data-intro', 'pending');
    renderWithSettings(<IntroScene />);
    await flush();
    const video = screen.getByTestId('intro-video');
    Object.defineProperty(video, 'duration', { value: 6, configurable: true });
    Object.defineProperty(video, 'currentTime', { value: 4.5, configurable: true, writable: true });
    fireEvent.timeUpdate(video);
    expect(intro()).toHaveAttribute('data-leaving', 'false');
    expect(document.documentElement).toHaveAttribute('data-intro', 'pending');
    video.currentTime = 6 - INTRO_LEAD_MS / 1000;
    await act(async () => { fireEvent.timeUpdate(video); });
    expect(intro()).toHaveAttribute('data-leaving', 'true');
    expect(document.documentElement).not.toHaveAttribute('data-intro');
    // Transição longa e suave para o Início (pedido do Rafael: 2,5 s parecia rápido).
    expect(INTRO_FADE_MS).toBeGreaterThanOrEqual(4000);
  });

  it('se o navegador bloquear o som, toca mudo e oferece o botão Ativar som', async () => {
    playMock.mockRejectedValueOnce(new DOMException('bloqueado', 'NotAllowedError')).mockResolvedValue(undefined);
    renderWithSettings(<IntroScene />);
    await flush();
    const video = screen.getByTestId('intro-video');
    expect(video.muted).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    expect(video.muted).toBe(false);
    expect(intro()).toHaveAttribute('data-leaving', 'false');
    expect(screen.queryByRole('button', { name: 'Ativar som' })).not.toBeInTheDocument();
  });

  it('se o vídeo travar, a abertura some sozinha depois de um tempo máximo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(INTRO_MAX_MS + INTRO_FADE_MS); });
    expect(intro()).not.toBeInTheDocument();
  });

  it('se o vídeo não carregar, mostra a cena desenhada do Ver-o-Peso no lugar', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />);
    await flush();
    await act(async () => { fireEvent.error(screen.getByTestId('intro-video')); });
    expect(screen.getByRole('img', { name: /Mercado de Ferro do Ver-o-Peso/ })).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(INTRO_MS + INTRO_FADE_MS); });
    expect(intro()).not.toBeInTheDocument();
  });

  it('dá para pular com o botão, com um clique na cena ou com Esc, com a mesma transição', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pular abertura' }));
    expect(intro()).toHaveAttribute('data-leaving', 'true');
    await act(async () => { vi.advanceTimersByTime(INTRO_FADE_MS); });
    expect(intro()).not.toBeInTheDocument();

    sessionStorage.clear();
    const { unmount } = renderWithSettings(<IntroScene />);
    await flush();
    fireEvent.keyDown(window, { key: 'Escape' });
    await act(async () => { vi.advanceTimersByTime(INTRO_FADE_MS); });
    expect(intro()).not.toBeInTheDocument();
    unmount();
  });

  it('clicar na logo no Início (evento de rever) mostra a abertura de novo', async () => {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).not.toBeInTheDocument();
    await act(async () => { window.dispatchEvent(new Event(REPLAY_EVENT)); });
    expect(intro()).toBeInTheDocument();
    expect(screen.getByTestId('intro-video')).toBeInTheDocument();
  });

  it('não aparece de novo na mesma visita', async () => {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).not.toBeInTheDocument();
  });

  it('?abertura=1 mostra a abertura de novo, para revisar', async () => {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    window.history.pushState({}, '', '/?abertura=1');
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('cena de reserva: barco e garça atravessam a tela e o sol fica atrás do mercado', async () => {
    renderWithSettings(<IntroScene />);
    await flush();
    await act(async () => { fireEvent.error(screen.getByTestId('intro-video')); });
    const svg = screen.getByRole('img', { name: /Mercado de Ferro do Ver-o-Peso/ });
    const order = [...svg.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part'));
    expect(order.indexOf('sol')).toBeLessThan(order.indexOf('mercado'));
    expect(order).toEqual(expect.arrayContaining(['garca', 'barco', 'fumaca']));
    expect(svg.querySelectorAll('[data-part="torre"]')).toHaveLength(4);
  });

  it('também aparece em "Quem está assistindo?" (depois de entrar, a primeira tela é a dos perfis)', async () => {
    pathname = '/perfis';
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).toBeInTheDocument();
  });

  it('não aparece em links diretos para páginas internas', async () => {
    pathname = '/filme/101';
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).not.toBeInTheDocument();
  });

  it('no Modo sensorial calmo mostra o vídeo parado por pouco tempo, sem tocar', async () => {
    vi.useFakeTimers();
    renderWithSettings(<IntroScene />, { calm: true });
    await flush();
    expect(intro()).toBeInTheDocument();
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('intro-video').muted).toBe(true);
    await act(async () => { vi.advanceTimersByTime(INTRO_CALM_MS); });
    expect(intro()).not.toBeInTheDocument();
    expect(INTRO_CALM_MS).toBeLessThan(INTRO_MS);
  });
});
