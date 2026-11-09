import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm } from '@/components/subscription/CheckoutForm';
import { payAction } from '@/lib/actions/assinatura';

vi.mock('@/lib/actions/assinatura', () => ({ payAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const plan = { id: 'anual', label: 'Anual', months: 12, priceCents: 16680, perMonthCents: 1390 };

async function fillCard(user, number) {
  await user.click(screen.getByRole('tab', { name: 'Cartão' }));
  await user.type(screen.getByLabelText('Número do cartão'), number);
  await user.type(screen.getByLabelText('Validade'), '12/30');
  await user.type(screen.getByLabelText('CVV'), '123');
  await user.type(screen.getByLabelText('Nome no cartão'), 'Maria Teste');
  await user.click(screen.getByRole('button', { name: /Pagar/ }));
}

beforeEach(() => payAction.mockReset());

describe('CheckoutForm', () => {
  it('mostra a faixa da demonstração e o resumo do plano', () => {
    render(<CheckoutForm plan={plan} />);
    expect(screen.getByText('Ambiente de demonstração: nenhum valor é cobrado.')).toBeInTheDocument();
    expect(screen.getByText('R$ 166,80')).toBeInTheDocument();
    expect(screen.getByText(/Anual/)).toBeInTheDocument();
  });

  it('abas Pix/Cartão trocam com as setas', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm plan={plan} />);
    const pix = screen.getByRole('tab', { name: 'Pix' });
    expect(pix).toHaveAttribute('aria-selected', 'true');
    pix.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cartão' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Número do cartão')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Já paguei (simulação)' })).toBeInTheDocument();
  });

  it('Pix aprovado mostra a data e o link para assistir', async () => {
    const user = userEvent.setup();
    payAction.mockResolvedValue({ ok: true, periodEnd: new Date('2027-11-09T15:00:00Z') });
    render(<CheckoutForm plan={plan} />);
    await user.click(screen.getByRole('button', { name: 'Já paguei (simulação)' }));
    expect(payAction).toHaveBeenCalledWith({ plan: 'anual', method: 'pix' });
    expect(await screen.findByText('Assinatura ativa até 09/11/2027')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar a assistir' })).toHaveAttribute('href', '/');
  });

  it('cartão aprovado envia só bandeira e últimos 4 dígitos', async () => {
    const user = userEvent.setup();
    payAction.mockResolvedValue({ ok: true, periodEnd: new Date('2027-11-09T15:00:00Z') });
    render(<CheckoutForm plan={plan} />);
    await fillCard(user, '4242 4242 4242 4242');
    expect(payAction).toHaveBeenCalledWith({ plan: 'anual', method: 'cartao', testCard: 'aprovado', brand: 'Visa', last4: '4242' });
    expect(await screen.findByText('Assinatura ativa até 09/11/2027')).toBeInTheDocument();
  });

  it('cartão recusado ainda chama a ação e mostra a mensagem', async () => {
    const user = userEvent.setup();
    payAction.mockResolvedValue({ ok: false, error: 'recusado' });
    render(<CheckoutForm plan={plan} />);
    await fillCard(user, '4000000000000002');
    expect(payAction).toHaveBeenCalledWith(expect.objectContaining({ testCard: 'recusado', last4: '0002' }));
    expect(await screen.findByText('Pagamento recusado pelo banco (simulação). Tente outro cartão.')).toBeInTheDocument();
  });

  it('número desconhecido: erro ligado ao campo, sem chamar a ação', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm plan={plan} />);
    await fillCard(user, '1111 2222 3333 4444');
    expect(payAction).not.toHaveBeenCalled();
    const input = screen.getByLabelText('Número do cartão');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText('Use um dos cartões de teste mostrados abaixo.');
    expect(input.getAttribute('aria-describedby').split(' ')).toContain(error.id);
    expect(screen.getByText(/4242 4242 4242 4242/)).toBeInTheDocument();
  });

  it('demonstração: sucesso com aviso de que nada mudou', async () => {
    const user = userEvent.setup();
    payAction.mockResolvedValue({ ok: true, demo: true });
    render(<CheckoutForm plan={plan} />);
    await user.click(screen.getByRole('button', { name: 'Já paguei (simulação)' }));
    expect(await screen.findByText(/a conta de demonstração não foi alterada/i)).toBeInTheDocument();
  });

  it('erro de área de adulto vira mensagem', async () => {
    const user = userEvent.setup();
    payAction.mockResolvedValue({ ok: false, error: 'adulto' });
    render(<CheckoutForm plan={plan} />);
    await user.click(screen.getByRole('button', { name: 'Já paguei (simulação)' }));
    expect(await screen.findByText('Peça para um adulto assinar.')).toBeInTheDocument();
  });
});
