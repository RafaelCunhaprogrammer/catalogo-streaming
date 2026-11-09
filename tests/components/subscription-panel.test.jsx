import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionPanel } from '@/components/subscription/SubscriptionPanel';
import { cancelAction } from '@/lib/actions/assinatura';

vi.mock('@/lib/actions/assinatura', () => ({ cancelAction: vi.fn() }));

const payments = [
  { id: 2, plan: 'anual', amountCents: 16680, method: 'cartao', cardLast4: '4242', status: 'aprovado', createdAt: new Date('2026-11-09T15:00:00Z') },
  { id: 1, plan: 'mensal', amountCents: 1990, method: 'pix', cardLast4: null, status: 'recusado', createdAt: new Date('2026-11-08T15:00:00Z') },
];
const ativa = { kind: 'ativa', until: new Date('2027-11-09T15:00:00Z'), canceled: false };

beforeEach(() => cancelAction.mockReset());

describe('SubscriptionPanel', () => {
  it('mostra situação, plano, validade e pagamentos', () => {
    render(<SubscriptionPanel access={ativa} plan="anual" payments={payments} isDemo={false} />);
    expect(screen.getByRole('heading', { name: 'Assinatura' })).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Plano Anual')).toBeInTheDocument();
    expect(screen.getByText('Válida até 09/11/2027')).toBeInTheDocument();
    expect(screen.getByText('Pagamentos simulados')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 166,80/)).toBeInTheDocument();
    expect(screen.getByText(/Cartão final 4242/)).toBeInTheDocument();
    expect(screen.getByText(/Pix/)).toBeInTheDocument();
    expect(screen.getByText(/Aprovado/)).toBeInTheDocument();
    expect(screen.getByText(/Recusado/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver planos' })).not.toBeInTheDocument();
  });

  it('cancela só depois da confirmação', async () => {
    const user = userEvent.setup();
    cancelAction.mockResolvedValue({ ok: true, periodEnd: new Date('2027-11-09T15:00:00Z') });
    render(<SubscriptionPanel access={ativa} plan="anual" payments={payments} isDemo={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    expect(screen.getByText('Cancelar assinatura?')).toBeInTheDocument();
    expect(cancelAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(cancelAction).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Sua assinatura termina em 09/11.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
  });

  it('Voltar fecha a confirmação sem cancelar', async () => {
    const user = userEvent.setup();
    render(<SubscriptionPanel access={ativa} plan="anual" payments={[]} isDemo={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(cancelAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument();
  });

  it('mostra erro se o cancelamento falhar', async () => {
    const user = userEvent.setup();
    cancelAction.mockResolvedValue({ ok: false, error: 'adulto' });
    render(<SubscriptionPanel access={ativa} plan="anual" payments={[]} isDemo={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('cancelada: texto próprio, Ver planos e sem botão de cancelar', () => {
    render(<SubscriptionPanel access={{ ...ativa, canceled: true }} plan="anual" payments={[]} isDemo={false} />);
    expect(screen.getByText('Cancelada — sua assinatura termina em 09/11.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/assinar');
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
  });

  it('teste grátis', () => {
    render(<SubscriptionPanel access={{ kind: 'teste', until: new Date('2026-11-09T20:30:00Z'), canceled: false }} plan={null} payments={[]} isDemo={false} />);
    expect(screen.getByText('Teste grátis até 09/11 17:30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
  });

  it('sem assinatura', () => {
    render(<SubscriptionPanel access={{ kind: 'sem-acesso', until: null, canceled: false }} plan={null} payments={[]} isDemo={false} />);
    expect(screen.getByText('Sem assinatura')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toBeInTheDocument();
  });

  it('demonstração: nota e sem cancelar', () => {
    render(<SubscriptionPanel access={{ kind: 'ativa', until: null, canceled: false }} plan={null} payments={[]} isDemo />);
    expect(screen.getByText('A demonstração tem assinatura sempre ativa.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
  });
});
