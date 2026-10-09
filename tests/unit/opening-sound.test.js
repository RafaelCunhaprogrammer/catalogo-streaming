import { describe, it, expect, vi } from 'vitest';
import { OPENING_SOUND, playOpeningSound } from '@/lib/opening-sound';

function fakeAudioContext() {
  const ramps = [];
  const oscillators = [];
  class FakeContext {
    constructor() {
      this.currentTime = 10;
      this.destination = {};
      this.close = vi.fn();
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: (value, time) => ramps.push(['set', value, time]),
          linearRampToValueAtTime: (value, time) => ramps.push(['ramp', value, time]),
        },
        connect: vi.fn(),
      };
    }
    createOscillator() {
      const osc = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }
  }
  return { FakeContext, ramps, oscillators };
}

describe('playOpeningSound', () => {
  it('começa em silêncio, sobe em 3 s e termina em 5 s', () => {
    const { FakeContext, ramps } = fakeAudioContext();
    playOpeningSound(FakeContext);
    expect(ramps).toEqual([
      ['set', 0, 10],
      ['ramp', OPENING_SOUND.peakGain, 13],
      ['ramp', 0, 15],
    ]);
  });

  it('toca uma nota por frequência e para todas no fim', () => {
    const { FakeContext, oscillators } = fakeAudioContext();
    playOpeningSound(FakeContext);
    expect(oscillators).toHaveLength(OPENING_SOUND.notes.length);
    for (const osc of oscillators) expect(osc.stop).toHaveBeenCalledWith(15);
  });

  it('sem suporte a áudio não faz nada', () => {
    expect(playOpeningSound(undefined)).toBeNull();
  });
});
