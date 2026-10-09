import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/SearchBox';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const results = [{ id: 1, type: 'movie', title: 'Cidade de Deus', year: 2002, posterPath: null }];

beforeEach(() => push.mockClear());

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
});
