import { NextResponse } from 'next/server';
import { searchAvailable } from '@/lib/tmdb/catalog';

const SUGGESTIONS = 8;

export async function GET(request) {
  const query = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const { results } = await searchAvailable(query);
    return NextResponse.json({ results: results.slice(0, SUGGESTIONS) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível buscar agora.' }, { status: 502 });
  }
}
