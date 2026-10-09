'use client';

import { LoadError } from '@/components/LoadError';

export default function ErrorPage({ reset }) {
  return <LoadError message="Não foi possível carregar agora." onRetry={reset} />;
}
