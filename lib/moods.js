// genres: qualquer um dos gêneros (OU). keywords: nomes de palavras-chave do TMDB (OU).
// Quando há genres e keywords, o título precisa ter os dois. tv: null = só filmes.
const SUPERACAO = ['sports', 'based on true story', 'overcoming adversity', 'underdog'];
const FE = ['faith', 'christianity', 'bible', 'religion', 'spirituality', 'jesus christ', 'judaism', 'spiritism'];

export const MOODS = [
  { slug: 'relaxar', emoji: '😌', label: 'Relaxar',
    movie: { genres: [35, 10751, 16], minRating: 7 }, tv: { genres: [35, 10751, 16], minRating: 7 } },
  { slug: 'rir', emoji: '😂', label: 'Rir', movie: { genres: [35] }, tv: { genres: [35] } },
  { slug: 'superacao', emoji: '💪', label: 'Histórias de superação',
    movie: { genres: [18], keywords: SUPERACAO }, tv: { genres: [18], keywords: SUPERACAO } },
  { slug: 'emocionar', emoji: '🥹', label: 'Me emocionar',
    movie: { genres: [18, 10749], minRating: 7.5 }, tv: { genres: [18], minRating: 7.5 } },
  { slug: 'adrenalina', emoji: '⚡', label: 'Adrenalina', movie: { genres: [28, 53] }, tv: { genres: [10759] } },
  { slug: 'medo', emoji: '😱', label: 'Sentir medo', movie: { genres: [27] }, tv: null },
  { slug: 'paixao', emoji: '❤️', label: 'Me apaixonar', movie: { genres: [10749] }, tv: null },
  { slug: 'fe', emoji: '🙏', label: 'Fé e espiritualidade', movie: { keywords: FE }, tv: { keywords: FE } },
];

export function getMood(slug) {
  return MOODS.find((m) => m.slug === slug);
}
