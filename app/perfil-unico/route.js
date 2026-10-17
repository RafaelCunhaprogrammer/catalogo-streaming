import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/viewer';
import { CLEARED_PROFILE_COOKIES, profileCookieEntries } from '@/lib/auth/profile-cookies';

// Depois de entrar (ou ao abrir o site já logado): com um só perfil, entra direto; com vários, pergunta.
export async function GET(request) {
  const viewer = await getViewer();
  const to = (path) => new URL(path, request.url);
  if (!viewer.user) return NextResponse.redirect(to('/'));
  if (viewer.profiles.length !== 1) return NextResponse.redirect(to('/perfis'));
  const response = NextResponse.redirect(to('/'));
  for (const [name, value, options] of profileCookieEntries(viewer.profiles[0], process.env.BETTER_AUTH_SECRET)) {
    response.cookies.set(name, value, options);
  }
  CLEARED_PROFILE_COOKIES.forEach((name) => response.cookies.delete(name));
  return response;
}
