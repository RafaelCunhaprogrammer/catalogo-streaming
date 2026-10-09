'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
];

export function Header() {
  const pathname = usePathname();
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
        <div data-slot="header-actions" className="ml-auto flex items-center gap-2" />
      </div>
    </header>
  );
}
