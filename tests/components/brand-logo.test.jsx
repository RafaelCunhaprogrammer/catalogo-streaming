import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandLogo } from '@/components/BrandLogo';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe('BrandLogo', () => {
  it('desenha o açaí preso à ráquila, com o nome acessível', () => {
    render(<BrandLogo />);
    const logo = screen.getByRole('img', { name: "Pai d'Égua" });
    expect(logo.querySelector('[data-part="raquila"]')).not.toBeNull();
    expect(logo.querySelector('[data-part="fruto"]')).not.toBeNull();
    expect(logo.querySelector('[data-part="play"]')).not.toBeNull();
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
