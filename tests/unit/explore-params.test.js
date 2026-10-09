import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseExploreParams, toExploreQuery, toDiscoverRequest } from '@/lib/explore-params';
import { ALL_PROVIDER_IDS } from '@/lib/providers';

const parse = (query) => parseExploreParams(new URLSearchParams(query));

afterEach(() => vi.useRealTimers());

describe('parseExploreParams', () => {
  it('usa os padrões sem parâmetros', () => {
    expect(parse('')).toEqual({
      tipo: 'filme', plataformas: [], generos: [], anoDe: null, anoAte: null, nota: null,
      duracao: null, idioma: null, ordem: 'popularidade', humor: null, pagina: 1,
    });
  });

  it('lê todos os filtros válidos', () => {
    expect(parse('tipo=serie&plataforma=8,119&genero=18&anoDe=2000&anoAte=2010&nota=7&idioma=ko&ordem=nota&humor=rir&pagina=3'))
      .toEqual({
        tipo: 'serie', plataformas: [8, 119], generos: [18], anoDe: 2000, anoAte: 2010, nota: 7,
        duracao: null, idioma: 'ko', ordem: 'nota', humor: 'rir', pagina: 3,
      });
  });

  it('aceita valores repetidos vindos do formulário', () => {
    expect(parse('genero=28&genero=35').generos).toEqual([28, 35]);
  });

  it('aceita o objeto searchParams do Next.js', () => {
    expect(parseExploreParams({ genero: ['28', '35'], tipo: 'serie' })).toMatchObject({ generos: [28, 35], tipo: 'serie' });
  });

  it('ignora valores inválidos sem quebrar', () => {
    const f = parse('tipo=xyz&nota=abc&ordem=aleatorio&humor=nada&idioma=portugues&plataforma=999,8&genero=-1,abc&anoDe=1500&pagina=-4&duracao=enorme');
    expect(f).toMatchObject({
      tipo: 'filme', nota: null, ordem: 'popularidade', humor: null, idioma: null,
      plataformas: [8], generos: [], anoDe: null, pagina: 1, duracao: null,
    });
  });

  it('nota fora de 0 a 10 é ignorada', () => {
    expect(parse('nota=11').nota).toBeNull();
    expect(parse('nota=0').nota).toBe(0);
  });

  it('inverte anos trocados', () => {
    expect(parse('anoDe=2020&anoAte=1990')).toMatchObject({ anoDe: 1990, anoAte: 2020 });
  });

  it('limita a página a 500', () => {
    expect(parse('pagina=9999').pagina).toBe(500);
  });

  it('ignora duração em séries', () => {
    expect(parse('tipo=serie&duracao=curto').duracao).toBeNull();
    expect(parse('duracao=curto').duracao).toBe('curto');
  });
});

describe('toExploreQuery', () => {
  it('omite padrões e faz o caminho de volta', () => {
    expect(toExploreQuery(parse(''))).toBe('');
    const query = 'tipo=serie&humor=rir&plataforma=8%2C119&genero=18&anoDe=2000&nota=7&ordem=nota&pagina=2';
    expect(toExploreQuery(parse(query))).toBe(query);
  });
});

describe('toDiscoverRequest', () => {
  it('filme padrão: todas as plataformas, por popularidade', () => {
    const { path, params } = toDiscoverRequest(parse(''));
    expect(path).toBe('/discover/movie');
    expect(params).toEqual({ page: 1, with_watch_providers: ALL_PROVIDER_IDS.join('|'), sort_by: 'popularity.desc' });
  });

  it('plataformas do filtro > Meus streamings > todas', () => {
    expect(toDiscoverRequest(parse('plataforma=8'), { myProviders: [119] }).params.with_watch_providers).toBe('8');
    expect(toDiscoverRequest(parse(''), { myProviders: [119, 337] }).params.with_watch_providers).toBe('119|337');
  });

  it('aplica gêneros, anos, nota, duração e idioma de filmes', () => {
    const { params } = toDiscoverRequest(parse('genero=28,35&anoDe=2000&anoAte=2010&nota=6&duracao=medio&idioma=en'));
    expect(params).toMatchObject({
      with_genres: '28|35',
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2010-12-31',
      'vote_average.gte': 6,
      'with_runtime.gte': 90,
      'with_runtime.lte': 120,
      with_original_language: 'en',
    });
  });

  it('usa os campos de data de séries', () => {
    const { path, params } = toDiscoverRequest(parse('tipo=serie&anoDe=2015'));
    expect(path).toBe('/discover/tv');
    expect(params['first_air_date.gte']).toBe('2015-01-01');
  });

  it('ordenar por nota exige 200 votos', () => {
    expect(toDiscoverRequest(parse('ordem=nota')).params).toMatchObject({ sort_by: 'vote_average.desc', 'vote_count.gte': 200 });
  });

  it('mais recentes não mostra lançamentos futuros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    expect(toDiscoverRequest(parse('tipo=serie&ordem=recentes')).params).toMatchObject({
      sort_by: 'first_air_date.desc', 'first_air_date.lte': '2026-10-08',
    });
  });

  it('humor aplica gêneros e nota mínima do humor', () => {
    expect(toDiscoverRequest(parse('humor=relaxar')).params).toMatchObject({ with_genres: '35|10751|16', 'vote_average.gte': 7 });
  });

  it('gêneros da pessoa substituem os do humor e vale a maior nota', () => {
    expect(toDiscoverRequest(parse('humor=relaxar&genero=12&nota=8')).params).toMatchObject({ with_genres: '12', 'vote_average.gte': 8 });
  });

  it('inclui as palavras-chave já resolvidas', () => {
    expect(toDiscoverRequest(parse('humor=fe'), { keywordIds: [10, 20] }).params.with_keywords).toBe('10|20');
  });
});
