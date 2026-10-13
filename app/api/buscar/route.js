import { NextResponse } from 'next/server';
import { searchAvailable } from '@/lib/tmdb/catalog';

const SUGGESTIONS = 8;

export async function GET(request) {
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const tipo = request.nextUrl.searchParams.get('tipo');
  const type = tipo === 'filme' ? 'movie' : tipo === 'serie' ? 'tv' : undefined;
  try {
    const { results } = await searchAvailable(query, 1, type);
    return NextResponse.json({ results: results.slice(0, SUGGESTIONS) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível buscar agora.' }, { status: 502 });
  }
}
