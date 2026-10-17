'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { PinDialog } from '@/components/kids/PinDialog';
import { signOutAction } from '@/lib/actions/conta';

const ITEMS = [
  { href: '/perfis', label: 'Trocar perfil' },
  { href: '/perfis/gerenciar', label: 'Gerenciar perfis' },
  { href: '/conta', label: 'Minha conta' },
];
const itemClass = 'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2';

// Menu do avatar. No Kids, todos os itens pedem o PIN dos pais antes.
export function UserMenu({ profile, kids }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // item que espera o PIN
  const wrapper = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(item) {
    setOpen(false);
    if (item === 'sair') await signOutAction();
    else router.push(item.href);
  }

  return (
    <div ref={wrapper} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Menu do perfil ${profile.name}`} className="rounded-xl p-0.5 hover:ring-2 hover:ring-accent-2">
        <ProfileAvatar profile={profile} size="sm" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-glow">
          <p className="px-3 py-2 text-sm font-bold">{profile.name}</p>
          {ITEMS.map((item) => (kids ? (
            <button key={item.href} className={itemClass} onClick={() => setPending(item)}>{item.label}</button>
          ) : (
            <Link key={item.href} href={item.href} className={itemClass} onClick={() => setOpen(false)}>{item.label}</Link>
          )))}
          <button className={itemClass} onClick={() => (kids ? setPending('sair') : run('sair'))}>Sair</button>
        </div>
      )}
      <PinDialog
        open={Boolean(pending)}
        title="Área de adultos"
        description="Peça para um adulto digitar o PIN dos pais."
        purpose="adulto"
        onClose={() => setPending(null)}
        onSuccess={() => {
          const item = pending;
          setPending(null);
          run(item);
        }}
      />
    </div>
  );
}
