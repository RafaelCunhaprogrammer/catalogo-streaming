import { describe, it, expect } from 'vitest';
import { pickTitleArt } from '@/lib/tmdb/normalize';

const logo = (iso_639_1, vote_average, file_path) => ({ iso_639_1, vote_average, file_path });

describe('pickTitleArt', () => {
  it('prefere português, mesmo com o inglês mais votado', () => {
    expect(pickTitleArt([logo('en', 9, '/en.png'), logo('pt', 3, '/pt.png')])).toBe('/pt.png');
  });

  it('sem português, usa o inglês', () => {
    expect(pickTitleArt([logo('en', 2, '/a.png'), logo('en', 7, '/b.png')])).toBe('/b.png');
  });

  it('ignora outros idiomas e SVG', () => {
    expect(pickTitleArt([logo('es', 9, '/es.png'), logo('pt', 9, '/pt.svg')])).toBeNull();
  });

  it('sem lista, não quebra', () => {
    expect(pickTitleArt()).toBeNull();
  });
});
