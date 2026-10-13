import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { STORAGE_KEY } from '@/lib/preferences';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => '/' }));

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

beforeEach(() => refresh.mockClear());

describe('SettingsPanel', () => {
  it('não mostra nada fechado', () => {
    renderWithSettings(<SettingsPanel open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('troca o modo de cor e mostra o brilho só no Noturno', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />, { theme: 'escuro' });
    const dialog = await screen.findByRole('dialog', { name: 'Configurações' });
    expect(screen.queryByRole('slider', { name: /Brilho/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Noturno' }));
    await waitFor(() => expect(saved().theme).toBe('noturno'));
    expect(screen.getByRole('slider', { name: /Brilho/ })).toHaveValue('60');
    expect(dialog).toBeInTheDocument();
  });

  it('ajusta o brilho do Noturno', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />, { theme: 'noturno' });
    const slider = await screen.findByRole('slider', { name: /Brilho/ });
    fireEvent.change(slider, { target: { value: '50' } });
    await waitFor(() => expect(saved().brightness).toBe(50));
  });

  it('liga as opções de acessibilidade', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Muito grande' }));
    await userEvent.click(screen.getByRole('switch', { name: /Modo sensorial calmo/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Alto contraste/ }));
    await waitFor(() => expect(saved()).toMatchObject({ textSize: 'muito-grande', calm: true, highContrast: true }));
  });

  it('não mostra a opção de som de abertura (o som volta na Etapa B, na escolha de perfil)', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />);
    await screen.findByRole('dialog', { name: 'Configurações' });
    expect(screen.queryByRole('switch', { name: /Som de abertura/ })).not.toBeInTheDocument();
  });

  it('Meus streamings grava o cookie e atualiza a página', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Netflix' }));
    expect(document.cookie).toContain('catalogo_streamings=8');
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(saved().myProviders).toEqual([8]));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }));
    await waitFor(() => expect(saved().myProviders).toEqual([]));
  });

  it('fecha com Esc e com o botão Fechar', async () => {
    const onClose = vi.fn();
    renderWithSettings(<SettingsPanel open onClose={onClose} />);
    const close = await screen.findByRole('button', { name: 'Fechar configurações' });
    expect(close).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
