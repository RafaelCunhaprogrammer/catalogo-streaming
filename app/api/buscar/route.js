import { NextResponse } from 'next/server';
import { searchAvailable } from '@/lib/tmdb/catalog';
import { annotateRatings } from '@/lib/tmdb/ratings';
import { getViewer } from '@/lib/auth/viewer';

const SUGGESTIONS = 8;

export async function GET(request) {
  const viewer = await getViewer();
  if (!viewer.profile) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const tipo = request.nextUrl.searchParams.get('tipo');
  const type = tipo === 'filme' ? 'movie' : tipo === 'serie' ? 'tv' : undefined;
  try {
    const { results } = await searchAvailable(query, 1, type);
    const top = results.slice(0, SUGGESTIONS);
    return NextResponse.json({ results: viewer.kids ? await annotateRatings(top, viewer.maxRating, viewer.unlocked) : top });
  } catch {
    return NextResponse.json({ error: 'Não foi possível buscar agora.' }, { status: 502 });
  }
}
