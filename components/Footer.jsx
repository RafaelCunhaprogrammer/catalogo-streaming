export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-8 text-sm text-muted sm:px-8">
      <div className="flex flex-wrap items-center gap-4">
        {/* Para usar o logo oficial, baixe-o em themoviedb.org/about/logos-attribution e troque este texto por <img>. */}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noreferrer"
          className="rounded bg-gradient-to-r from-[#90cea1] to-[#01b4e4] bg-clip-text font-black tracking-wide text-transparent"
        >
          TMDB
        </a>
        <p>
          Disponibilidade nos streamings fornecida pelo{' '}
          <a className="underline hover:text-fg" href="https://www.justwatch.com/br" target="_blank" rel="noreferrer">
            JustWatch
          </a>
          .
        </p>
      </div>
      <p className="mt-3">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
    </footer>
  );
}
