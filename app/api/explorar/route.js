import { NextResponse } from 'next/server';
import { parseExploreParams } from '@/lib/explore-params';
import { discoverPage } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';

export async function GET(request) {
  const filters = parseExploreParams(request.nextUrl.searchParams);
  const myProviders = parseProvidersCookie(request.cookies.get(PROVIDERS_COOKIE)?.value);
  try {
    return NextResponse.json(await discoverPage(filters, { myProviders }));
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar agora.' }, { status: 502 });
  }
}
