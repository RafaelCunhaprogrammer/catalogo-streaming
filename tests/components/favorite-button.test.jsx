import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosterCard } from '@/components/PosterCard';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { markTitleAction } from '@/lib/actions/listas';
import { verifyPinAction } from '@/lib/actions/conta';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }), usePathname: () => '/' }));
vi.mock('@/lib/actions/listas', () => ({ markTitleAction: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

const duna = { id: 438631, type: 'movie', title: 'Duna', year: 2021, posterPath: null, rating: 8 };
const saved = { favorite: true, status: null, season: null, episode: null };

function setup(extra = {}) {
  return render(
    <ListsProvider initialMarks={{}}>
      <PosterCard title={{ ...duna, ...extra }} />
    </ListsProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('favoritar pelo cartaz', () => {
  it('sem provedor, o cartaz não tem o botão', () => {
    render(<PosterCard title={duna} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('o coração fica fora do link e anuncia a mudança', async () => {
    markTitleAction.mockResolvedValue({ ok: true, mark: saved });
    setup();
    const button = screen.getByRole('button', { name: 'Favoritar Duna' });
    expect(screen.getByRole('link').contains(button)).toBe(false);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    const on = screen.getByRole('button', { name: 'Remover Duna dos favoritos' });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Duna adicionado aos favoritos'));
    expect(markTitleAction).toHaveBeenCalledWith('movie', 438631, { favorite: true });
  });

  it('desfaz e avisa quando o servidor recusa', async () => {
    markTitleAction.mockResolvedValue({ ok: false, error: 'erro' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Favoritar Duna' }));
    expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoritar Duna' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('avisa o limite de 500 títulos', async () => {
    markTitleAction.mockResolvedValue({ ok: false, error: 'limite' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Favoritar Duna' }));
    expect(await screen.findByText('Sua lista chegou ao limite de 500 títulos. Remova alguns para adicionar novos.')).toBeInTheDocument();
  });

  it('sem perfil ativo na ação, leva para escolher o perfil', async () => {
    markTitleAction.mockResolvedValue({ ok: false, error: 'perfil' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Favoritar Duna' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/perfis'));
  });

  it('cliques rápidos com ação lenta: no máximo 2 envios e o último é o estado final', async () => {
    let release;
    markTitleAction.mockImplementationOnce(() => new Promise((r) => { release = () => r({ ok: true, mark: saved }); }));
    markTitleAction.mockResolvedValue({ ok: true, mark: saved });
    setup();
    const click = () => userEvent.click(screen.getByRole('button', { name: /Duna/ }));
    await click();
    await click();
    await click();
    expect(markTitleAction).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(markTitleAction).toHaveBeenCalledTimes(2));
    expect(markTitleAction.mock.calls.length).toBeLessThanOrEqual(2);
    expect(markTitleAction.mock.calls.at(-1)[2]).toEqual({ favorite: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover Duna dos favoritos' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('pede o PIN e repete a ação depois dele', async () => {
    markTitleAction.mockResolvedValueOnce({ ok: false, error: 'pin' }).mockResolvedValueOnce({ ok: true, mark: saved });
    verifyPinAction.mockResolvedValue({ ok: true });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Favoritar Duna' }));
    const dialog = await screen.findByRole('dialog', { name: /Área de adultos/ });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoritar Duna' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(markTitleAction).toHaveBeenCalledTimes(2));
    expect(markTitleAction).toHaveBeenLastCalledWith('movie', 438631, { favorite: true });
    expect(verifyPinAction).toHaveBeenCalledWith({ pin: '1234', purpose: 'titulo', titleKey: 'movie-438631' });
    expect(await screen.findByRole('button', { name: 'Remover Duna dos favoritos' })).toBeInTheDocument();
  });

  it('dois cartazes do mesmo título dividem uma só fila: nunca há envios simultâneos', async () => {
    let active = 0;
    let overlapped = false;
    const releases = [];
    markTitleAction.mockImplementation(() => new Promise((resolve) => {
      active += 1;
      if (active > 1) overlapped = true;
      const index = releases.length;
      releases.push(() => { active -= 1; resolve({ ok: true, mark: { ...saved, favorite: index === 0 } }); });
    }));
    render(
      <ListsProvider initialMarks={{}}>
        <PosterCard title={duna} />
        <PosterCard title={duna} />
      </ListsProvider>,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Favoritar Duna' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: /Duna/ })[1]);
    expect(markTitleAction).toHaveBeenCalledTimes(1);
    releases[0]();
    await waitFor(() => expect(markTitleAction).toHaveBeenCalledTimes(2));
    expect(markTitleAction.mock.calls[1][2]).toEqual({ favorite: false });
    releases[1]();
    await waitFor(() => screen.getAllByRole('button', { name: 'Favoritar Duna' }).forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'false')));
    expect(screen.getAllByRole('button', { name: 'Favoritar Duna' })).toHaveLength(2);
    expect(overlapped).toBe(false);
  });

  it('adota as marcações novas do servidor para títulos parados', () => {
    const { rerender } = render(
      <ListsProvider initialMarks={{}}>
        <PosterCard title={duna} />
      </ListsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Favoritar Duna' })).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <ListsProvider initialMarks={{ 'movie-438631': saved }}>
        <PosterCard title={duna} />
      </ListsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Remover Duna dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
  });
});
