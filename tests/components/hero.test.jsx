import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Hero, HERO_ROTATE_MS } from '@/components/Hero';
import { SettingsProvider } from '@/components/settings/SettingsProvider';

const items = [
  { id: 1, type: 'movie', title: 'Primeiro', overview: 'Sinopse 1', backdropPath: '/b1.jpg', trailerKey: 'k1' },
  { id: 2, type: 'tv', title: 'Segundo', overview: 'Sinopse 2', backdropPath: '/b2.jpg', trailerKey: null },
];
const withSubtitles = [{ ...items[0], trailerSubtitles: true }, items[1]];

const flush = () => act(async () => {});

afterEach(() => vi.useRealTimers());

describe('Hero', () => {
  it('mostra o título com o trailer automático e mudo', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
    const video = screen.getByTestId('hero-video');
    expect(video.getAttribute('src')).toContain('/embed/k1');
    expect(video.getAttribute('src')).toContain('mute=1');
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/filme/1');
  });

  it('trailer sem dublagem brasileira toca com legendas em português', async () => {
    renderWithSettings(<Hero items={withSubtitles} />);
    await flush();
    expect(screen.getByTestId('hero-video').getAttribute('src')).toContain('cc_load_policy=1');
  });

  it('no Modo sensorial calmo não toca o trailer sozinho', async () => {
    renderWithSettings(<Hero items={items} />, { calm: true });
    await flush();
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver trailer' })).toBeInTheDocument();
  });

  it('não começa o trailer antes de as preferências carregarem', () => {
    // renderToString não roda efeitos: é exatamente a primeira pintura, antes de ler o localStorage
    const html = renderToString(<SettingsProvider><Hero items={items} /></SettingsProvider>);
    expect(html).toContain('Primeiro');
    expect(html).not.toContain('hero-video');
  });

  it('troca de destaque a cada 15 segundos', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS); });
    expect(screen.getByRole('heading', { name: 'Segundo' })).toBeInTheDocument();
  });

  it('não troca de destaque no Modo sensorial calmo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />, { calm: true });
    await flush();
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS * 2); });
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
  });

  it('o botão de som liga e desliga o áudio do trailer', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    const sound = screen.getByRole('button', { name: 'Ativar som do trailer' });
    await userEvent.click(sound);
    expect(screen.getByRole('button', { name: 'Desativar som do trailer' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('abre o trailer com som e fecha com Esc', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: 'Ver trailer' }));
    const dialog = screen.getByRole('dialog', { name: 'Trailer de Primeiro' });
    const iframe = dialog.querySelector('iframe');
    expect(iframe.getAttribute('src')).toContain('autoplay=1');
    expect(iframe.getAttribute('src')).not.toContain('mute=1');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não troca de destaque enquanto o foco do teclado está nele', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    fireEvent.focus(screen.getByRole('link', { name: 'Ver detalhes' }));
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS * 2); });
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
    fireEvent.blur(screen.getByRole('link', { name: 'Ver detalhes' }));
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS); });
    expect(screen.getByRole('heading', { name: 'Segundo' })).toBeInTheDocument();
  });

  it('o botão Pausar destaque para a troca e o vídeo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar destaque' }));
    expect(screen.getByRole('button', { name: 'Retomar destaque' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS * 2); });
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
  });

  it('sem itens não mostra nada', () => {
    const { container } = renderWithSettings(<Hero items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
