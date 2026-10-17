'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PinDialog } from '@/components/kids/PinDialog';

// Bloco que ocupa o lugar do conteúdo (título bloqueado ou área de adultos no Kids).
export function PinGate({ title, description, purpose, titleKey }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="rounded-full bg-surface-2 p-5"><Lock aria-hidden="true" className="h-10 w-10 text-accent-2" /></span>
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="text-muted">{description}</p>
      <button onClick={() => setOpen(true)} className="neon-gradient rounded-full px-6 py-3 font-bold text-white shadow-glow">
        Digitar o PIN
      </button>
      <PinDialog
        open={open}
        title={title}
        description={description}
        purpose={purpose}
        titleKey={titleKey}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
