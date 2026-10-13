import Link from 'next/link';
import { MOODS } from '@/lib/moods';
import { MoodIcon } from '@/components/MoodIcon';
import { imageUrl } from '@/lib/images';

// "Como você quer se sentir hoje?": cartões com a imagem de um filme daquele humor.
// Sem imagens (cards ausente ou sem backdrop), o cartão usa o degradê da marca.
export function MoodPicker({ cards }) {
  const items = cards ?? MOODS.map((m) => ({ slug: m.slug, label: m.label, icon: m.icon, backdropPath: null }));
  return (
    <section aria-labelledby="humor-titulo" className="mt-10 px-4 sm:px-8">
      <h2 id="humor-titulo" className="text-lg font-bold sm:text-xl">Como você quer se sentir hoje?</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((mood) => (
          <li key={mood.slug}>
            <Link
              href={`/explorar?humor=${mood.slug}`}
              className="group relative flex aspect-[16/9] items-end overflow-hidden rounded-xl border border-line bg-surface-2 p-3 transition hover:border-accent hover:shadow-glow"
            >
              {mood.backdropPath ? (
                <img
                  src={imageUrl(mood.backdropPath, 'w780')}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 calm:group-hover:scale-100"
                />
              ) : (
                <span aria-hidden="true" className="neon-gradient absolute inset-0 opacity-60" />
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <span className="relative flex items-center gap-2 font-bold text-white drop-shadow">
                <MoodIcon name={mood.icon} className="h-5 w-5" />
                {mood.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
