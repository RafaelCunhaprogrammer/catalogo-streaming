import { notFound } from 'next/navigation';
import { getTitleDetails } from '@/lib/tmdb/catalog';
import { imageSet } from '@/lib/images';
import { formatRuntime, formatSeasons, certificationLabel, CERTIFICATION_STYLES } from '@/lib/format';
import { TrailerButton } from '@/components/TrailerButton';
import { Row } from '@/components/Row';
import { ExternalLink, Star } from 'lucide-react';
import { watchUrl } from '@/lib/providers';
import { getTitleRating, ratingAllowed, annotateRatings } from '@/lib/tmdb/ratings';
import { PinGate } from '@/components/kids/PinGate';
import { TitleActions } from '@/components/lists/TitleActions';
import { getDb } from '@/lib/db';
import { buildSnapshot } from '@/lib/lists/snapshot';
import { refreshSnapshot } from '@/lib/lists/store';

function Certification({ value }) {
  if (!value) return <span className="text-sm text-white/70">Classificação não informada</span>;
  return (
    <span
      aria-label={certificationLabel(value)}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-black ${CERTIFICATION_STYLES[value] ?? 'bg-white/20 text-white'}`}
    >
      {value}
    </span>
  );
}

export function TitleView({ title }) {
  const backdrop = imageSet(title.backdropPath, 'backdrop');
  const poster = imageSet(title.posterPath, 'poster');
  const duration = title.type === 'movie' ? formatRuntime(title.runtime) : formatSeasons(title.seasons);
  const meta = [title.year, title.genres.join(', '), duration].filter(Boolean);

  return (
    <article>
      <section className="relative overflow-hidden bg-[#0d0820] text-white">
        {backdrop && <img src={backdrop.src} srcSet={backdrop.srcSet} sizes="100vw" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0820] via-[#0d0820]/70 to-transparent" />
        <div className="relative flex flex-col gap-6 px-4 py-10 sm:flex-row sm:px-8 sm:py-16">
          {poster && <img src={poster.src} srcSet={poster.srcSet} sizes="(min-width: 640px) 224px, 160px" alt={`Cartaz de ${title.title}`} className="w-40 self-start rounded-xl shadow-glow sm:w-56" />}
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black sm:text-5xl">{title.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/85">
              <Certification value={title.certification} />
              {meta.map((item) => <span key={item}>{item}</span>)}
              {title.rating ? (
                <span aria-label={`Nota ${title.rating.toFixed(1)} de 10`} className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {title.rating.toFixed(1)}
                </span>
              ) : null}
            </div>
            {title.overview && <p className="mt-5 text-justify text-base leading-relaxed text-white/90 hyphens-auto">{title.overview}</p>}
            {title.trailerKey && <TrailerButton trailerKey={title.trailerKey} subtitles={title.trailerSubtitles} title={title.title} className="mt-6" />}
          </div>
        </div>
      </section>

      <section aria-labelledby="onde-assistir" className="px-4 pt-10 sm:px-8">
        <h2 id="onde-assistir" className="text-lg font-bold sm:text-xl">Onde assistir</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {title.providers.map((p) => {
            const href = watchUrl(p.id, title.title, title.watchLink);
            const chip = (
              <>
                {p.logoPath && <img {...imageSet(p.logoPath, 'logo')} sizes="32px" alt="" className="h-8 w-8 rounded-lg" />}
                <span>{href ? `Assistir na ${p.name}` : p.name}</span>
              </>
            );
            return (
              <li key={p.id}>
                {href ? (
                  // Abre a plataforma em outra aba: o site é um catálogo, quem exibe o filme é o streaming.
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 font-semibold hover:border-accent hover:text-accent-text"
                  >
                    {chip}
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">(abre em outra aba)</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">{chip}</span>
                )}
              </li>
            );
          })}
        </ul>
        <TitleActions title={{ id: title.id, type: title.type, title: title.title }} seasons={title.seasonList ?? []} />
        {title.watchLink && (
          <a href={title.watchLink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent-text underline">
            Ver detalhes de disponibilidade
          </a>
        )}
      </section>

      {title.cast.length > 0 && (
        <section aria-labelledby="elenco" className="px-4 pt-10 sm:px-8">
          <h2 id="elenco" className="text-lg font-bold sm:text-xl">Elenco</h2>
          <ul className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {title.cast.map((person) => (
              <li key={person.id} className="w-24 shrink-0 text-center">
                {person.profilePath ? (
                  <img {...imageSet(person.profilePath, 'profile')} sizes="96px" alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="neon-gradient mx-auto block h-24 w-24 rounded-full" />
                )}
                <p className="mt-2 text-sm font-semibold">{person.name}</p>
                {person.character && <p className="text-xs text-muted">{person.character}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {title.recommendations.length > 0 && <Row title="Você também pode gostar" items={title.recommendations} />}
    </article>
  );
}

// getTitleDetails usa o cache do fetch, então a página e o título da aba fazem uma só chamada ao TMDB.
export async function titleMetadata(type, id) {
  const title = await getTitleDetails(type, id);
  return { title: title ? title.title : 'Não encontrado' };
}

export async function TitlePage({ type, id, viewer }) {
  const title = await getTitleDetails(type, id);
  if (!title) notFound();
  if (viewer?.kids) {
    const key = `${type}-${id}`;
    const rating = await getTitleRating(type, id).catch(() => null);
    if (!ratingAllowed(rating, viewer.maxRating) && !viewer.unlocked.has(key)) {
      // Bloqueado: nada de sinopse, trailer ou imagem; só o pedido de PIN.
      return (
        <PinGate
          title="Este título precisa de um adulto"
          description={`"${title.title}" está acima da faixa deste perfil. Peça para um adulto digitar o PIN.`}
          purpose="titulo"
          titleKey={key}
        />
      );
    }
    title.recommendations = await annotateRatings(title.recommendations, viewer.maxRating, viewer.unlocked);
  }
  // Mantém a cópia guardada em dia (só atualiza se o título já estiver marcado), sem segurar a página.
  if (viewer?.profile) {
    refreshSnapshot(getDb(), viewer.profile.id, type, id, buildSnapshot(title)).catch(() => {});
  }
  return <TitleView title={title} />;
}
