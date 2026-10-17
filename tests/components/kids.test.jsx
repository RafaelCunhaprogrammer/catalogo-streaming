import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinDialog } from '@/components/kids/PinDialog';
import { PinGate } from '@/components/kids/PinGate';
import { PosterCard } from '@/components/PosterCard';
import { verifyPinAction } from '@/lib/actions/conta';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  verifyPinAction.mockReset();
});

const locked = { id: 7, type: 'movie', title: 'Filme de Terror', year: 2024, posterPath: null, rating: 6.4, certification: '16', locked: true };

describe('PinDialog', () => {
  it('campo numérico de 4 dígitos; PIN errado mostra a mensagem do servidor', async () => {
    verifyPinAction.mockResolvedValue({ ok: false, message: 'PIN incorreto. Restam 4 tentativas.' });
    const onSuccess = vi.fn();
    render(<PinDialog open title="Este título precisa de um adulto" purpose="titulo" titleKey="movie-7" onClose={() => {}} onSuccess={onSuccess} />);
    const input = screen.getByLabelText('PIN dos pais');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '4');
    await userEvent.type(input, '0000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(verifyPinAction).toHaveBeenCalledWith({ pin: '0000', purpose: 'titulo', titleKey: 'movie-7' });
    expect(await screen.findByRole('alert')).toHaveTextContent('PIN incorreto. Restam 4 tentativas.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('PIN certo chama onSuccess', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    render(<PinDialog open title="Área de adultos" purpose="adulto" onClose={() => {}} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('cartaz bloqueado', () => {
  it('mostra o cadeado, não é link e pede o PIN; liberado, abre o título', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    render(<PosterCard title={locked} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Filme de Terror (2024) — bloqueado para este perfil' });
    await userEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Este título precisa de um adulto' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(push).toHaveBeenCalledWith('/filme/7');
  });

  it('cartaz liberado continua sendo link normal', () => {
    render(<PosterCard title={{ ...locked, locked: false }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/7');
  });
});

describe('PinGate', () => {
  it('no lugar do conteúdo; liberado, recarrega a página', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    render(<PinGate title="Este título precisa de um adulto" description="Peça para um adulto digitar o PIN." purpose="titulo" titleKey="movie-7" />);
    await userEvent.click(screen.getByRole('button', { name: 'Digitar o PIN' }));
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(refresh).toHaveBeenCalled();
  });
});
