import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

// Tabelas do Better Auth (os nomes das propriedades seguem o que o Better Auth espera).
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabelas do Pai d'Égua.
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  kind: text('kind').notNull(), // 'adulto' | 'kids'
  maxRating: text('max_rating'), // 'L' | '10' | '12' | '14' | null
  prefs: jsonb('prefs').notNull().default({}),
  favoriteGenres: jsonb('favorite_genres').notNull().default([]), // slugs de FAVORITE_GENRES
  genresPromptDone: boolean('genres_prompt_done').notNull().default(false), // true depois de escolher ou dispensar o convite
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Marcações de um perfil num título: favorito e situação (assistindo/assistido), com cópia leve do título.
export const profileTitles = pgTable('profile_titles', {
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(), // 'movie' | 'tv'
  tmdbId: integer('tmdb_id').notNull(),
  favorite: boolean('favorite').notNull().default(false),
  favoriteAt: timestamp('favorite_at'),
  status: text('status').notNull().default('nenhum'), // 'nenhum' | 'assistindo' | 'assistido'
  statusAt: timestamp('status_at'),
  season: integer('season'), // só séries em "assistindo"
  episode: integer('episode'),
  snapshot: jsonb('snapshot'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.profileId, t.mediaType, t.tmdbId] }),
  index('profile_titles_status_idx').on(t.profileId, t.status, t.statusAt),
  index('profile_titles_favorite_idx').on(t.profileId, t.favorite, t.favoriteAt),
]);

export const parentalPins = pgTable('parental_pins', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  pinHash: text('pin_hash').notNull(),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const demoState = pgTable('demo_state', {
  id: integer('id').primaryKey(),
  lastReset: date('last_reset', { mode: 'string' }),
});
