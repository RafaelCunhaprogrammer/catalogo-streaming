'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { SearchBox } from '@/components/SearchBox';
import { Settings } from 'lucide-react';
import { DesktopNav, MobileMenu } from '@/components/NavMenus';


export function Header({ genres }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--header-bg)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-8">
        <Link href="/" aria-label={`${APP_NAME} — Início`} className="shrink-0">
          <BrandLogo />
        </Link>
        <DesktopNav pathname={pathname} genres={genres} />
        <SearchBox genres={genres} />
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
        </div>
        <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      </div>
    </header>
  );
}
