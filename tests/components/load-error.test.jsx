import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadError } from '@/components/LoadError';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LoadError', () => {
  it('mostra a mensagem padrão e chama onRetry', async () => {
    const onRetry = vi.fn();
    render(<LoadError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar agora.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sem onRetry recarrega os dados da página', async () => {
    render(<LoadError message="Falhou." />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refresh).toHaveBeenCalled();
  });
});
