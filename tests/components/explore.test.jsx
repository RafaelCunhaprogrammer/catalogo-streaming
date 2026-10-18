import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExploreGrid } from '@/components/ExploreGrid';
import { ExploreFilters } from '@/components/ExploreFilters';
import { parseExploreParams } from '@/lib/explore-params';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('next/form', () => ({ default: ({ children, ...props }) => <form {...props}>{children}</form> }));

let observerCallback;
beforeEach(() => {
  observerCallback = null;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb) { observerCallback = cb; }
    observe() {}
    disconnect() {}
  });
});

const filters = (query = '') => parseExploreParams(new URLSearchParams(query));
const title = (id) => ({ id, type: 'movie', title: `Filme ${id}`, year: 2020, posterPath: null, rating: null });

describe('ExploreGrid', () => {
  it('sem resultados mostra a mensagem e Limpar filtros', () => {
    render(<ExploreGrid filters={filters('tipo=serie&genero=18')} initial={{ results: [], totalPages: 0 }} />);
    expect(screen.getByText('Nenhum título encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/explorar?tipo=serie');
  });

  it('carrega a próxima página ao chegar perto do fim', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [title(2), title(1)], totalPages: 2 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExploreGrid filters={filters('genero=28')} initial={{ results: [title(1)], totalPages: 2 }} />);
    observerCallback([{ isIntersecting: true }]);
    expect(await screen.findByRole('link', { name: /Filme 2/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/explorar?genero=28&pagina=2');
    expect(screen.getAllByRole('link', { name: /Filme 1/ })).toHaveLength(1);
  });

  it('mostra erro com Tentar novamente quando a página seguinte falha', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [title(2)], totalPages: 2 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExploreGrid filters={filters()} initial={{ results: [title(1)], totalPages: 2 }} />);
    observerCallback([{ isIntersecting: true }]);
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: /Filme 2/ })).toBeInTheDocument();
  });
});

describe('ExploreFilters', () => {
  const genres = [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }];

  it('marca os filtros atuais e preserva o tipo e o humor', () => {
    render(<ExploreFilters filters={filters('humor=rir&genero=35&plataforma=8&nota=7')} genres={genres} />);
    expect(screen.getByRole('checkbox', { name: 'Comédia' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ação' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Nota mínima' })).toHaveValue('7');
    expect(document.querySelector('input[name="humor"]')).toHaveValue('rir');
    expect(document.querySelector('input[name="tipo"]')).toHaveValue('filme');
  });

  it('Filmes/Séries trocam o tipo e limpam gêneros e duração', () => {
    render(<ExploreFilters filters={filters('humor=rir&genero=35&duracao=curto')} genres={genres} />);
    expect(screen.getByRole('link', { name: 'Filmes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Séries' })).toHaveAttribute('href', '/explorar?tipo=serie&humor=rir');
  });

  it('"Todas" marca e desmarca todas as plataformas; "Todos" faz o mesmo com os gêneros', async () => {
    const genres = [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }];
    render(<ExploreFilters filters={filters('humor=superacao')} genres={genres} />);
    const platforms = screen.getByRole('group', { name: 'Plataformas' });
    const all = within(platforms).getByRole('checkbox', { name: 'Todas' });
    await userEvent.click(all);
    const boxes = within(platforms).getAllByRole('checkbox').filter((b) => b !== all);
    expect(boxes.every((b) => b.checked)).toBe(true);
    await userEvent.click(all);
    expect(boxes.every((b) => !b.checked)).toBe(true);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Todos os gêneros' }));
    expect(screen.getByRole('checkbox', { name: 'Ação' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Comédia' })).toBeChecked();
  });

  it('esconde a duração para séries', () => {
    render(<ExploreFilters filters={filters('tipo=serie')} genres={genres} />);
    expect(screen.queryByRole('combobox', { name: 'Duração' })).not.toBeInTheDocument();
  });
});
