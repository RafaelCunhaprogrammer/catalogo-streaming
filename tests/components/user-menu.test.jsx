import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';
import { verifyPinAction, signOutAction } from '@/lib/actions/conta';

const push = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/explorar', useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn(), signOutAction: vi.fn() }));

const adult = { signedIn: true, profile: { name: 'Ana', color: '#8b5cf6', kind: 'adulto' } };
const kids = { signedIn: true, profile: { name: 'Pequeno', color: '#ec4899', kind: 'kids' } };

beforeEach(() => vi.clearAllMocks());

describe('topo', () => {
  it('visitante vê Entrar e a busca pede login', () => {
    renderWithSettings(<Header account={{ signedIn: false, profile: null }} />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Entre para buscar' })).toHaveAttribute('href', '/entrar?voltar=%2Fbusca');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('adulto abre o menu do perfil com os quatro itens', async () => {
    renderWithSettings(<Header account={adult} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu do perfil Ana' }));
    expect(screen.getByRole('link', { name: 'Trocar perfil' })).toHaveAttribute('href', '/perfis');
    expect(screen.getByRole('link', { name: 'Gerenciar perfis' })).toHaveAttribute('href', '/perfis/gerenciar');
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/conta');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(signOutAction).toHaveBeenCalled();
  });

  it('no Kids, cada item do menu pede o PIN antes', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    renderWithSettings(<Header account={kids} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu do perfil Pequeno' }));
    expect(screen.queryByRole('link', { name: 'Trocar perfil' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Trocar perfil' }));
    expect(screen.getByRole('dialog', { name: 'Área de adultos' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(verifyPinAction).toHaveBeenCalledWith({ pin: '1234', purpose: 'adulto', titleKey: undefined });
    expect(push).toHaveBeenCalledWith('/perfis');
  });
});
