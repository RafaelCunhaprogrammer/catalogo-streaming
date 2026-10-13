import './globals.css';
import { THEME_SCRIPT } from '@/lib/theme-bootstrap';
import { APP_NAME } from '@/lib/brand';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BrightnessOverlay } from '@/components/BrightnessOverlay';
import { IntroScene } from '@/components/IntroScene';

export const metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Filmes e séries incluídos nas assinaturas de streaming no Brasil.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-theme="escuro" data-text="normal" data-calm="false" data-contrast="false" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <SettingsProvider>
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
            Pular para o conteúdo
          </a>
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
          <IntroScene />
          <BrightnessOverlay />
        </SettingsProvider>
      </body>
    </html>
  );
}
