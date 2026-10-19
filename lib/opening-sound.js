// Som de abertura: o "woosh" escolhido, cortado em 6 segundos e com o final sumindo aos poucos.
export const OPENING_SOUND = {
  src: '/som-abertura.mp3',
  volume: 0.6,
};

export function playOpeningSound(AudioClass = typeof window !== 'undefined' ? window.Audio : undefined) {
  if (!AudioClass) return null;
  const audio = new AudioClass(OPENING_SOUND.src);
  audio.volume = OPENING_SOUND.volume;
  // O navegador pode recusar o som (aba sem interação, modo economia): segue em silêncio.
  const playing = audio.play();
  if (playing && typeof playing.catch === 'function') playing.catch(() => {});
  return audio;
}
