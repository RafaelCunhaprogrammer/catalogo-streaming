import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/SearchBox';

const push = vi.fn();
let pathname = '/';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));

const results = [{ id: 1, type: 'movie', title: 'Cidade de Deus', year: 2002, posterPath: null }];

beforeEach(() => {
  push.mockClear();
  pathname = '/';
});

describe('SearchBox', () => {
  it('busca 300 ms depois da última tecla e mostra as sugestões', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results })));
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Buscar filmes e séries' }), 'Cidade de Deus');
    expect(await screen.findByRole('link', { name: 'Cidade de Deus (2002)' })).toHaveAttribute('href', '/filme/1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/buscar?q=Cidade%20de%20Deus');
    expect(screen.getByRole('link', { name: 'Ver todos os resultados' })).toHaveAttribute('href', '/busca?q=Cidade%20de%20Deus');
  });

  it('não busca com menos de 2 caracteres', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'a');
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Enter abre a página completa de resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }))));
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'ação{Enter}');
    expect(push).toHaveBeenCalledWith('/busca?q=a%C3%A7%C3%A3o');
  });

  it('tem botão de buscar com lupa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }))));
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'guerra');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(push).toHaveBeenCalledWith('/busca?q=guerra');
  });

  it('quando o texto é um gênero, sugere ver a categoria inteira', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results })))); 
    const genres = { filme: [{ id: 10752, name: 'Guerra' }], serie: [{ id: 10768, name: 'War & Politics' }] };
    render(<SearchBox genres={genres} />);
    await userEvent.type(screen.getByRole('combobox'), 'guerra');
    expect(await screen.findByRole('link', { name: 'Ver filmes de Guerra' })).toHaveAttribute('href', '/explorar?genero=10752');
  });

  it('em Filmes, busca só filmes', async () => {
    pathname = '/filmes';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results })));
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchBox />);
    const box = screen.getByRole('combobox', { name: 'Buscar filmes' });
    await userEvent.type(box, 'cidade');
    await screen.findByRole('link', { name: 'Cidade de Deus (2002)' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/buscar?q=cidade&tipo=filme');
    await userEvent.type(box, '{Enter}');
    expect(push).toHaveBeenCalledWith('/busca?q=cidade&tipo=filme');
  });

  it('a lista de sugestões rola sozinha, sem rolar a página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results }))));
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'cidade');
    await screen.findByRole('link', { name: 'Cidade de Deus (2002)' });
    expect(screen.getByRole('listbox', { name: 'Sugestões' })).toHaveClass('overflow-y-auto', 'overscroll-contain');
  });

  describe('teclado', () => {
    async function comSugestoes() {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results }))));
      const genres = { filme: [{ id: 10752, name: 'Guerra' }] };
      render(<SearchBox genres={genres} />);
      const box = screen.getByRole('combobox');
      await userEvent.type(box, 'guerra');
      await screen.findByRole('link', { name: 'Cidade de Deus (2002)' });
      return box;
    }

    it('as setas percorrem as sugestões e Enter abre a escolhida', async () => {
      const box = await comSugestoes();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      const option = screen.getAllByRole('option')[1];
      expect(option).toHaveAttribute('aria-selected', 'true');
      expect(box).toHaveAttribute('aria-activedescendant', option.id);
      await userEvent.keyboard('{Enter}');
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/filme/1');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('a seta para cima a partir do campo vai para Ver todos os resultados', async () => {
      await comSugestoes();
      await userEvent.keyboard('{ArrowUp}{Enter}');
      expect(push).toHaveBeenCalledWith('/busca?q=guerra');
    });

    it('as setas dão a volta na lista', async () => {
      await comSugestoes();
      await userEvent.keyboard('{ArrowUp}{ArrowDown}');
      expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('Esc fecha a lista, a seta reabre e digitar limpa a escolha', async () => {
      const box = await comSugestoes();
      await userEvent.keyboard('{ArrowDown}{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(box).not.toHaveAttribute('aria-activedescendant');
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.type(box, 's');
      expect(box).not.toHaveAttribute('aria-activedescendant');
    });
  });
});
