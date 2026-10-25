import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyListView } from '@/components/lists/MyListView';
import { UndoToast } from '@/components/lists/UndoToast';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { markTitleAction } from '@/lib/actions/listas';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh, push: vi.fn() }), usePathname: () => '/minha-lista' }));
vi.mock('@/lib/actions/listas', () => ({ markTitleAction: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

const base = { posterPath: null, year: 2021, favoriteAt: null, statusAt: null, locked: false };
const all = [
  { ...base, id: 1, type: 'movie', title: 'Duna', favorite: true, status: 'nenhum', favoriteAt: '2026-01-02T00:00:00Z' },
  { ...base, id: 2, type: 'tv', title: 'Arcane', favorite: true, status: 'assistindo', favoriteAt: '2026-01-03T00:00:00Z', statusAt: '2026-02-01T00:00:00Z' },
  { ...base, id: 4, type: 'movie', title: 'Bravo', favorite: false, status: 'assistindo', statusAt: '2026-01-01T00:00:00Z' },
];

const marks = Object.fromEntries(all.map((i) => [`${i.type}-${i.id}`, { favorite: i.favorite, status: i.status, season: null, episode: null }]));

function setup(list = all, initialTab = 'favoritos') {
  return render(
    <ListsProvider initialMarks={marks}>
      <MyListView items={list} initialTab={initialTab} />
    </ListsProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Minha lista', () => {
  it('mostra as abas com contagem e troca com as setas e o endereço', async () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Favoritos (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Assistindo (2)' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Já assisti (0)' })).toBeInTheDocument();
    screen.getByRole('tab', { name: 'Favoritos (2)' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Assistindo (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Assistindo (2)' })).toHaveFocus();
    expect(replace).toHaveBeenCalledWith('/minha-lista?aba=assistindo', { scroll: false });
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('filtra por tipo e ordena', async () => {
    setup();
    const panel = screen.getByRole('tabpanel');
    const names = () => within(panel).getAllByRole('link').map((a) => a.textContent.trim()).filter(Boolean);
    expect(names()[0]).toContain('Arcane');
    await userEvent.click(screen.getByRole('button', { name: 'A–Z' }));
    expect(names()[0]).toContain('Arcane');
    await userEvent.click(screen.getByRole('button', { name: 'Filmes' }));
    expect(within(panel).queryByRole('link', { name: /Arcane/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Duna/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Séries' }));
    expect(within(panel).getByRole('link', { name: /Arcane/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Séries' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('aba vazia explica e leva a Explorar', () => {
    setup([]);
    expect(screen.getByText('Você ainda não tem favoritos. Toque no ♡ em qualquer título.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explorar/ })).toHaveAttribute('href', '/explorar');
  });

  it('remove da lista e desfaz com os valores anteriores', async () => {
    markTitleAction.mockResolvedValueOnce({ ok: true, mark: { favorite: false, status: 'nenhum', season: null, episode: null } });
    markTitleAction.mockResolvedValueOnce({ ok: true, mark: { favorite: true, status: 'nenhum', season: null, episode: null } });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Remover Duna desta lista' }));
    expect(markTitleAction).toHaveBeenCalledWith('movie', 1, { favorite: false });
    expect(screen.queryByRole('link', { name: /Duna/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Favoritos (1)' })).toBeInTheDocument();
    expect(screen.getByText(/Removido/)).toBeInTheDocument();
    await waitFor(() => expect(markTitleAction).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(markTitleAction).toHaveBeenLastCalledWith('movie', 1, { favorite: true }));
    expect(await screen.findByRole('button', { name: 'Remover Duna desta lista' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('desfazer em Assistindo restaura situação e posição', async () => {
    markTitleAction.mockResolvedValue({ ok: true, mark: { favorite: false, status: 'nenhum', season: null, episode: null } });
    render(
      <ListsProvider initialMarks={{ 'movie-4': { favorite: false, status: 'assistindo', season: 2, episode: 3 } }}>
        <MyListView items={[all[2]]} initialTab="assistindo" />
      </ListsProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover Bravo desta lista' }));
    expect(markTitleAction).toHaveBeenCalledWith('movie', 4, { status: 'nenhum' });
    await waitFor(() => expect(markTitleAction).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(markTitleAction).toHaveBeenLastCalledWith('movie', 4, { status: 'assistindo', season: 2, episode: 3 }));
  });

  it('título bloqueado aparece como cartaz com cadeado', () => {
    setup([{ ...all[0], locked: true }]);
    expect(screen.getByRole('button', { name: /Duna.*bloqueado/ })).toBeInTheDocument();
  });

  it('ao voltar para a aba do navegador, atualiza os dados', () => {
    setup();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(refresh).toHaveBeenCalled();
  });
});

describe('UndoToast', () => {
  it('fecha sozinho depois do tempo', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<UndoToast message="Removido" onUndo={vi.fn()} onClose={onClose} seconds={6} />);
    act(() => { vi.advanceTimersByTime(5900); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
