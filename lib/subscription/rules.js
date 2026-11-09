// Regras puras da assinatura (sem acesso a banco): servem ao servidor e ao navegador.
export const TRIAL_HOURS = 6;

export const trialEnd = (createdAt) => new Date(new Date(createdAt).getTime() + TRIAL_HOURS * 3600 * 1000);

export function accessState(sub, now = new Date()) {
  if (!sub) return { kind: 'sem-acesso', until: null, canceled: false };
  const t = now.getTime();
  const periodEnd = sub.periodEnd ? new Date(sub.periodEnd) : null;
  if (periodEnd && t < periodEnd.getTime()) {
    return { kind: 'ativa', until: periodEnd, canceled: sub.status === 'cancelada' };
  }
  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  if (sub.status === 'teste' && trialEndsAt && t < trialEndsAt.getTime()) {
    return { kind: 'teste', until: trialEndsAt, canceled: false };
  }
  return { kind: 'sem-acesso', until: null, canceled: false };
}

// max(now, fim atual) + meses de calendário (UTC). Se o dia não existe no mês de destino, vale o último dia dele.
export function nextPeriodEnd(currentEnd, now, months) {
  const nowD = new Date(now);
  const cur = currentEnd ? new Date(currentEnd) : null;
  const base = cur && cur.getTime() > nowD.getTime() ? cur : nowD;
  const total = base.getUTCFullYear() * 12 + base.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year, month, Math.min(base.getUTCDate(), lastDay),
    base.getUTCHours(), base.getUTCMinutes(), base.getUTCSeconds(), base.getUTCMilliseconds(),
  ));
}

// Cartões de teste da simulação (só dígitos).
export function cardTestResult(digits) {
  if (digits === '4242424242424242') return 'aprovado';
  if (digits === '4000000000000002') return 'recusado';
  return 'invalido';
}

export function remainingText(until, now = new Date()) {
  const mins = Math.max(1, Math.floor((new Date(until).getTime() - new Date(now).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `faltam ${h} h ${m} min` : `faltam ${m} min`;
}
