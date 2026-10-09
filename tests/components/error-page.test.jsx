import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPage from '@/app/error';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('página de erro', () => {
  it('Tentar novamente busca os dados de novo com retry()', async () => {
    const retry = vi.fn();
    const reset = vi.fn();
    render(<ErrorPage error={new Error('TMDB fora')} retry={retry} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });
});
