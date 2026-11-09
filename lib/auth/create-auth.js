import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { account, profiles, session, user, verification } from '../db/schema.js';
import { getPhotoStorage } from '../photos/storage.js';
import { deletePhotosOf } from '../photos/service.js';

export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_UPDATE_SECONDS = 60 * 60 * 24;
export const MAX_NAME_LENGTH = 40;

export function createAuth({ db, secret, baseURL, sendResetEmail, rateLimit = true, withNextCookies = true, photoStorage }) {
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
    user: {
      deleteUser: {
        enabled: true,
        // Os arquivos das fotos saem antes de a conta (e os perfis) sumirem do banco.
        beforeDelete: async (u) => {
          const owned = await db.select().from(profiles).where(eq(profiles.userId, u.id));
          await deletePhotosOf(photoStorage ?? getPhotoStorage(), owned);
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            if (newUser.name.length > MAX_NAME_LENGTH) throw new APIError('BAD_REQUEST', { message: 'Nome muito longo.' });
          },
        },
      },
    },
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    // Estas operações só acontecem pelas ações do site, que conferem o PIN e a conta de demonstração.
    disabledPaths: ['/delete-user', '/change-password', '/update-user', '/change-email', '/revoke-session', '/revoke-sessions', '/revoke-other-sessions'],
    plugins: withNextCookies ? [nextCookies()] : [],
  });
}
