import { describe, it, expect } from 'vitest';
import { pickTrailer, trailerEmbedUrl } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';
import { formatRuntime, formatSeasons, certificationLabel } from '@/lib/format';

const v = (key, iso_639_1, type, extra = {}) => ({ key, site: 'YouTube', iso_639_1, type, official: true, ...extra });

describe('pickTrailer', () => {
  const br = (key, type = 'Trailer') => v(key, 'pt', type, { iso_3166_1: 'BR' });
  const pt = (key, type = 'Trailer') => v(key, 'pt', type, { iso_3166_1: 'PT' });

  it('prefere o trailer dublado do Brasil', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), pt('pt1'), br('br1')])).toEqual({ key: 'br1', lang: 'pt-BR' });
  });
  it('sem dublagem brasileira, usa o inglês (que ganha legendas em português)', () => {
    expect(pickTrailer([pt('pt1'), v('en1', 'en', 'Trailer')])).toEqual({ key: 'en1', lang: 'en' });
  });
  it('usa teaser brasileiro antes de trailer em inglês', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), br('br-teaser', 'Teaser')])).toEqual({ key: 'br-teaser', lang: 'pt-BR' });
  });
  it('a versão de Portugal é a última opção', () => {
    expect(pickTrailer([pt('pt1'), v('x', 'fr', 'Trailer')])).toEqual({ key: 'pt1', lang: 'pt-PT' });
  });
  it('prefere o oficial e ignora vídeos fora do YouTube', () => {
    expect(pickTrailer([{ ...br('vimeo'), site: 'Vimeo' }, v('fan', 'en', 'Trailer', { official: false }), v('oficial', 'en', 'Trailer')]))
      .toEqual({ key: 'oficial', lang: 'en' });
  });
  it('devolve null sem vídeos adequados', () => {
    expect(pickTrailer([v('x', 'pt', 'Featurette')])).toBeNull();
    expect(pickTrailer(undefined)).toBeNull();
  });
});

describe('trailerEmbedUrl', () => {
  it('usa o domínio sem cookies e as opções pedidas', () => {
    const url = new URL(trailerEmbedUrl('abc', { autoplay: true, muted: true, loop: true }));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/abc');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('abc');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
  });
  it('modo de fundo esconde controles, anotações e atalhos do player', () => {
    const url = new URL(trailerEmbedUrl('abc', { background: true }));
    expect(url.searchParams.get('controls')).toBe('0');
    expect(url.searchParams.get('iv_load_policy')).toBe('3');
    expect(url.searchParams.get('disablekb')).toBe('1');
    expect(url.searchParams.get('fs')).toBe('0');
  });
  it('pode ligar as legendas em português', () => {
    const url = new URL(trailerEmbedUrl('abc', { subtitles: true }));
    expect(url.searchParams.get('cc_load_policy')).toBe('1');
    expect(url.searchParams.get('cc_lang_pref')).toBe('pt');
    expect(url.searchParams.get('hl')).toBe('pt-BR');
  });
  it('sem opções não toca sozinho nem fica mudo', () => {
    const url = new URL(trailerEmbedUrl('abc'));
    expect(url.searchParams.has('autoplay')).toBe(false);
    expect(url.searchParams.has('mute')).toBe(false);
  });
});

describe('brazilCertification', () => {
  it('lê a classificação brasileira de um filme', () => {
    const details = { release_dates: { results: [
      { iso_3166_1: 'US', release_dates: [{ certification: 'PG-13' }] },
      { iso_3166_1: 'BR', release_dates: [{ certification: '' }, { certification: '14' }] },
    ] } };
    expect(brazilCertification(details, 'movie')).toBe('14');
  });
  it('lê a classificação brasileira de uma série', () => {
    expect(brazilCertification({ content_ratings: { results: [{ iso_3166_1: 'BR', rating: 'L' }] } }, 'tv')).toBe('L');
  });
  it('devolve null quando não há classificação para o Brasil', () => {
    expect(brazilCertification({ release_dates: { results: [] } }, 'movie')).toBeNull();
    expect(brazilCertification({}, 'tv')).toBeNull();
  });
});

describe('formatação', () => {
  it('formata a duração', () => {
    expect(formatRuntime(128)).toBe('2h 8min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(null)).toBeNull();
  });
  it('formata temporadas', () => {
    expect(formatSeasons(1)).toBe('1 temporada');
    expect(formatSeasons(3)).toBe('3 temporadas');
    expect(formatSeasons(null)).toBeNull();
  });
  it('descreve a classificação por extenso', () => {
    expect(certificationLabel('L')).toBe('Classificação indicativa: livre');
    expect(certificationLabel('12')).toBe('Classificação indicativa: 12 anos');
  });
});
