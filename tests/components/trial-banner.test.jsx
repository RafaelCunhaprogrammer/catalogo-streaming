import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrialBanner } from '@/components/subscription/TrialBanner';

describe('TrialBanner', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const until = new Date('2026-11-09T17:12:00Z');

  it('mostra o tempo restante e o link Assinar, sem animação', () => {
    const { container } = render(<TrialBanner access={{ kind: 'teste', until, canceled: false }} now={now} />);
    expect(screen.getByText(/Teste grátis: faltam 5 h 12 min/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assinar' })).toHaveAttribute('href', '/assinar');
    expect(container.innerHTML).not.toMatch(/animate|transition/);
  });

  it.each([null, { kind: 'ativa', until, canceled: false }, { kind: 'sem-acesso', until: null, canceled: false }])('não aparece para %j', (access) => {
    const { container } = render(<TrialBanner access={access} now={now} />);
    expect(container).toBeEmptyDOMElement();
  });
});
