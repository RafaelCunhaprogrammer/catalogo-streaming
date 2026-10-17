'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { SearchBox } from '@/components/SearchBox';
import { Settings } from 'lucide-react';
import { DesktopNav, MobileMenu } from '@/components/NavMenus';
import { UserMenu } from '@/components/UserMenu';


// Páginas com destaque em vídeo: o topo fica transparente por cima do trailer.
const HERO_PAGES = ['/', '/filmes', '/series'];
const SCROLL_LIMIT = 24;

function subscribeScroll(callback) {
  window.addEventListener('scroll', callback, { passive: true });
  return () => window.removeEventListener('scroll', callback);
}
const scrolledPastTop = () => window.scrollY > SCROLL_LIMIT;

export function Header({ genres, account = { signedIn: false, profile: null } }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeScroll, scrolledPastTop, () => false);
  const overHero = HERO_PAGES.includes(pathname) && !scrolled;
  const headerRef = useRef(null);

  // Altura do topo numa variável CSS, para o destaque subir por baixo dele (--header-h).
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return (
    // Sobre o trailer usa as cores do modo escuro (data-theme), para ficar legível também no modo Claro.
    <header
      ref={headerRef}
      data-over-hero={String(overHero)}
      data-theme={overHero ? 'escuro' : undefined}
      className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        overHero ? 'border-transparent bg-gradient-to-b from-black/75 via-black/35 to-transparent' : 'border-line bg-[var(--header-bg)] backdrop-blur-md'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-8">
        <Link
          href="/"
          aria-label={`${APP_NAME} — Início`}
          title={pathname === '/' ? 'Ver a abertura de novo' : undefined}
          onClick={(e) => {
            // No Início, a logo mostra a abertura de novo; nas outras páginas, só leva ao Início.
            if (pathname !== '/') return;
            e.preventDefault();
            window.dispatchEvent(new Event('paidegua:rever-abertura'));
          }}
          className="shrink-0"
        >
          <BrandLogo />
        </Link>
        <DesktopNav pathname={pathname} genres={genres} />
        <SearchBox genres={genres} signedIn={account.signedIn} />
        <div data-slot="header-actions" className="ml-auto flex items-center gap-2">
          <MobileMenu pathname={pathname} genres={genres} />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Abrir configurações"
            aria-haspopup="dialog"
            className="rounded-full p-2 text-fg hover:bg-surface-2"
          >
            <Settings aria-hidden="true" className="h-6 w-6" strokeWidth={1.75} />
          </button>
          {account.signedIn && account.profile ? (
            <UserMenu profile={account.profile} kids={account.profile.kind === 'kids'} />
          ) : (
            !account.signedIn && (
              <Link href="/entrar" className="neon-gradient rounded-full px-5 py-2 text-sm font-bold text-white shadow-glow">
                Entrar
              </Link>
            )
          )}
        </div>
        <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      </div>
    </header>
  );
}
