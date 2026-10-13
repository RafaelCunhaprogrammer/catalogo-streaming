import Link from 'next/link';
import { MOODS } from '@/lib/moods';
import { MoodIcon } from '@/components/MoodIcon';
import { imageUrl } from '@/lib/images';

// "Como você quer se sentir hoje?": cartões com a imagem de um filme daquele humor.
// O cartão leva à lista do humor; o nome do filme (ao passar o mouse ou focar) leva à página do filme.
// Os dois links ficam lado a lado, nunca um dentro do outro. Sem imagem, o cartão usa o degradê da marca.
export function MoodPicker({ cards }) {
  const items = cards ?? MOODS.map((m) => ({ slug: m.slug, label: m.label, icon: m.icon, backdropPath: null }));
  return (
    <section aria-labelledby="humor-titulo" className="mt-10 px-4 sm:px-8">
      <h2 id="humor-titulo" className="text-lg font-bold sm:text-xl">Como você quer se sentir hoje?</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((mood) => (
          <li
            key={mood.slug}
            className="group relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-surface-2 transition hover:border-accent hover:shadow-glow"
          >
            {mood.backdropPath ? (
              <img
                src={imageUrl(mood.backdropPath, 'w780')}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110 group-focus-within:scale-110 calm:group-hover:scale-100 calm:group-focus-within:scale-100"
              />
            ) : (
              <span aria-hidden="true" className="neon-gradient absolute inset-0 opacity-60" />
            )}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <Link href={`/explorar?humor=${mood.slug}`} aria-label={mood.label} className="absolute inset-0 flex items-end p-3 pb-8">
              <span className="flex items-center gap-2 font-bold text-white drop-shadow">
                <MoodIcon name={mood.icon} className="h-5 w-5" />
                {mood.label}
              </span>
            </Link>
            {mood.filmId && mood.filmTitle && mood.backdropPath && (
              <Link
                href={`/filme/${mood.filmId}`}
                className="absolute bottom-2 left-3 right-3 z-10 truncate text-xs text-white/90 underline-offset-2 opacity-0 transition-opacity duration-300 hover:underline group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                {mood.filmTitle}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
