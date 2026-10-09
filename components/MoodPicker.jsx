import Link from 'next/link';
import { MOODS } from '@/lib/moods';

export function MoodPicker() {
  return (
    <section aria-labelledby="humor-titulo" className="mt-10 px-4 sm:px-8">
      <h2 id="humor-titulo" className="text-lg font-bold sm:text-xl">Como você quer se sentir hoje?</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <li key={mood.slug}>
            <Link
              href={`/explorar?humor=${mood.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 transition hover:border-accent hover:shadow-glow"
            >
              <span aria-hidden="true">{mood.emoji}</span>
              {mood.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
