import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const genres = {
  filme: [{ id: 28, name: 'Ação' }, { id: 10752, name: 'Guerra' }],
  serie: [{ id: 18, name: 'Drama' }],
};

beforeEach(() => {
  pathname = '/';
});

describe('menu do topo', () => {
  it('mostra Início, Filmes, Séries, Categorias e Explorar, nessa ordem', () => {
    renderWithSettings(<Header genres={genres} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const items = within(nav).getAllByRole('link').map((a) => a.textContent)
      .concat(within(nav).getAllByRole('button').map((b) => b.textContent));
    expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Filmes' })).toHaveAttribute('href', '/filmes');
    expect(within(nav).getByRole('link', { name: 'Séries' })).toHaveAttribute('href', '/series');
    expect(within(nav).getByRole('link', { name: 'Explorar' })).toHaveAttribute('href', '/explorar');
    expect(items).toContain('Categorias');
    const order = [...nav.querySelectorAll('a, button')].map((el) => el.textContent.trim());
    expect(order).toEqual(['Início', 'Filmes', 'Séries', 'Categorias', 'Explorar']);
  });

  it('marca a seção atual', () => {
    pathname = '/series';
    renderWithSettings(<Header genres={genres} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Séries' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });

  it('Categorias abre todos os gêneros de filmes e de séries', async () => {
    renderWithSettings(<Header genres={genres} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const button = within(nav).getByRole('button', { name: 'Categorias' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('region', { name: 'Categorias' });
    expect(within(menu).getByRole('link', { name: 'Guerra' })).toHaveAttribute('href', '/explorar?genero=10752');
    expect(within(menu).getByRole('link', { name: 'Drama' })).toHaveAttribute('href', '/explorar?tipo=serie&genero=18');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Categorias' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('no celular, o botão de menu abre os mesmos itens', async () => {
    renderWithSettings(<Header genres={genres} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(within(menu).getByRole('link', { name: 'Filmes' })).toHaveAttribute('href', '/filmes');
    expect(within(menu).getByRole('link', { name: 'Guerra' })).toHaveAttribute('href', '/explorar?genero=10752');
  });

  it('sem a lista de gêneros, o topo continua funcionando', () => {
    renderWithSettings(<Header />);
    expect(screen.getByRole('link', { name: 'Explorar' })).toBeInTheDocument();
  });

  it('sobre o trailer o topo é transparente e escuro; ao rolar, volta a ser sólido', async () => {
    renderWithSettings(<Header genres={genres} />);
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-over-hero', 'true');
    expect(header).toHaveAttribute('data-theme', 'escuro');
    await act(async () => {
      Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header).toHaveAttribute('data-over-hero', 'false');
    expect(header).not.toHaveAttribute('data-theme');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('em páginas sem destaque o topo é sempre sólido', () => {
    pathname = '/explorar';
    renderWithSettings(<Header genres={genres} />);
    expect(screen.getByRole('banner')).toHaveAttribute('data-over-hero', 'false');
  });
});

