// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  STATUSES,
  MAX_MARKS,
  EMPTY_MARK,
  titleKey,
  parseTarget,
  nextStatus,
  applyChange,
  nextEpisode,
  isEmptyMark,
  seasonsWithoutSpecials,
} from '@/lib/lists/rules';

const seasons = [
  { number: 1, episodes: 8 },
  { number: 2, episodes: 6 },
];
const tv = { type: 'tv', seasons };

describe('constantes', () => {
  it('expõe situações, limite e marcação vazia', () => {
    expect(STATUSES).toEqual(['nenhum', 'assistindo', 'assistido']);
    expect(MAX_MARKS).toBe(500);
    expect(EMPTY_MARK).toEqual({ favorite: false, status: 'nenhum', season: null, episode: null });
  });
  it('titleKey junta tipo e id', () => {
    expect(titleKey('tv', 201)).toBe('tv-201');
  });
});

describe('parseTarget', () => {
  it('aceita tipo válido e id inteiro positivo', () => {
    expect(parseTarget('tv', '201')).toEqual({ type: 'tv', id: 201 });
  });
  it('rejeita tipo, id negativo e notação científica', () => {
    expect(parseTarget('pessoa', 1)).toBeNull();
    expect(parseTarget('movie', -3)).toBeNull();
    expect(parseTarget('movie', '1e3')).toBeNull();
  });
});

describe('nextStatus', () => {
  it('clicar no mesmo volta a nenhum', () => {
    expect(nextStatus('assistindo', 'assistindo')).toBe('nenhum');
  });
  it('clicar em outro troca', () => {
    expect(nextStatus('assistindo', 'assistido')).toBe('assistido');
  });
});

describe('applyChange', () => {
  it('favorito e assistido convivem', () => {
    const m = applyChange({ ...EMPTY_MARK, favorite: true }, { status: 'assistido' }, tv);
    expect(m.favorite).toBe(true);
    expect(m.status).toBe('assistido');
  });
  it('assistido limpa temporada e episódio', () => {
    const m = applyChange(
      { favorite: false, status: 'assistindo', season: 2, episode: 5 },
      { status: 'assistido' },
      tv,
    );
    expect(m.season).toBeNull();
    expect(m.episode).toBeNull();
  });
  it('null parte da marcação vazia e série entra em T1 E1', () => {
    const m = applyChange(null, { status: 'assistindo' }, tv);
    expect(m).toEqual({ favorite: false, status: 'assistindo', season: 1, episode: 1 });
  });
  it('série sem temporadas entra em assistindo sem posição', () => {
    const m = applyChange(null, { status: 'assistindo' }, { type: 'tv', seasons: [] });
    expect(m.season).toBeNull();
    expect(m.episode).toBeNull();
  });
  it('temporada inexistente vai para a última', () => {
    const base = { favorite: false, status: 'assistindo', season: 1, episode: 1 };
    const m = applyChange(base, { season: 5, episode: 3 }, tv);
    expect([m.season, m.episode]).toEqual([2, 3]);
  });
  it('episódio acima do total vai para o último da temporada', () => {
    const base = { favorite: false, status: 'assistindo', season: 1, episode: 1 };
    const m = applyChange(base, { season: 2, episode: 99 }, tv);
    expect([m.season, m.episode]).toEqual([2, 6]);
  });
  it('filme nunca tem temporada nem episódio', () => {
    const m = applyChange(null, { status: 'assistindo', season: 1, episode: 2 }, { type: 'movie', seasons: [] });
    expect(m).toEqual({ favorite: false, status: 'assistindo', season: null, episode: null });
  });
  it('voltar a nenhum limpa a posição', () => {
    const base = { favorite: true, status: 'assistindo', season: 1, episode: 4 };
    const m = applyChange(base, { status: 'nenhum' }, tv);
    expect([m.season, m.episode]).toEqual([null, null]);
  });
});

describe('nextEpisode', () => {
  it('avança um episódio', () => {
    expect(nextEpisode({ season: 1, episode: 3 }, seasons)).toEqual({ season: 1, episode: 4, finished: false });
  });
  it('vira a temporada', () => {
    expect(nextEpisode({ season: 1, episode: 8 }, seasons)).toEqual({ season: 2, episode: 1, finished: false });
  });
  it('último episódio da série termina sem mudar a posição', () => {
    expect(nextEpisode({ season: 2, episode: 6 }, seasons)).toEqual({ season: 2, episode: 6, finished: true });
  });
});

describe('isEmptyMark', () => {
  it('reconhece a marcação vazia', () => {
    expect(isEmptyMark(EMPTY_MARK)).toBe(true);
    expect(isEmptyMark({ ...EMPTY_MARK, favorite: true })).toBe(false);
    expect(isEmptyMark({ ...EMPTY_MARK, status: 'assistido' })).toBe(false);
  });
});

describe('seasonsWithoutSpecials', () => {
  it('tira especiais e temporadas sem episódios', () => {
    expect(
      seasonsWithoutSpecials([
        { season_number: 0, episode_count: 3 },
        { season_number: 1, episode_count: 8 },
        { season_number: 2, episode_count: 0 },
      ]),
    ).toEqual([{ number: 1, episodes: 8 }]);
  });
});
