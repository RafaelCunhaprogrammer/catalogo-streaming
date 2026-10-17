import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { getAuth } from './index.js';
import { getDb } from '../db/index.js';
import { listProfiles } from '../profiles.js';
import { PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE, buildViewer } from './viewer-core.js';

// Quem está vendo esta requisição (uma consulta por requisição, graças ao cache do React).
export const getViewer = cache(async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const jar = await cookies();
  const profiles = session ? await listProfiles(getDb(), session.user.id) : [];
  return buildViewer({
    session,
    profiles,
    profileCookie: jar.get(PROFILE_COOKIE)?.value,
    unlockedCookie: jar.get(UNLOCKED_COOKIE)?.value,
    parentCookie: jar.get(PARENT_COOKIE)?.value,
    secret: process.env.BETTER_AUTH_SECRET,
  });
});

// Para o Início: se o banco estiver fora do ar, a vitrine continua funcionando como para um visitante.
export async function getViewerOrVisitor() {
  try {
    return await getViewer();
  } catch {
    return buildViewer({ session: null, secret: process.env.BETTER_AUTH_SECRET });
  }
}
