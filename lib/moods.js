// genres: qualquer um dos gêneros (OU). keywords: nomes de palavras-chave do TMDB (OU).
// Quando há genres e keywords, o título precisa ter os dois. excludeGenres: gêneros que nunca entram.
// tv: null = só filmes.
// 'based on true story' ficou de fora: trazia qualquer drama biográfico (conferido no TMDB real).
const SUPERACAO = ['sports', 'overcoming adversity', 'underdog'];
// 'religion' ficou de fora: trazia O Poderoso Chefão, O Irlandês etc. (conferido no TMDB real).
const FE = ['faith', 'christianity', 'bible', 'spirituality', 'jesus christ', 'judaism', 'spiritism'];

export const MOODS = [
  { slug: 'relaxar', icon: 'Coffee', label: 'Relaxar',
    movie: { genres: [35, 10751, 16], minRating: 7 }, tv: { genres: [35, 10751, 16], minRating: 7 } },
  { slug: 'rir', icon: 'Laugh', label: 'Rir', movie: { genres: [35] }, tv: { genres: [35] } },
  { slug: 'superacao', icon: 'Trophy', label: 'Histórias de superação',
    movie: { genres: [18], keywords: SUPERACAO }, tv: { genres: [18], keywords: SUPERACAO } },
  { slug: 'emocionar', icon: 'HeartHandshake', label: 'Me emocionar',
    movie: { genres: [18, 10749], minRating: 7.5 }, tv: { genres: [18], minRating: 7.5 } },
  { slug: 'adrenalina', icon: 'Zap', label: 'Adrenalina', movie: { genres: [28, 53] }, tv: { genres: [10759] } },
  { slug: 'medo', icon: 'Ghost', label: 'Sentir medo', movie: { genres: [27] }, tv: null },
  { slug: 'paixao', icon: 'Heart', label: 'Me apaixonar', movie: { genres: [10749] }, tv: null },
  // O TMDB marca filmes de possessão e terror com 'religion'; por isso terror/suspense (séries: mistério) ficam de fora.
  { slug: 'fe', icon: 'Church', label: 'Fé e espiritualidade',
    movie: { keywords: FE, excludeGenres: [27, 53] }, tv: { keywords: FE, excludeGenres: [9648] } },
];

export function getMood(slug) {
  return MOODS.find((m) => m.slug === slug);
}
