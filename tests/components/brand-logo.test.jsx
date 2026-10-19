import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BrandLogo } from '@/components/BrandLogo';
import { LOGO_SRC } from '@/lib/brand';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe('BrandLogo', () => {
  it('mostra o símbolo do caroço de açaí, com o nome acessível', () => {
    render(<BrandLogo />);
    const logo = screen.getByRole('img', { name: "Pai d'Égua" });
    const symbol = logo.querySelector('img');
    expect(symbol).toHaveAttribute('src', LOGO_SRC);
    expect(symbol).toHaveAttribute('alt', '');
    expect(existsSync(join(process.cwd(), 'public', LOGO_SRC))).toBe(true);
  });

  it('o topo mostra a logo como link para o Início, sem o texto "Catálogo"', () => {
    renderWithSettings(<Header />);
    const home = screen.getByRole('link', { name: "Pai d'Égua — Início" });
    expect(home).toHaveAttribute('href', '/');
    expect(screen.queryByText('Catálogo')).not.toBeInTheDocument();
  });

  it('no Início, clicar na logo pede para rever a abertura; nas outras páginas, só leva ao Início', async () => {
    const replay = vi.fn();
    window.addEventListener('paidegua:rever-abertura', replay);
    pathname = '/';
    const { unmount } = renderWithSettings(<Header />);
    const home = screen.getByRole('link', { name: "Pai d'Égua — Início" });
    expect(home).toHaveAttribute('title', 'Ver a abertura de novo');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    home.dispatchEvent(event);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    unmount();

    pathname = '/filmes';
    renderWithSettings(<Header />);
    const other = screen.getByRole('link', { name: "Pai d'Égua — Início" });
    expect(other).not.toHaveAttribute('title');
    const event2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    other.dispatchEvent(event2);
    expect(replay).toHaveBeenCalledTimes(1);
    window.removeEventListener('paidegua:rever-abertura', replay);
    pathname = '/';
  });
});
