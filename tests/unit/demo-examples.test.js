// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/tmdb/client', () => ({
  tmdbFetch: vi.fn(async (path) => ({ results: path.includes('/movie/') ? [{ id: 1 }, { id: 2 }, { id: 3 }] : [{ id: 7 }] })),
}));
vi.mock('@/lib/tmdb/catalog', () => ({
  CACHE: { rows: 1 },
  getTitleDetails: vi.fn(async () => { throw new Error('a demonstração usa só os dados leves'); }),
  getTitleBasics: vi.fn(async (type, id) => {
    if (type === 'tv') return id === 7 ? { id: 7, providers: [] } : null; // fora das assinaturas não serve
    if (id === 1) { await new Promise((r) => setTimeout(r, 30)); return null; }
    if (id === 2) { await new Promise((r) => setTimeout(r, 30)); return { id: 2, providers: [{ id: 8 }] }; }
    return { id: 3, providers: [{ id: 8 }] };
  }),
}));

import { loadDemoExamples } from '@/lib/lists/demo-examples';

describe('loadDemoExamples', () => {
  it('pega o primeiro disponível na ordem da tendência, mesmo que um anterior responda depois', async () => {
    const { movie, tv } = await loadDemoExamples();
    expect(movie).toEqual({ id: 2, providers: [{ id: 8 }] });
    expect(tv).toBeNull();
  });
});
