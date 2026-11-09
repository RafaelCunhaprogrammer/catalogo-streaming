import { describe, it, expect } from 'vitest';
import { PLANS, getPlan, formatBRL } from '@/lib/plans';
import { TRIAL_HOURS, trialEnd, accessState, nextPeriodEnd, cardTestResult, remainingText } from '@/lib/subscription/rules';

const d = (s) => new Date(s);

describe('planos', () => {
  it('tem os quatro planos na ordem, com preços em centavos', () => {
    expect(PLANS.map((p) => [p.id, p.label, p.months, p.priceCents, p.perMonthCents, p.featured])).toEqual([
      ['mensal', 'Mensal', 1, 1990, 1990, false],
      ['trimestral', 'Trimestral', 3, 5370, 1790, false],
      ['semestral', 'Semestral', 6, 9540, 1590, false],
      ['anual', 'Anual', 12, 16680, 1390, true],
    ]);
  });
  it('getPlan acha por id e devolve null se não existe', () => {
    expect(getPlan('anual').months).toBe(12);
    expect(getPlan('xyz')).toBeNull();
    expect(getPlan(undefined)).toBeNull();
  });
  it('formatBRL formata com vírgula e espaço normal', () => {
    expect(formatBRL(1990)).toBe('R$ 19,90');
    expect(formatBRL(16680)).toBe('R$ 166,80');
    expect(formatBRL(5)).toBe('R$ 0,05');
    expect(formatBRL(100000)).toBe('R$ 1000,00');
  });
});

describe('teste grátis', () => {
  it('dura 6 horas', () => {
    expect(TRIAL_HOURS).toBe(6);
    expect(trialEnd(d('2026-11-09T10:00:00Z')).toISOString()).toBe('2026-11-09T16:00:00.000Z');
  });
});

describe('accessState', () => {
  const now = d('2026-11-09T12:00:00Z');
  it('sem assinatura: sem acesso', () => {
    expect(accessState(null, now)).toEqual({ kind: 'sem-acesso', until: null, canceled: false });
  });
  it('teste em andamento', () => {
    const sub = { status: 'teste', trialEndsAt: d('2026-11-09T14:00:00Z'), periodEnd: null };
    expect(accessState(sub, now)).toEqual({ kind: 'teste', until: sub.trialEndsAt, canceled: false });
  });
  it('teste vencido: sem acesso', () => {
    const sub = { status: 'teste', trialEndsAt: d('2026-11-09T11:00:00Z'), periodEnd: null };
    expect(accessState(sub, now).kind).toBe('sem-acesso');
  });
  it('ativa dentro do período', () => {
    const sub = { status: 'ativa', trialEndsAt: d('2026-11-01T00:00:00Z'), periodEnd: d('2026-12-09T12:00:00Z') };
    expect(accessState(sub, now)).toEqual({ kind: 'ativa', until: sub.periodEnd, canceled: false });
  });
  it('cancelada mantém acesso até o fim do período', () => {
    const sub = { status: 'cancelada', periodEnd: d('2026-12-09T12:00:00Z') };
    expect(accessState(sub, now)).toEqual({ kind: 'ativa', until: sub.periodEnd, canceled: true });
  });
  it('período vencido: sem acesso', () => {
    const sub = { status: 'ativa', trialEndsAt: d('2026-11-01T00:00:00Z'), periodEnd: d('2026-11-09T12:00:00Z') };
    expect(accessState(sub, now)).toEqual({ kind: 'sem-acesso', until: null, canceled: false });
  });
  it('cancelada e vencida: sem acesso', () => {
    expect(accessState({ status: 'cancelada', periodEnd: d('2026-11-08T00:00:00Z') }, now).kind).toBe('sem-acesso');
  });
});

describe('nextPeriodEnd', () => {
  it('soma meses ao fim atual se ainda não venceu', () => {
    expect(nextPeriodEnd(d('2026-12-09T12:00:00Z'), d('2026-11-09T12:00:00Z'), 3).toISOString()).toBe('2027-03-09T12:00:00.000Z');
  });
  it('usa agora se já venceu ou não há período', () => {
    expect(nextPeriodEnd(d('2026-10-01T00:00:00Z'), d('2026-11-09T12:30:00Z'), 1).toISOString()).toBe('2026-12-09T12:30:00.000Z');
    expect(nextPeriodEnd(null, d('2026-11-09T12:30:00Z'), 12).toISOString()).toBe('2027-11-09T12:30:00.000Z');
  });
  it('31/01 + 1 mês cai em 28/02 (ano comum), mantendo a hora', () => {
    expect(nextPeriodEnd(null, d('2027-01-31T15:45:00Z'), 1).toISOString()).toBe('2027-02-28T15:45:00.000Z');
  });
  it('31/01 + 1 mês cai em 29/02 em ano bissexto', () => {
    expect(nextPeriodEnd(null, d('2028-01-31T15:45:00Z'), 1).toISOString()).toBe('2028-02-29T15:45:00.000Z');
  });
  it('virada de ano e dia 31 para mês de 30 dias', () => {
    expect(nextPeriodEnd(null, d('2026-08-31T00:00:00Z'), 1).toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(nextPeriodEnd(null, d('2026-11-30T00:00:00Z'), 3).toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });
});

describe('cardTestResult', () => {
  it('classifica os cartões de teste', () => {
    expect(cardTestResult('4242424242424242')).toBe('aprovado');
    expect(cardTestResult('4000000000000002')).toBe('recusado');
    expect(cardTestResult('1234123412341234')).toBe('invalido');
    expect(cardTestResult('')).toBe('invalido');
  });
});

describe('remainingText', () => {
  const now = d('2026-11-09T12:00:00Z');
  it('horas e minutos', () => {
    expect(remainingText(d('2026-11-09T17:12:00Z'), now)).toBe('faltam 5 h 12 min');
  });
  it('só minutos quando 0 h', () => {
    expect(remainingText(d('2026-11-09T12:12:30Z'), now)).toBe('faltam 12 min');
  });
  it('mínimo 1 min', () => {
    expect(remainingText(d('2026-11-09T12:00:20Z'), now)).toBe('faltam 1 min');
    expect(remainingText(d('2026-11-09T11:00:00Z'), now)).toBe('faltam 1 min');
  });
  it('1 h exata', () => {
    expect(remainingText(d('2026-11-09T13:00:00Z'), now)).toBe('faltam 1 h 0 min');
  });
});
