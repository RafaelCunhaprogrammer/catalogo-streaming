import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { account, session, user, verification } from '../db/schema.js';

export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_UPDATE_SECONDS = 60 * 60 * 24;

export function createAuth({ db, secret, baseURL, sendResetEmail, rateLimit = true, withNextCookies = true }) {
  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: u, url }) => sendResetEmail({ to: u.email, name: u.name, url }),
    },
    // 30 dias sem uso expiram; cada dia de uso empurra o prazo.
    session: { expiresIn: SESSION_SECONDS, updateAge: SESSION_UPDATE_SECONDS },
    user: { deleteUser: { enabled: true } },
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    plugins: withNextCookies ? [nextCookies()] : [],
  });
}
