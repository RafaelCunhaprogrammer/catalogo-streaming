// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { shouldMigrate } from '@/lib/db/migrate';

describe('shouldMigrate', () => {
  it('migra fora da Vercel (computador, testes)', () => {
    expect(shouldMigrate({})).toBe(true);
  });

  it('migra no build de produção da Vercel', () => {
    expect(shouldMigrate({ VERCEL_ENV: 'production' })).toBe(true);
  });

  it('não migra nas prévias da Vercel, que usam o mesmo banco da produção', () => {
    expect(shouldMigrate({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldMigrate({ VERCEL_ENV: 'development' })).toBe(false);
  });
});
