import './globals.css';
import { THEME_SCRIPT } from '@/lib/theme-bootstrap';
import { APP_NAME } from '@/lib/brand';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { Header } from '@/components/Header';
import { getGenreLists } from '@/lib/tmdb/catalog';
import { getViewerOrVisitor } from '@/lib/auth/viewer';
import { savePrefsAction } from '@/lib/actions/conta';
import { ListsProvider } from '@/components/lists/ListsProvider';
import { getDb } from '@/lib/db';
import { listMarks, markIndex } from '@/lib/lists/store';
import { Footer } from '@/components/Footer';
import { BrightnessOverlay } from '@/components/BrightnessOverlay';
import { IntroScene } from '@/components/IntroScene';
import { IdleScreensaver } from '@/components/IdleScreensaver';

export const metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Filmes e séries incluídos nas assinaturas de streaming no Brasil.',
};

async function loadGenres() {
  try {
    return await getGenreLists();
  } catch {
    // sem a lista, o menu Categorias fica vazio, mas o site funciona
    return { filme: [], serie: [] };
  }
}

export default async function RootLayout({ children }) {
  const [genres, viewer] = await Promise.all([loadGenres(), getViewerOrVisitor()]);
  const account = {
    signedIn: Boolean(viewer.user),
    profile: viewer.profile ? { id: viewer.profile.id, name: viewer.profile.name, color: viewer.profile.color, kind: viewer.profile.kind } : null,
  };
  const marks = viewer.profile ? markIndex(await listMarks(getDb(), viewer.profile.id)) : null;
  const shell = (
    <>
      <Header genres={genres} account={account} />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
  return (
    <html lang="pt-BR" data-theme="escuro" data-text="normal" data-calm="false" data-contrast="false" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Abre a conexão com o player e com as imagens antes de precisar: trailer e cartazes começam mais rápido. */}
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://image.tmdb.org" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {/* Trocar de perfil remonta o provedor: as preferências passam a ser as do perfil escolhido. */}
        <SettingsProvider key={viewer.profile?.id ?? 'visitante'} initialPrefs={viewer.profile?.prefs} onSave={viewer.profile ? savePrefsAction : undefined}>
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
            Pular para o conteúdo
          </a>
          {marks ? <ListsProvider key={viewer.profile.id} initialMarks={marks}>{shell}</ListsProvider> : shell}
          <IntroScene />
          <IdleScreensaver />
          <BrightnessOverlay />
        </SettingsProvider>
      </body>
    </html>
  );
}
