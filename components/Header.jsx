'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { SearchBox } from '@/components/SearchBox';
import { Settings } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
];

export function Header() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--header-bg)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-8">
        <Link href="/" className="neon-gradient bg-clip-text text-xl font-black text-transparent">
          {APP_NAME}
        </Link>
        <nav aria-label="Principal" className="flex gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="text-muted hover:text-fg aria-[current=page]:font-bold aria-[current=page]:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SearchBox />
        <div data-slot="header-actions" className="ml-auto flex items-center gap-2">
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
