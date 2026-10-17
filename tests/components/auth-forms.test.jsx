import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { authErrorMessage } from '@/lib/auth/messages';
import { authClient } from '@/lib/auth/client';
import { createFirstProfileAction } from '@/lib/actions/conta';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
vi.mock('@/lib/actions/conta', () => ({ signInDemoAction: vi.fn(), createFirstProfileAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mensagens de erro', () => {
  it('não revela qual dos dois errou, e trata limite e e-mail repetido', () => {
    expect(authErrorMessage({ status: 401 }, 'entrar')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage({ status: 429 }, 'entrar')).toBe('Muitas tentativas. Tente de novo em alguns minutos.');
    expect(authErrorMessage({ status: 422, code: 'USER_ALREADY_EXISTS' }, 'criar')).toBe('Já existe uma conta com este e-mail.');
    expect(authErrorMessage({ status: 500 }, 'criar')).toBe('Não foi possível concluir agora. Tente de novo.');
  });
});

describe('Entrar', () => {
  it('entra e volta para onde a pessoa queria ir', async () => {
    authClient.signIn.email.mockResolvedValue({ data: {}, error: null });
    render(<SignInForm voltar="/filme/1" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: 'ana@ex.com', password: 'senha-forte-1' });
    expect(push).toHaveBeenCalledWith('/filme/1');
  });

  it('erro aparece ligado ao formulário', async () => {
    authClient.signIn.email.mockResolvedValue({ data: null, error: { status: 401 } });
    render(<SignInForm voltar="/" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada-123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(push).not.toHaveBeenCalled();
  });

  it('tem a conta de demonstração com o PIN de teste e os links', () => {
    render(<SignInForm voltar="/" />);
    expect(screen.getByRole('button', { name: 'Experimentar sem cadastro' })).toBeInTheDocument();
    expect(screen.getByText('Conta de demonstração · PIN de teste: 1234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/criar-conta');
  });
});

describe('Criar conta', () => {
  it('confere a confirmação da senha antes de enviar', async () => {
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), 'senha-forte-2');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não são iguais.');
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it('cria a conta e o primeiro perfil com as preferências do navegador', async () => {
    authClient.signUp.email.mockResolvedValue({ data: {}, error: null });
    localStorage.setItem('catalogo:prefs', JSON.stringify({ version: 1, theme: 'claro' }));
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), 'senha-forte-1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(authClient.signUp.email).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@ex.com', password: 'senha-forte-1' });
    expect(createFirstProfileAction).toHaveBeenCalledWith(expect.objectContaining({ theme: 'claro' }));
  });
});

describe('Senha', () => {
  it('pedido de redefinição sempre mostra a mesma mensagem', async () => {
    authClient.requestPasswordReset.mockResolvedValue({ data: {}, error: null });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'qualquer@ex.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(authClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'qualquer@ex.com', redirectTo: '/redefinir-senha' });
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta com este e-mail, enviamos um link.');
  });

  it('link vencido mostra a mensagem e o caminho para pedir outro', () => {
    render(<ResetPasswordForm token={null} error="INVALID_TOKEN" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Este link expirou.');
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
  });

  it('cria a nova senha com o token', async () => {
    authClient.resetPassword.mockResolvedValue({ data: {}, error: null });
    render(<ResetPasswordForm token="abc" />);
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'nova-senha-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(authClient.resetPassword).toHaveBeenCalledWith({ newPassword: 'nova-senha-123', token: 'abc' });
    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.');
  });
});
