import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { TitlePage, TitleView } from '@/components/TitlePage';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { getTitleBasics, getTitleDetails } from '@/lib/tmdb/catalog';
import { getMark, refreshSnapshot } from '@/lib/lists/store';
import { getTitleRating } from '@/lib/tmdb/ratings';

vi.mock('next/navigation', () => ({ notFound: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), usePathname: () => '/' }));
vi.mock('@/lib/tmdb/catalog', () => ({ getTitleDetails: vi.fn(), getTitleBasics: vi.fn() }));
vi.mock('@/lib/lists/store', () => ({ getMark: vi.fn(), refreshSnapshot: vi.fn(async () => {}) }));
vi.mock('@/lib/db', () => ({ getDb: () => 'db' }));
vi.mock('@/lib/tmdb/ratings', async (orig) => ({ ...(await orig()), getTitleRating: vi.fn() }));
vi.mock('@/lib/actions/listas', () => ({ markTitleAction: vi.fn(), nextEpisodeAction: vi.fn(), seasonEpisodesAction: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

const base = {
  id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, overview: 'Uma aventura.',
  posterPath: '/p.jpg', backdropPath: '/b.jpg', rating: 7.8, genres: ['Ação', 'Aventura'],
  runtime: 128, seasons: null, certification: '12', trailerKey: 'abc', watchLink: 'https://tmdb/watch',
  providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
  cast: [{ id: 1, name: 'Atriz Um', character: 'Heroína', profilePath: null }],
  recommendations: [{ id: 102, type: 'movie', title: 'Outra Aventura', year: 2023, posterPath: null }],
};

describe('TitleView', () => {
  it('mostra os dados principais do filme', () => {
    render(<TitleView title={base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeInTheDocument();
    expect(screen.getByText('2h 8min')).toBeInTheDocument();
    expect(screen.getByLabelText('Classificação indicativa: 12 anos')).toHaveTextContent('12');
    expect(screen.getByText('Uma aventura.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver trailer' })).toBeInTheDocument();
  });

  it('mostra onde assistir com logo e link', () => {
    const { container } = render(<TitleView title={base} />);
    const where = screen.getByRole('region', { name: 'Onde assistir' });
    expect(container.querySelector('img[src="https://image.tmdb.org/t/p/w154/n.png"]')).toBeInTheDocument();
    expect(within(where).getByRole('link', { name: 'Ver detalhes de disponibilidade' })).toHaveAttribute('href', 'https://tmdb/watch');
  });

  it('botão "Assistir na …" abre o título na plataforma (ou a página com os links diretos)', () => {
    render(<TitleView title={{ ...base, providers: [...base.providers, { id: 337, name: 'Disney+', logoPath: null }] }} />);
    const netflix = screen.getByRole('link', { name: /^Assistir na Netflix/ });
    expect(netflix).toHaveAttribute('href', 'https://www.netflix.com/search?q=Aventura%20Neon');
    expect(netflix).toHaveAttribute('target', '_blank');
    // Disney+ não aceita busca pelo endereço: vai para a página de disponibilidade, que tem o link direto.
    expect(screen.getByRole('link', { name: /^Assistir na Disney\+/ })).toHaveAttribute('href', 'https://tmdb/watch');
  });

  it('sinopse justificada, com hifenização para não abrir buracos entre as palavras', () => {
    render(<TitleView title={base} />);
    expect(screen.getByText('Uma aventura.')).toHaveClass('text-justify', 'hyphens-auto');
  });

  it('mostra elenco e recomendações', () => {
    render(<TitleView title={base} />);
    expect(screen.getByText('Atriz Um')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Você também pode gostar' })).toBeInTheDocument();
  });

  it('série mostra temporadas e trata classificação ausente e falta de trailer', () => {
    render(<TitleView title={{ ...base, type: 'tv', runtime: null, seasons: 3, certification: null, trailerKey: null, recommendations: [] }} />);
    expect(screen.getByText('3 temporadas')).toBeInTheDocument();
    expect(screen.getByText('Classificação não informada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver trailer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Você também pode gostar' })).not.toBeInTheDocument();
  });
});

describe('TitlePage: título que saiu do streaming', () => {
  const NOT_FOUND = new Error('NEXT_NOT_FOUND');
  const gone = { ...base, providers: [], watchLink: null, recommendations: [] };
  const adult = { profile: { id: 'p1' }, kids: false, maxRating: null, unlocked: new Set() };
  const saved = { favorite: true, status: 'nenhum', season: null, episode: null, snapshot: { title: 'Aventura Neon' } };
  const show = (el) => render(
    <ListsProvider initialMarks={{ 'movie-101': { favorite: true, status: 'nenhum', season: null, episode: null } }}>{el}</ListsProvider>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    notFound.mockImplementation(() => { throw NOT_FOUND; });
    getTitleDetails.mockResolvedValue(null);
    getTitleBasics.mockResolvedValue(gone);
  });

  it('marcado pelo perfil: a página abre com o aviso e os botões de lista, sem plataformas', async () => {
    getMark.mockResolvedValue(saved);
    show(await TitlePage({ type: 'movie', id: '101', viewer: adult }));
    expect(getMark).toHaveBeenCalledWith('db', 'p1', 'movie', 101);
    expect(screen.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeInTheDocument();
    const where = screen.getByRole('region', { name: 'Onde assistir' });
    expect(within(where).getByText('Este título não está mais em nenhum streaming no Brasil.')).toBeInTheDocument();
    expect(within(where).queryByRole('link', { name: /^Assistir na/ })).not.toBeInTheDocument();
    expect(within(where).getByRole('button', { name: 'Remover Aventura Neon dos favoritos' })).toBeInTheDocument();
    expect(refreshSnapshot).toHaveBeenCalled();
  });

  it('sem marcação, sem perfil ou sumido do TMDB: continua não encontrado', async () => {
    getMark.mockResolvedValue(null);
    await expect(TitlePage({ type: 'movie', id: '101', viewer: adult })).rejects.toBe(NOT_FOUND);
    expect(getTitleBasics).not.toHaveBeenCalled();
    await expect(TitlePage({ type: 'movie', id: '101', viewer: null })).rejects.toBe(NOT_FOUND);
    getMark.mockResolvedValue(saved);
    getTitleBasics.mockResolvedValue(null);
    await expect(TitlePage({ type: 'movie', id: '101', viewer: adult })).rejects.toBe(NOT_FOUND);
  });

  it('Kids: acima da faixa continua pedindo o PIN, sem nada do título', async () => {
    getMark.mockResolvedValue(saved);
    getTitleRating.mockResolvedValue('16');
    const kids = { ...adult, kids: true, maxRating: '10' };
    show(await TitlePage({ type: 'movie', id: '101', viewer: kids }));
    expect(screen.getByText('Este título precisa de um adulto')).toBeInTheDocument();
    expect(screen.queryByText('Uma aventura.')).not.toBeInTheDocument();
  });
});
