import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';
import { TrailerButton } from '@/components/TrailerButton';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => '/' }));

describe('foco do teclado nas janelas', () => {
  it('Configurações prende o Tab dentro do painel e devolve o foco ao fechar', async () => {
    renderWithSettings(<Header />);
    const opener = screen.getByRole('button', { name: 'Abrir configurações' });
    await userEvent.click(opener);
    const close = await screen.findByRole('button', { name: 'Fechar configurações' });
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('dialog', { name: 'Configurações' })).toContainElement(document.activeElement);
    await userEvent.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  it('a janela do trailer prende o Tab e devolve o foco ao botão', async () => {
    renderWithSettings(<TrailerButton trailerKey="abc" title="Filme" />);
    const opener = screen.getByRole('button', { name: '▶ Ver trailer' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Trailer de Filme' });
    for (let i = 0; i < 4; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement);
    }
    await userEvent.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });
});
