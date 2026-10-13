// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mockTmdb } from '../helpers/mock-tmdb';
import { metadata as layoutMetadata } from '@/app/layout';
import { metadata as exploreMetadata } from '@/app/explorar/page';
import { metadata as moviesMetadata } from '@/app/filmes/page';
import { metadata as seriesPageMetadata } from '@/app/series/page';
import { generateMetadata as searchMetadata } from '@/app/busca/page';
import { generateMetadata as movieMetadata } from '@/app/filme/[id]/page';
import { generateMetadata as seriesMetadata } from '@/app/serie/[id]/page';

const available = { results: { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null }] } } };

describe('títulos das páginas', () => {
  it('o layout define o modelo "Página · Pai d’Égua"', () => {
    expect(layoutMetadata.title).toEqual({ default: "Pai d'Égua", template: "%s · Pai d'Égua" });
  });

  it('Filmes e Séries têm título próprio', () => {
    expect(moviesMetadata.title).toBe('Filmes');
    expect(seriesPageMetadata.title).toBe('Séries');
  });

  it('Explorar e Busca têm título próprio', async () => {
    expect(exploreMetadata.title).toBe('Explorar');
    expect(await searchMetadata({ searchParams: Promise.resolve({ q: 'ação' }) })).toEqual({ title: 'Busca: ação' });
    expect(await searchMetadata({ searchParams: Promise.resolve({}) })).toEqual({ title: 'Buscar' });
  });

  it('filme e série usam o nome do título, ou Não encontrado', async () => {
    mockTmdb({
      '/movie/101': { id: 101, title: 'Aventura Neon', 'watch/providers': available },
      '/tv/201': { id: 201, name: 'Série Brilhante', 'watch/providers': available },
    });
    expect(await movieMetadata({ params: Promise.resolve({ id: '101' }) })).toEqual({ title: 'Aventura Neon' });
    expect(await seriesMetadata({ params: Promise.resolve({ id: '201' }) })).toEqual({ title: 'Série Brilhante' });
    expect(await movieMetadata({ params: Promise.resolve({ id: '999' }) })).toEqual({ title: 'Não encontrado' });
  });
});
