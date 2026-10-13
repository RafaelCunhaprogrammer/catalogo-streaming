import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandLogo } from '@/components/BrandLogo';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

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
});
