import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TitleActions } from '@/components/lists/TitleActions';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { markTitleAction, nextEpisodeAction, seasonEpisodesAction } from '@/lib/actions/listas';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/' }));
vi.mock('@/lib/actions/listas', () => ({ markTitleAction: vi.fn(), nextEpisodeAction: vi.fn(), seasonEpisodesAction: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

const movie = { id: 1, type: 'movie', title: 'Duna' };
const show = { id: 2, type: 'tv', title: 'Serie X' };
const seasons = [{ number: 1, episodes: 10 }, { number: 2, episodes: 8 }];
const mk = (over) => ({ favorite: false, status: 'nenhum', season: null, episode: null, ...over });

function setup(title, props = {}, marks = {}) {
  return render(
    <ListsProvider initialMarks={marks}>
      <TitleActions title={title} seasons={props.seasons ?? []} />
    </ListsProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  seasonEpisodesAction.mockResolvedValue({ ok: true, episodes: [{ number: 1, name: 'Piloto' }, { number: 5, name: 'Chegada' }] });
});

describe('TitleActions', () => {
  it('sem perfil ativo não renderiza nada', () => {
    const { container } = render(<TitleActions title={movie} seasons={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('filme: três botões com aria-pressed; Já assisti desmarca Assistindo; clicar de novo desmarca', async () => {
    markTitleAction.mockImplementation(async (t, i, c) => ({ ok: true, mark: mk(c) }));
    setup(movie, {}, { 'movie-1': mk({ status: 'assistindo' }) });
    expect(screen.getByRole('button', { name: 'Favoritar Duna' })).toBeInTheDocument();
    const watching = screen.getByRole('button', { name: 'Assistindo Duna' });
    const watched = screen.getByRole('button', { name: 'Já assisti Duna' });
    expect(watching).toHaveAttribute('aria-pressed', 'true');
    expect(watched).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(watched);
    expect(screen.getByRole('button', { name: 'Assistindo Duna' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Já assisti Duna' })).toHaveAttribute('aria-pressed', 'true');
    expect(markTitleAction).toHaveBeenCalledWith('movie', 1, { status: 'assistido' });
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Duna marcado como Já assisti'));
    await userEvent.click(screen.getByRole('button', { name: 'Já assisti Duna' }));
    expect(screen.getByRole('button', { name: 'Já assisti Duna' })).toHaveAttribute('aria-pressed', 'false');
    expect(markTitleAction).toHaveBeenLastCalledWith('movie', 1, { status: 'nenhum' });
  });

  it('série em Assistindo mostra Onde você parou com os episódios do servidor', async () => {
    setup(show, { seasons }, { 'tv-2': mk({ status: 'assistindo', season: 1, episode: 5 }) });
    expect(screen.getByRole('group', { name: 'Onde você parou' })).toBeInTheDocument();
    expect(screen.getByLabelText('Temporada')).toHaveValue('1');
    expect(await screen.findByRole('option', { name: '5 – Chegada' })).toBeInTheDocument();
    expect(screen.getByLabelText('Episódio')).toHaveValue('5');
    expect(seasonEpisodesAction).toHaveBeenCalledWith(2, 1);
  });

  it('+1 episódio chama nextEpisodeAction; ao terminar pergunta se marca Já assisti', async () => {
    nextEpisodeAction.mockResolvedValue({ ok: true, mark: mk({ status: 'assistindo', season: 2, episode: 8 }), finished: true });
    markTitleAction.mockResolvedValue({ ok: true, mark: mk({ status: 'assistido' }) });
    setup(show, { seasons }, { 'tv-2': mk({ status: 'assistindo', season: 2, episode: 8 }) });
    await userEvent.click(screen.getByRole('button', { name: '+1 episódio' }));
    expect(nextEpisodeAction).toHaveBeenCalledWith(2);
    expect(await screen.findByText('Marcar como Já assisti?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText('Marcar como Já assisti?')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1 episódio' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sim' }));
    expect(markTitleAction).toHaveBeenCalledWith('tv', 2, { status: 'assistido' });
  });

  it('série sem temporadas em Assistindo não mostra Onde você parou', () => {
    setup(show, { seasons: [] }, { 'tv-2': mk({ status: 'assistindo' }) });
    expect(screen.queryByText('Onde você parou')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistindo Serie X' })).toBeInTheDocument();
  });
});
