import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from '@/components/account/AccountSettings';
import { changePasswordAction } from '@/lib/actions/conta';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/actions/conta', () => ({
  changePasswordAction: vi.fn(),
  deleteAccountAction: vi.fn(),
  setPinAction: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('Minha conta', () => {
  it('mostra o e-mail e as três seções', () => {
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin />);
    expect(screen.getByText('ana@ex.com')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Trocar senha' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Trocar o PIN dos pais' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Excluir conta' })).toBeInTheDocument();
  });

  it('trocar senha mostra o resultado do servidor', async () => {
    changePasswordAction.mockResolvedValue({ ok: false, error: 'Senha atual incorreta.' });
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin />);
    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada-123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'nova-senha-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument();
  });

  it('sem PIN, a seção do PIN é de criação (sem pedir senha)', () => {
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin={false} />);
    expect(screen.getByRole('form', { name: 'Criar o PIN dos pais' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha da conta')).not.toBeInTheDocument();
  });

  it('na demonstração, tudo desabilitado com aviso', () => {
    render(<AccountSettings email="demo@paidegua.app" isDemo hasPin />);
    expect(screen.getAllByText('Indisponível na conta de demonstração.')).toHaveLength(1);
    expect(screen.queryByRole('form', { name: 'Trocar senha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Excluir conta' })).not.toBeInTheDocument();
  });
});
