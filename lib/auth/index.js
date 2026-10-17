import { createAuth } from './create-auth.js';
import { getDb } from '../db/index.js';
import { sendResetEmail } from '../email.js';

// Instância única do Better Auth no servidor.
export function getAuth() {
  if (!globalThis.__paideguaAuth) {
    globalThis.__paideguaAuth = createAuth({
      db: getDb(),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      sendResetEmail,
    });
  }
  return globalThis.__paideguaAuth;
}
