'use client';

import { useRouter } from 'next/navigation';

export function LoadError({ message = 'Não foi possível carregar agora.', onRetry }) {
  const router = useRouter();
  return (
    <div role="alert" className="mx-4 my-10 rounded-xl border border-line bg-surface p-6 text-center sm:mx-8">
      <p>{message}</p>
      <button
        onClick={() => (onRetry ? onRetry() : router.refresh())}
        className="neon-gradient mt-4 rounded-full px-6 py-2 font-bold text-white shadow-glow"
      >
        Tentar novamente
      </button>
    </div>
  );
}
