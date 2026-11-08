import { describe, it, expect } from 'vitest';
import { buildCover, coverHeaderData, coverOptions, visibleCover } from '@/lib/cover';

const at = (n) => new Date(Date.UTC(2026, 10, n));
const mark = (id, extra = {}, snap = {}) => ({
  mediaType: 'movie', tmdbId: id, favorite: true, status: 'nenhum', favoriteAt: at(id),
  snapshot: { title: `Filme ${id}`, backdropPath: `/b${id}.jpg`, certification: '12', ...snap },
  ...extra,
});

describe('coverOptions', () => {
  it('só favoritos com imagem de fundo, os mais recentes primeiro', () => {
    const marks = [
      mark(1),
      mark(2, { favorite: false, status: 'assistido' }),
      mark(3, {}, { backdropPath: null }),
      mark(4, { mediaType: 'tv' }),
      mark(5, { snapshot: null }),
    ];
    expect(coverOptions(marks, {})).toEqual([
      { type: 'tv', id: 4, title: 'Filme 4', backdropPath: '/b4.jpg' },
      { type: 'movie', id: 1, title: 'Filme 1', backdropPath: '/b1.jpg' },
    ]);
  });

  it('no Kids, só os favoritos dentro da faixa (sem contar liberações do PIN)', () => {
    const marks = [mark(1, {}, { certification: '10' }), mark(2, {}, { certification: '14' }), mark(3, {}, { certification: null })];
    expect(coverOptions(marks, { maxRating: '10' }).map((o) => o.id)).toEqual([1]);
  });
});

describe('coverHeaderData (o que a Minha lista manda ao navegador)', () => {
  it('contagens, opções e a capa; no Kids, capa acima da faixa não sai do servidor', () => {
    const rows = [
      mark(1, { status: 'assistindo' }),
      mark(2, { favorite: false, status: 'assistido' }),
      mark(3, { favorite: false, status: 'assistido' }, { certification: '10' }),
    ];
    const cover = buildCover(mark(9, {}, { certification: '14' }), null);
    const adulto = coverHeaderData(rows, { cover }, null);
    expect(adulto.counts).toEqual({ favoritos: 1, assistindo: 1, assistidos: 2 });
    expect(adulto.cover).toEqual(cover);
    expect(adulto.options.map((o) => o.id)).toEqual([1]);
    const kids = coverHeaderData(rows, { cover }, '10');
    expect(kids.cover).toBeNull();
    expect(kids.options).toEqual([]);
    expect(coverHeaderData([], {}, null)).toEqual({ counts: { favoritos: 0, assistindo: 0, assistidos: 0 }, options: [], cover: null });
  });
});

describe('buildCover e visibleCover', () => {
  it('monta a capa a partir da marcação, com a classificação e a cor', () => {
    const accent = { dark: '#aabbcc', light: '#112233' };
    expect(buildCover(mark(7, { mediaType: 'tv' }), accent)).toEqual({
      type: 'tv', id: 7, title: 'Filme 7', backdropPath: '/b7.jpg', certification: '12', accent,
    });
  });

  it('capa acima da faixa do Kids (a faixa mudou depois) vira página padrão; adulto vê sempre', () => {
    const cover = buildCover(mark(7, {}, { certification: '14' }), null);
    expect(visibleCover(cover, { maxRating: '10' })).toBeNull();
    expect(visibleCover(cover, { maxRating: '14' })).toEqual(cover);
    expect(visibleCover(cover, { maxRating: null })).toEqual(cover);
    expect(visibleCover(null, {})).toBeNull();
  });
});
