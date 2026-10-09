// Som original: um acorde de Dó maior em arpejo, que nasce do silêncio e some suavemente.
export const OPENING_SOUND = {
  fadeInSeconds: 3,
  totalSeconds: 5,
  peakGain: 0.25,
  notes: [261.63, 329.63, 392.0, 523.25],
};

export function playOpeningSound(
  AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined,
) {
  if (!AudioContextClass) return null;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const { fadeInSeconds, totalSeconds, peakGain, notes } = OPENING_SOUND;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(peakGain, now + fadeInSeconds);
  master.gain.linearRampToValueAtTime(0, now + totalSeconds);
  master.connect(ctx.destination);

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(master);
    osc.start(now + i * 0.6);
    osc.stop(now + totalSeconds);
  });

  setTimeout(() => ctx.close(), (totalSeconds + 0.5) * 1000);
  return ctx;
}
