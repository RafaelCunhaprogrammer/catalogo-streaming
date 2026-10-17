import { createAuth } from '@/lib/auth/create-auth';
import { createTestDb } from './test-db';

export const TEST_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';

// Better Auth sobre PGlite em memória; os e-mails de redefinição vão para `sent`.
export async function createTestAuth(existingDb) {
  const db = existingDb ?? (await createTestDb());
  const sent = [];
  const auth = createAuth({
    db,
    secret: TEST_SECRET,
    baseURL: 'http://localhost:3000',
    sendResetEmail: async (mail) => sent.push(mail),
    rateLimit: false,
    withNextCookies: false,
  });
  return { auth, db, sent };
}

// Cabeçalho "cookie" a partir das respostas com Set-Cookie.
export function cookiesFrom(response) {
  return response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

export async function signUp(auth, { name = 'Ana', email = 'ana@ex.com', password = 'senha-forte-1' } = {}) {
  const response = await auth.api.signUpEmail({ body: { name, email, password }, asResponse: true });
  const body = await response.json();
  return { response, user: body.user, cookie: cookiesFrom(response) };
}
