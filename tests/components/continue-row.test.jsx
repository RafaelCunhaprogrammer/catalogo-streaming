import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContinueCard } from '@/components/lists/ContinueCard';
import { ContinueRow, toContinueItem } from '@/components/lists/ContinueRow';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { nextEpisodeAction } from '@/lib/actions/listas';
import { continueWatching } from '@/lib/lists/store';
import { getTitleBasics } from '@/lib/tmdb/catalog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/actions/listas', () => ({ markTitleAction: vi.fn(), nextEpisodeAction: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));
vi.mock('@/lib/tmdb/catalog', () => ({ getTitleBasics: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/lists/store', () => ({ continueWatching: vi.fn() }));

const item = (extra = {}) => ({
  id: 201, type: 'tv', title: 'Arcane', backdropPath: '/b.jpg', season: 2, episode: 5, lastSeason: 2,
  provider: { name: 'Netflix', href: 'https://www.netflix.com/search?q=Arcane' }, newEpisodes: false, locked: false, ...extra,
});
const marks = (i, mark = {}) => ({ [`${i.type}-${i.id}`]: { favorite: false, status: 'assistindo', season: i.season, episode: i.episode, ...mark } });
const setup = (i, mark) => render(<ListsProvider initialMarks={marks(i, mark)}><ContinueCard item={i} /></ListsProvider>);

beforeEach(() => vi.clearAllMocks());

describe('ContinueCard', () => {
  it('série com plataforma: posição, link e +1 episódio', () => {
    setup(item());
    expect(screen.getByText('Parei no T2 E5')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Assistir Arcane na Netflix' });
    expect(link).toHaveAttribute('href', 'https://www.netflix.com/search?q=Arcane');
    expect(screen.getByRole('button', { name: '+1 episódio' })).toBeInTheDocument();
  });

  it('sem plataforma, leva para a página do título', () => {
    setup(item({ provider: null }));
    expect(screen.getByRole('link', { name: 'Ver onde assistir' })).toHaveAttribute('href', '/serie/201');
  });

  it('sem imagem de fundo, usa o fundo neon com o nome', () => {
    const { container } = setup(item({ backdropPath: null }));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Arcane').length).toBeGreaterThan(0);
  });

  it('filme: sem posição nem +1 episódio', () => {
    setup(item({ type: 'movie', id: 5, season: null, episode: null }), { season: null, episode: null });
    expect(screen.queryByText(/Parei no/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+1 episódio' })).not.toBeInTheDocument();
  });

  it('mostra Novos episódios fora do link, para leitores de tela', () => {
    setup(item({ newEpisodes: true }));
    const badge = screen.getByText('Novos episódios');
    expect(badge.closest('a')).toBeNull();
    expect(badge.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('Novos episódios some quando +1 leva para a temporada nova', async () => {
    nextEpisodeAction.mockResolvedValue({ ok: true, mark: { favorite: false, status: 'assistindo', season: 3, episode: 1 }, finished: false });
    setup(item({ season: 2, episode: 8, lastSeason: 3, newEpisodes: true }));
    expect(screen.getByText('Novos episódios')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1 episódio' }));
    expect(await screen.findByText('Parei no T3 E1')).toBeInTheDocument();
    expect(screen.queryByText('Novos episódios')).not.toBeInTheDocument();
    expect(screen.queryByText('Marcar como Já assisti?')).not.toBeInTheDocument();
  });

  it('+1 episódio atualiza a posição', async () => {
    nextEpisodeAction.mockResolvedValue({ ok: true, mark: { favorite: false, status: 'assistindo', season: 2, episode: 6 }, finished: false });
    setup(item());
    await userEvent.click(screen.getByRole('button', { name: '+1 episódio' }));
    expect(await screen.findByText('Parei no T2 E6')).toBeInTheDocument();
  });

  it('some quando a marcação deixa de ser Assistindo', () => {
    setup(item(), { status: 'assistido' });
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.queryByText('Arcane')).not.toBeInTheDocument();
  });

  it('bloqueado: sem imagem, link nem posição; pede PIN', () => {
    const { container } = setup(item({ locked: true }));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText(/Parei no/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bloqueado/ })).toBeInTheDocument();
  });
});

describe('toContinueItem', () => {
  const row = (snapshot = {}, extra = {}) => ({
    mediaType: 'tv', tmdbId: 201, season: 2, episode: 8, ...extra,
    snapshot: { title: 'Arcane', backdropPath: '/b.jpg', certification: '12', seasons: [{ number: 1, episodes: 9 }, { number: 2, episodes: 8 }], ...snapshot },
  });
  const viewer = { kids: false, maxRating: null, unlocked: new Set() };
  const details = { providers: [{ id: 8, name: 'Netflix' }], watchLink: 'https://tmdb/x', seasonList: [{ number: 1, episodes: 9 }, { number: 2, episodes: 8 }, { number: 3, episodes: 6 }] };

  it('temporada nova e posição no último episódio da cópia: newEpisodes', () => {
    const r = toContinueItem(row(), details, viewer);
    expect(r.newEpisodes).toBe(true);
    expect(r.provider).toEqual({ name: 'Netflix', href: 'https://www.netflix.com/search?q=Arcane' });
  });

  it('com temporada nova no TMDB, a posição pode ir além da última temporada da cópia', () => {
    expect(toContinueItem(row(), details, viewer).lastSeason).toBe(3);
    expect(toContinueItem(row({}, { season: 3, episode: 1 }), details, viewer)).toMatchObject({ season: 3, newEpisodes: false });
  });

  it('fora do último episódio, não há novos episódios', () => {
    expect(toContinueItem(row({}, { episode: 3 }), details, viewer).newEpisodes).toBe(false);
  });

  it('sem detalhes: sem plataforma', () => {
    const r = toContinueItem(row(), null, viewer);
    expect(r.provider).toBeNull();
    expect(r.newEpisodes).toBe(false);
  });

  it('temporada guardada que não existe mais é limitada à última', () => {
    const r = toContinueItem(row({}, { season: 5 }), null, viewer);
    expect(r.season).toBe(2);
    expect(r.lastSeason).toBe(2);
  });

  it('Kids acima da faixa fica bloqueado, a menos que liberado', () => {
    const kids = { kids: true, maxRating: '10', unlocked: new Set() };
    expect(toContinueItem(row(), details, kids).locked).toBe(true);
    expect(toContinueItem(row(), details, { ...kids, unlocked: new Set(['tv-201']) }).locked).toBe(false);
  });
});

describe('ContinueRow', () => {
  const viewer = { profile: { id: 'p1' }, kids: false, maxRating: null, unlocked: new Set() };
  const mkRow = (n, certification = 'L') => ({
    mediaType: 'tv', tmdbId: n, season: 1, episode: 1,
    snapshot: { title: `S${n}`, backdropPath: '/b.jpg', certification, seasons: [{ number: 1, episodes: 9 }] },
  });

  it('falha no banco: não renderiza nada nem lança erro', async () => {
    continueWatching.mockRejectedValue(new Error('db'));
    await expect(ContinueRow({ viewer })).resolves.toBeNull();
  });

  it('mostra até 20 cartões e consulta o TMDB para todos', async () => {
    continueWatching.mockResolvedValue(Array.from({ length: 20 }, (_, i) => mkRow(i + 1)));
    getTitleBasics.mockResolvedValue(null);
    const el = await ContinueRow({ viewer });
    expect(continueWatching).toHaveBeenCalledWith(undefined, 'p1', 20);
    expect(el.props.children[1].props.children).toHaveLength(20);
    expect(getTitleBasics).toHaveBeenCalledTimes(20);
  });

  it('título bloqueado não consulta o TMDB nem vaza dados', async () => {
    const kids = { ...viewer, kids: true, maxRating: '10' };
    continueWatching.mockResolvedValue([mkRow(9, '16')]);
    getTitleBasics.mockClear();
    const el = await ContinueRow({ viewer: kids });
    expect(getTitleBasics).not.toHaveBeenCalled();
    expect(el.props.children[1].props.children[0].props.item).toEqual({
      id: 9, type: 'tv', title: 'S9', backdropPath: null, season: null, episode: null, lastSeason: null, provider: null, newEpisodes: false, locked: true,
    });
  });
});
