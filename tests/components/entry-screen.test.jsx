import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { EntryScreen, ENTRY_SESSION_KEY } from '@/components/EntryScreen';
import { playOpeningSound } from '@/lib/opening-sound';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/opening-sound', () => ({ playOpeningSound: vi.fn() }));

beforeEach(() => {
  pathname = '/';
  playOpeningSound.mockClear();
});

describe('EntryScreen', () => {
  it('aparece no Início, toca o som e some ao entrar', async () => {
    renderWithSettings(<EntryScreen />, { theme: 'escuro' });
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(playOpeningSound).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(ENTRY_SESSION_KEY)).toBe('1');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument());
  });

  it.each([
    ['Noturno', { theme: 'noturno' }],
    ['Modo sensorial calmo', { theme: 'escuro', calm: true }],
    ['som desligado', { theme: 'escuro', openingSound: false }],
  ])('não toca o som no %s', async (_, prefs) => {
    renderWithSettings(<EntryScreen />, prefs);
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(playOpeningSound).not.toHaveBeenCalled();
  });

  it('não aparece de novo na mesma sessão', async () => {
    sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    renderWithSettings(<EntryScreen />);
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme'));
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('não aparece em links diretos para páginas internas', async () => {
    pathname = '/filme/101';
    renderWithSettings(<EntryScreen />);
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme'));
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
