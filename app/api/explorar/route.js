import { NextResponse } from 'next/server';
import { parseExploreParams } from '@/lib/explore-params';
import { discoverPage } from '@/lib/tmdb/catalog';
import { annotateRatings } from '@/lib/tmdb/ratings';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { getViewer } from '@/lib/auth/viewer';

export async function GET(request) {
  const viewer = await getViewer();
  if (!viewer.profile) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const filters = parseExploreParams(request.nextUrl.searchParams);
  const myProviders = parseProvidersCookie(request.cookies.get(PROVIDERS_COOKIE)?.value);
  try {
    const page = await discoverPage(filters, { myProviders });
    // No Kids, títulos acima da faixa vêm com cadeado.
    const results = viewer.kids ? await annotateRatings(page.results, viewer.maxRating, viewer.unlocked) : page.results;
    return NextResponse.json({ ...page, results });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar agora.' }, { status: 502 });
  }
}
