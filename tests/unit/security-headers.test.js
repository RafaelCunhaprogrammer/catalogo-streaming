// @vitest-environment node
import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config.mjs';

describe('cabeçalhos de segurança', () => {
  it('valem para todas as páginas', async () => {
    const rules = await nextConfig.headers();
    const all = rules.find((r) => r.source === '/:path*');
    expect(all).toBeDefined();
    const headers = Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
    // Ninguém abre o site dentro de um iframe (telas de PIN e de conta ficam a salvo de clickjacking).
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });
});
