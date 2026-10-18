import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Hero, HERO_BACKDROP_MS, HERO_REVEAL_MS } from '@/components/Hero';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { INTRO_DONE_EVENT, REPLAY_EVENT } from '@/lib/intro-events';

const items = [
  { id: 1, type: 'movie', title: 'Primeiro', overview: 'Sinopse 1', backdropPath: '/b1.jpg', trailerKey: 'k1', trailerSubtitles: false },
  { id: 2, type: 'tv', title: 'Segundo', overview: 'Sinopse 2', backdropPath: '/b2.jpg', trailerKey: null, trailerSubtitles: false },
  { id: 3, type: 'movie', title: 'Terceiro', overview: 'Sinopse 3', backdropPath: '/b3.jpg', trailerKey: 'k3', trailerSubtitles: true },
];

const flush = () => act(async () => {});
const heading = (name) => screen.getByRole('heading', { level: 2, name });

// O player do YouTube avisa a página por postMessage; estado 0 = vídeo terminou.
function youtubeSays(data) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.youtube-nocookie.com', data: JSON.stringify(data) }));
  });
}

afterEach(() => vi.useRealTimers());

describe('Hero', () => {
  it('toca o trailer inteiro, mudo, sem repetir', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    expect(heading('Primeiro')).toBeInTheDocument();
    const src = screen.getByTestId('hero-video').getAttribute('src');
    expect(src).toContain('/embed/k1');
    expect(src).toContain('mute=1');
    expect(src).not.toContain('loop=1');
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/filme/1');
  });

  it('player do destaque sem controles nem anotações do YouTube', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    const src = new URL(screen.getByTestId('hero-video').getAttribute('src'));
    expect(src.searchParams.get('controls')).toBe('0');
    expect(src.searchParams.get('iv_load_policy')).toBe('3');
  });

  it('a imagem cobre o vídeo até ele tocar há alguns segundos (esconde carregamento e barra de título)', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    const cover = screen.getByTestId('hero-cover');
    expect(cover).toHaveAttribute('data-revealed', 'false');
    await youtubeSays({ event: 'infoDelivery', info: { playerState: 1 } });
    await act(async () => { vi.advanceTimersByTime(HERO_REVEAL_MS - 1); });
    expect(cover).toHaveAttribute('data-revealed', 'false');
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(cover).toHaveAttribute('data-revealed', 'true');
  });

  it('degradê no topo esconde a faixa preta que vem embutida em trailers de cinema', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    expect(screen.getByTestId('hero-top-fade')).toHaveAttribute('aria-hidden', 'true');
  });

  it('passa para o próximo quando o trailer termina', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await youtubeSays({ event: 'onStateChange', info: 0 });
    expect(heading('Segundo')).toBeInTheDocument();
  });

  it('também entende o aviso infoDelivery do player', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await youtubeSays({ event: 'infoDelivery', info: { playerState: 0 } });
    expect(heading('Segundo')).toBeInTheDocument();
  });

  it('ignora mensagens que não vêm do YouTube', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://site-estranho.com', data: JSON.stringify({ event: 'onStateChange', info: 0 }) }));
    });
    expect(heading('Primeiro')).toBeInTheDocument();
  });

  it('título sem trailer fica alguns segundos e passa para o próximo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={[items[1], items[2]]} />);
    await flush();
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(HERO_BACKDROP_MS); });
    expect(heading('Terceiro')).toBeInTheDocument();
  });

  it('trailer sem dublagem brasileira toca com legendas em português', async () => {
    renderWithSettings(<Hero items={[items[2]]} />);
    await flush();
    expect(screen.getByTestId('hero-video').getAttribute('src')).toContain('cc_load_policy=1');
  });

  it('setas voltam e avançam, dando a volta na lista', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo destaque' }));
    expect(heading('Segundo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Destaque anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Destaque anterior' }));
    expect(heading('Terceiro')).toBeInTheDocument();
  });

  it('pontinhos mostram quantos destaques há e levam direto a um deles', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    const dots = screen.getAllByRole('button', { name: /^Destaque \d de 3/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Destaque 3 de 3: Terceiro' }));
    expect(heading('Terceiro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Destaque 3 de 3: Terceiro' })).toHaveAttribute('aria-current', 'true');
  });

  it('com o foco do teclado no destaque, espera o foco sair para avançar', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    fireEvent.focus(screen.getByRole('link', { name: 'Ver detalhes' }));
    await youtubeSays({ event: 'onStateChange', info: 0 });
    expect(heading('Primeiro')).toBeInTheDocument();
    await act(async () => { fireEvent.blur(screen.getByRole('link', { name: 'Ver detalhes' })); });
    expect(heading('Segundo')).toBeInTheDocument();
  });

  it('Pausar destaque para o vídeo e a troca automática', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar destaque' }));
    expect(screen.getByRole('button', { name: 'Retomar destaque' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    await youtubeSays({ event: 'onStateChange', info: 0 });
    await act(async () => { vi.advanceTimersByTime(HERO_BACKDROP_MS * 3); });
    expect(heading('Primeiro')).toBeInTheDocument();
  });

  it('no Modo sensorial calmo nada toca nem troca sozinho, mas as setas funcionam', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={[items[1], items[2]]} />, { calm: true });
    await flush();
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(HERO_BACKDROP_MS * 3); });
    expect(heading('Segundo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo destaque' }));
    expect(heading('Terceiro')).toBeInTheDocument();
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
  });

  it('não começa o trailer antes de as preferências carregarem', () => {
    // renderToString não roda efeitos: é exatamente a primeira pintura, antes de ler o localStorage
    const html = renderToString(<SettingsProvider><Hero items={items} /></SettingsProvider>);
    expect(html).toContain('Primeiro');
    expect(html).not.toContain('hero-video');
  });

  it('rever a abertura para o trailer (e o som dele); ao fim da abertura, o trailer volta mudo', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: 'Ativar som do trailer' }));
    await act(async () => { window.dispatchEvent(new Event(REPLAY_EVENT)); });
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Destaque:/ })).toHaveAttribute('data-hero-sound', 'off');
    await act(async () => { window.dispatchEvent(new Event(INTRO_DONE_EVENT)); });
    expect(screen.getByTestId('hero-video')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Destaque:/ })).toHaveAttribute('data-hero-sound', 'off');
  });

  it('o botão de som liga e desliga o áudio do trailer', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: 'Ativar som do trailer' }));
    expect(screen.getByRole('button', { name: 'Desativar som do trailer' })).toHaveAttribute('aria-pressed', 'true');
    // avisa o resto do site (protetor de tela) que alguém está ouvindo o trailer
    expect(screen.getByRole('region', { name: /^Destaque:/ })).toHaveAttribute('data-hero-sound', 'on');
  });

  it('abre o trailer com som e fecha com Esc', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: 'Ver trailer' }));
    const iframe = screen.getByRole('dialog', { name: 'Trailer de Primeiro' }).querySelector('iframe');
    expect(iframe.getAttribute('src')).toContain('autoplay=1');
    expect(iframe.getAttribute('src')).not.toContain('mute=1');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('com um só item não mostra setas nem pontinhos', async () => {
    renderWithSettings(<Hero items={[items[0]]} />);
    await flush();
    expect(screen.queryByRole('button', { name: 'Próximo destaque' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Destaque 1 de 1/ })).not.toBeInTheDocument();
  });

  it('sem itens não mostra nada', () => {
    const { container } = renderWithSettings(<Hero items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
