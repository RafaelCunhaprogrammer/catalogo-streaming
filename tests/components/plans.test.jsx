import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlanCards } from '@/components/subscription/PlanCards';

describe('PlanCards', () => {
  it('lista os 4 planos com preços formatados e destaca o Anual em texto', () => {
    render(<PlanCards loggedIn blocked={false} />);
    const items = within(screen.getByRole('list', { name: 'Planos' })).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('R$ 19,90')).toBeInTheDocument();
    expect(within(items[3]).getByText('R$ 166,80')).toBeInTheDocument();
    expect(within(items[3]).getByText('Mais vantajoso')).toBeInTheDocument();
    expect(screen.getAllByText('Mais vantajoso')).toHaveLength(1);
  });

  it('logado: "Assinar" leva ao pagamento do plano', () => {
    render(<PlanCards loggedIn blocked={false} />);
    const links = screen.getAllByRole('link', { name: /Assinar/ });
    expect(links[3]).toHaveAttribute('href', '/assinar/pagamento?plano=anual');
    expect(links[0]).toHaveAttribute('href', '/assinar/pagamento?plano=mensal');
  });

  it('visitante: mostra o teste grátis e leva a /criar-conta', () => {
    render(<PlanCards loggedIn={false} blocked={false} />);
    expect(screen.getAllByText('Teste grátis de 6 horas ao criar a conta').length).toBeGreaterThan(0);
    screen.getAllByRole('link', { name: /Criar conta/ }).forEach((a) => expect(a).toHaveAttribute('href', '/criar-conta'));
  });

  it('Kids sem área de adulto: pede um adulto e não mostra botões', () => {
    render(<PlanCards loggedIn blocked />);
    expect(screen.getAllByText('Peça para um adulto assinar.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Assinar/ })).toBeNull();
  });
});
