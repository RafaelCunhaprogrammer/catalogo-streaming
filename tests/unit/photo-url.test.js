import { describe, it, expect } from 'vitest';
import { photoUrl } from '@/lib/photos/url';

describe('photoUrl', () => {
  it('sem photoKey devolve null', () => {
    expect(photoUrl({ id: 'p1', photoKey: null })).toBeNull();
    expect(photoUrl({ id: 'p1' })).toBeNull();
  });

  it('com photoKey expõe só o nome do arquivo em ?v=', () => {
    expect(photoUrl({ id: 'p1', photoKey: 'fotos/p1/abcd1234abcd1234.webp' })).toBe('/api/foto/p1?v=abcd1234abcd1234');
  });
});
