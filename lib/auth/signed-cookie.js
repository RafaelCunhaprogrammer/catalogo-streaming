import { createHmac, timingSafeEqual } from 'node:crypto';

// "valor.assinatura": impede que alguém troque o valor do cookie à mão.
export function signValue(value, secret) {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

export function verifySignedValue(signed, secret) {
  if (typeof signed !== 'string') return null;
  const dot = signed.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const expected = Buffer.from(signValue(value, secret));
  const received = Buffer.from(signed);
  return expected.length === received.length && timingSafeEqual(expected, received) ? value : null;
}
