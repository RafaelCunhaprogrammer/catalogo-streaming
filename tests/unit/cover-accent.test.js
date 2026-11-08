// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import sharp from 'sharp';
import { accentPair, adjustForBackground, contrastRatio, extractAccent } from '@/lib/cover-accent';

const DARK_BG = '#0d0820';
const LIGHT_BG = '#ffffff';

const png = (r, g, b) => sharp({ create: { width: 4, height: 4, channels: 3, background: { r, g, b } } }).png().toBuffer();
const imageResponse = async (buffer) => new Response(buffer, { status: 200, headers: { 'content-type': 'image/png' } });

afterEach(() => vi.unstubAllEnvs());

describe('contraste (WCAG)', () => {
  it('preto e branco: 21:1; mesma cor: 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#8b5cf6', '#8b5cf6')).toBeCloseTo(1, 5);
  });

  it('para qualquer cor de entrada, a cor ajustada tem pelo menos 3:1 com o fundo dos dois temas', () => {
    for (const color of ['#000000', '#ffffff', '#808080', '#0b2a2e', '#ff0000', '#fde047', '#1e0b33']) {
      const { dark, light } = accentPair(color);
      expect(contrastRatio(dark, DARK_BG), `${color} no escuro`).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(light, LIGHT_BG), `${color} no claro`).toBeGreaterThanOrEqual(3);
    }
  });

  it('cor que já passa fica como está', () => {
    expect(adjustForBackground('#2dd4bf', DARK_BG)).toBe('#2dd4bf');
  });

  it('o ajuste mantém o matiz: um vermelho escuro continua avermelhado', () => {
    const dark = accentPair('#5a0000').dark;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(dark.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });
});

describe('extractAccent', () => {
  it('tira a cor média da imagem pequena do TMDB e devolve as duas versões', async () => {
    vi.stubEnv('TMDB_IMAGE_BASE_URL', 'https://imagens.teste/t/p');
    const fetchImpl = vi.fn(async () => imageResponse(await png(200, 30, 30)));
    const accent = await extractAccent('/capa.jpg', { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://imagens.teste/t/p/w300/capa.jpg');
    expect(accent.dark).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(accent.dark.slice(1, 3), 16)).toBeGreaterThan(parseInt(accent.dark.slice(3, 5), 16));
    expect(contrastRatio(accent.light, LIGHT_BG)).toBeGreaterThanOrEqual(3);
  });

  it('sem imagem, rede fora ou resposta de erro: null', async () => {
    expect(await extractAccent(null)).toBeNull();
    expect(await extractAccent('/x.jpg', { fetchImpl: vi.fn().mockRejectedValue(new TypeError('rede')) })).toBeNull();
    expect(await extractAccent('/x.jpg', { fetchImpl: vi.fn(async () => new Response('nada', { status: 404 })) })).toBeNull();
    expect(await extractAccent('/x.jpg', { fetchImpl: vi.fn(async () => new Response('não é imagem', { status: 200 })) })).toBeNull();
  });

  it('imagem que não chega a tempo: null, sem esperar além do limite', async () => {
    const fetchImpl = vi.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('tempo', 'AbortError')));
    }));
    const start = Date.now();
    expect(await extractAccent('/lenta.jpg', { fetchImpl, timeoutMs: 50 })).toBeNull();
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
