import Form from 'next/form';
import Link from 'next/link';
import { PROVIDERS } from '@/lib/providers';
import { toExploreQuery } from '@/lib/explore-params';

const LANGUAGES = [
  ['pt', 'Português'], ['en', 'Inglês'], ['es', 'Espanhol'], ['fr', 'Francês'],
  ['it', 'Italiano'], ['de', 'Alemão'], ['ja', 'Japonês'], ['ko', 'Coreano'],
];
const RATINGS = [5, 6, 7, 8, 9];
const fieldClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg';

function TypeLink({ filters, tipo, label }) {
  const active = filters.tipo === tipo;
  const query = toExploreQuery({ ...filters, tipo, generos: [], duracao: null, pagina: 1 });
  return (
    <Link
      href={query ? `/explorar?${query}` : '/explorar'}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full px-5 py-2 text-sm font-bold ${active ? 'neon-gradient text-white shadow-glow' : 'border border-line text-muted hover:text-fg'}`}
    >
      {label}
    </Link>
  );
}

export function ExploreFilters({ filters, genres }) {
  return (
    <div className="mt-6">
      <nav aria-label="Tipo" className="flex gap-2">
        <TypeLink filters={filters} tipo="filme" label="Filmes" />
        <TypeLink filters={filters} tipo="serie" label="Séries" />
      </nav>

      <Form key={toExploreQuery(filters)} action="/explorar" className="mt-6 grid gap-4 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="tipo" value={filters.tipo} />
        {filters.humor && <input type="hidden" name="humor" value={filters.humor} />}

        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="text-sm font-semibold">Plataformas</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {PROVIDERS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="plataforma" value={p.id} defaultChecked={filters.plataformas.includes(p.id)} className="h-4 w-4 accent-[var(--accent)]" />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="sm:col-span-2 lg:col-span-4" open={filters.generos.length > 0}>
          <summary className="cursor-pointer text-sm font-semibold">
            Gêneros{filters.generos.length ? ` (${filters.generos.length})` : ''}
          </summary>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {genres.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="genero" value={g.id} defaultChecked={filters.generos.includes(g.id)} className="h-4 w-4 accent-[var(--accent)]" />
                {g.name}
              </label>
            ))}
          </div>
        </details>

        <label className="flex flex-col gap-1 text-sm">
          Ano de
          <input type="number" name="anoDe" aria-label="Ano de" min="1900" max="2100" defaultValue={filters.anoDe ?? ''} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ano até
          <input type="number" name="anoAte" aria-label="Ano até" min="1900" max="2100" defaultValue={filters.anoAte ?? ''} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nota mínima
          <select name="nota" aria-label="Nota mínima" defaultValue={filters.nota ?? ''} className={fieldClass}>
            <option value="">Qualquer</option>
            {RATINGS.map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        {filters.tipo === 'filme' && (
          <label className="flex flex-col gap-1 text-sm">
            Duração
            <select name="duracao" aria-label="Duração" defaultValue={filters.duracao ?? ''} className={fieldClass}>
              <option value="">Qualquer</option>
              <option value="curto">Até 90 min</option>
              <option value="medio">90 a 120 min</option>
              <option value="longo">Mais de 120 min</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Idioma original
          <select name="idioma" aria-label="Idioma original" defaultValue={filters.idioma ?? ''} className={fieldClass}>
            <option value="">Qualquer</option>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ordenar por
          <select name="ordem" aria-label="Ordenar por" defaultValue={filters.ordem} className={fieldClass}>
            <option value="popularidade">Popularidade</option>
            <option value="nota">Nota</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </label>

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="neon-gradient rounded-full px-6 py-2 font-bold text-white shadow-glow">Aplicar filtros</button>
          <Link href={filters.tipo === 'serie' ? '/explorar?tipo=serie' : '/explorar'} className="text-sm text-muted underline hover:text-fg">
            Limpar filtros
          </Link>
        </div>
      </Form>
    </div>
  );
}
