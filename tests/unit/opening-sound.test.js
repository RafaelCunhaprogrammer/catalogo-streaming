import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { OPENING_SOUND, playOpeningSound } from '@/lib/opening-sound';

function fakeAudio(play = () => Promise.resolve()) {
  const created = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.play = vi.fn(play);
      created.push(this);
    }
  }
  return { FakeAudio, created };
}

describe('playOpeningSound', () => {
  it('toca o arquivo do som de abertura, num volume confortável', () => {
    const { FakeAudio, created } = fakeAudio();
    playOpeningSound(FakeAudio);
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe(OPENING_SOUND.src);
    expect(created[0].volume).toBe(OPENING_SOUND.volume);
    expect(created[0].play).toHaveBeenCalled();
  });

  it('o arquivo do som existe na pasta public', () => {
    expect(existsSync(join(process.cwd(), 'public', OPENING_SOUND.src))).toBe(true);
  });

  it('se o navegador recusar o som, segue em silêncio sem erro', async () => {
    const { FakeAudio } = fakeAudio(() => Promise.reject(new Error('NotAllowedError')));
    expect(() => playOpeningSound(FakeAudio)).not.toThrow();
    await Promise.resolve();
  });

  it('sem suporte a áudio não faz nada', () => {
    expect(playOpeningSound(null)).toBeNull();
  });
});
