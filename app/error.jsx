'use client';

import { LoadError } from '@/components/LoadError';

// retry() busca os dados de novo (reset() só redesenharia o que já falhou).
export default function ErrorPage({ retry }) {
  return <LoadError message="Não foi possível carregar agora." onRetry={retry} />;
}
