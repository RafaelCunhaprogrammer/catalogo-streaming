// Planos da assinatura simulada. Preços em centavos; o servidor sempre confere aqui.
export const PLANS = [
  { id: 'mensal', label: 'Mensal', months: 1, priceCents: 1990, perMonthCents: 1990, featured: false },
  { id: 'trimestral', label: 'Trimestral', months: 3, priceCents: 5370, perMonthCents: 1790, featured: false },
  { id: 'semestral', label: 'Semestral', months: 6, priceCents: 9540, perMonthCents: 1590, featured: false },
  { id: 'anual', label: 'Anual', months: 12, priceCents: 16680, perMonthCents: 1390, featured: true },
];

export const getPlan = (id) => PLANS.find((p) => p.id === id) ?? null;

// Manual (sem Intl) para sair sempre com espaço normal, não o espaço sem quebra.
export function formatBRL(cents) {
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `R$ ${reais},${rest}`;
}
