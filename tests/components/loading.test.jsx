import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeLoading from '@/app/(vitrine)/loading';

describe('carregamento do Início', () => {
  it('mostra esqueletos do destaque e das fileiras e avisa o leitor de tela', () => {
    const { container } = render(<HomeLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(10);
  });
});
