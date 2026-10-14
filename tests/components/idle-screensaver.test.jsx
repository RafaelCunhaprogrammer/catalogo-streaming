import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithSettings } from '../helpers/render-with-settings';
import { IdleScreensaver, IDLE_MS, IDLE_FADE_MS } from '@/components/IdleScreensaver';

const flush = () => act(async () => {});
const saver = () => screen.queryByTestId('idle-screensaver');

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('IdleScreensaver', () => {
  it('depois de um tempo parado, mostra a abertura muda em loop', async () => {
    renderWithSettings(<IdleScreensaver />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(IDLE_MS - 1); });
    expect(saver()).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(saver()).toBeInTheDocument();
    const video = saver().querySelector('video');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(saver()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Mexa o mouse ou toque para voltar')).toBeInTheDocument();
  });

  it('qualquer movimento faz sumir suavemente e reinicia a contagem', async () => {
    renderWithSettings(<IdleScreensaver />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(IDLE_MS); });
    await act(async () => { fireEvent.mouseMove(window); });
    expect(saver()).toHaveAttribute('data-state', 'saindo');
    await act(async () => { vi.advanceTimersByTime(IDLE_FADE_MS); });
    expect(saver()).not.toBeInTheDocument();
    // a contagem recomeçou no movimento: só volta depois de mais IDLE_MS parado
    await act(async () => { vi.advanceTimersByTime(IDLE_MS - IDLE_FADE_MS - 1000); });
    expect(saver()).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(saver()).toBeInTheDocument();
  });

  it('mexer antes do tempo adia o protetor', async () => {
    renderWithSettings(<IdleScreensaver />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(IDLE_MS - 1000); });
    await act(async () => { fireEvent.keyDown(window, { key: 'a' }); });
    await act(async () => { vi.advanceTimersByTime(IDLE_MS - 1000); });
    expect(saver()).not.toBeInTheDocument();
  });

  it('não aparece com uma janela aberta (trailer, Configurações) nem com o som do destaque ligado', async () => {
    renderWithSettings(<IdleScreensaver />);
    await flush();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    await act(async () => { vi.advanceTimersByTime(IDLE_MS); });
    expect(saver()).not.toBeInTheDocument();
    dialog.remove();

    const hero = document.createElement('section');
    hero.setAttribute('data-hero-sound', 'on');
    document.body.appendChild(hero);
    await act(async () => { vi.advanceTimersByTime(IDLE_MS); });
    expect(saver()).not.toBeInTheDocument();
  });

  it('não aparece no Modo sensorial calmo', async () => {
    renderWithSettings(<IdleScreensaver />, { calm: true });
    await flush();
    await act(async () => { vi.advanceTimersByTime(IDLE_MS * 2); });
    expect(saver()).not.toBeInTheDocument();
  });
});
