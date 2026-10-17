# Etapa B1 – Contas e Perfis: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Pai d'Égua contas com e-mail e senha, sessão de 30 dias, "Quem está assistindo?", até 5 perfis, perfil Kids com cadeado e PIN dos pais, preferências por perfil e conta de demonstração.

**Architecture:** Better Auth roda dentro do Next.js (`/api/auth/*`) sobre PostgreSQL via Drizzle ORM. No desenvolvimento e nos testes o banco é o PGlite (PostgreSQL em processo, numa pasta local); em produção, o Neon. Uma camada de acesso (`lib/auth/viewer.js`) diz em cada página e rota quem está vendo (visitante, adulto ou Kids, com faixa e títulos liberados). As regras ficam em serviços puros e testáveis (`lib/profiles.js`, `lib/pin.js`, `lib/demo.js`, `lib/tmdb/ratings.js`); as ações do servidor (`lib/actions/conta.js`) são finas e só ligam serviços, cookies e redirecionamentos.

**Tech Stack:** Next.js 16 (App Router, JavaScript), Better Auth 1.7, Drizzle ORM 0.45 + Drizzle Kit 0.31, PGlite 0.5 (dev/testes), `pg` (Neon em produção), Resend 6 (e-mail opcional), Vitest + React Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-17-etapa-b1-contas-perfis-design.md`

## Global Constraints

- Ramo `etapa-b-contas`. Todo commit termina com `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- Next.js 16: proteção de acesso em cada página, rota e ação do servidor via `lib/auth/viewer.js` (sem `proxy.js`).
- Arquivos com JSX usam `.jsx`. Textos da interface em português do Brasil.
- **Módulos usados por scripts de Node** (`lib/db/*`, `lib/auth/create-auth.js`, `lib/email.js`, `lib/profiles.js`, `lib/pin.js`, `lib/demo.js`, `lib/preferences.js`, `lib/providers.js`) importam uns aos outros por **caminho relativo com extensão `.js`**, nunca por `@/`.
- `DATABASE_URL` começando com `pglite:` usa PGlite (`pglite:memory` ou `pglite:<pasta>`); qualquer outra usa `pg` (Neon). Em desenvolvimento: `DATABASE_URL=pglite:./.data/dev`.
- Sessão: 30 dias (`expiresIn = 2592000`), renovada a cada dia de uso (`updateAge = 86400`).
- Senha: mínimo 8, máximo 128 caracteres. Nome da conta: 1 a 40. Nome do perfil: 1 a 20.
- Até **5 perfis** por conta; a conta nunca fica sem perfil.
- Classificações em ordem **L < 10 < 12 < 14 < 16 < 18**; título sem classificação é bloqueado no Kids e fica fora da vitrine.
- Visitante: só o Início, com títulos **até 14 anos**. Faixas do Kids: **L, 10, 12, 14**.
- PIN: exatamente 4 números; 5 erros seguidos bloqueiam por **5 minutos**; guardado com `scrypt` + sal.
- Cookies: `paidegua_perfil` e `paidegua_liberados` (assinados, até fechar o navegador); `paidegua_adulto` (assinado, 10 minutos) depois do PIN digitado para ações de adulto no Kids.
- Conta de demonstração: `demo@paidegua.app`, PIN `1234`, perfis "Pai", "Mãe" e "Pequeno" (Kids, 10); reset diário pelo horário de Belém (UTC−3).
- 8 cores de perfil, sem verde nem amarelo: `#8b5cf6`, `#ec4899`, `#f97316`, `#0ea5e9`, `#06b6d4`, `#a855f7`, `#ef4444`, `#6366f1`.
- Mensagens que não revelam se um e-mail tem conta.
- Testes nunca chamam o TMDB real nem um banco externo.

## Review Focus

1. **Cookie de perfil de outra conta ou adulterado** (copiado de outro navegador, editado à mão): o servidor ignora e volta a "Quem está assistindo?". Teste na Tarefa 3.
2. **Criança no Kids tentando escapar** (abrindo `/perfis`, `/perfis/gerenciar` ou `/conta` pelo endereço, ou chamando a ação de trocar perfil): sempre pede o PIN. Teste na Tarefa 8.
3. **PIN errado em sequência e relógio passando** (5 erros, esperar 4 e 6 minutos): bloqueia e depois libera. Teste na Tarefa 6.
4. **Título liberado de um tipo vazando para outro** (`movie-1` liberado não libera `tv-1`; cookie com 200 títulos): só o título exato, com limite de tamanho. Teste na Tarefa 3.
5. **Visitante chamando as rotas internas direto** (`/api/explorar`, `/api/buscar`, `/filme/1`): 401 nas rotas e redirecionamento nas páginas. Teste na Tarefa 8.

## Estrutura de arquivos

```
lib/db/schema.js          tabelas (Better Auth + profiles + parental_pins + demo_state)
lib/db/index.js           createDb(url) e getDb()
lib/db/migrate.js         runMigrations(conn)
drizzle/                  migrações SQL geradas pelo Drizzle Kit
drizzle.config.mjs
lib/auth/create-auth.js   createAuth({ db, secret, baseURL, sendResetEmail, ... })
lib/auth/index.js         getAuth() (instância única do servidor)
lib/auth/client.js        authClient (navegador)
lib/auth/signed-cookie.js signValue / verifySignedValue
lib/auth/viewer.js        buildViewer (puro), getViewer, requireViewer, requireProfile
lib/email.js              sendResetEmail
lib/profiles.js           serviço de perfis
lib/pin.js                serviço do PIN
lib/demo.js               conta de demonstração
lib/tmdb/limit.js         settledWithLimit (extraído do catálogo)
lib/tmdb/ratings.js       classificação indicativa por título
lib/actions/conta.js      ações do servidor ('use server')
scripts/migrate.mjs  scripts/demo-seed.mjs
app/api/auth/[...all]/route.js
app/entrar/page.jsx  app/criar-conta/page.jsx  app/esqueci-senha/page.jsx  app/redefinir-senha/page.jsx
app/perfis/page.jsx  app/perfis/gerenciar/page.jsx  app/conta/page.jsx
app/perfil-unico/route.js
components/auth/*.jsx  components/profiles/*.jsx  components/kids/*.jsx  components/UserMenu.jsx
tests/helpers/test-db.js  tests/helpers/test-auth.js
```

**Formato "viewer"** (produzido por `buildViewer`, usado em todo o servidor):

```js
{
  user: { id, name, email } | null,
  profile: { id, name, color, kind: 'adulto' | 'kids', maxRating: 'L'|'10'|'12'|'14'|null, prefs } | null,
  profiles: Profile[],          // da conta (vazio para visitante)
  needsProfile: boolean,        // logado, sem perfil ativo válido
  isDemo: boolean,
  kids: boolean,
  maxRating: 'L'|'10'|'12'|'14' | null,  // visitante: '14'; adulto: null; Kids: a faixa
  unlocked: Set<string>,        // 'movie-1', 'tv-2' liberados pelo PIN
  parentMode: boolean,          // PIN digitado há menos de 10 min (ações de adulto no Kids)
}
```

---

### Task 1: Banco de dados

**Files:**
- Create: `lib/db/schema.js`, `lib/db/index.js`, `lib/db/migrate.js`, `drizzle.config.mjs`, `scripts/migrate.mjs`, `drizzle/` (gerado), `tests/helpers/test-db.js`
- Modify: `package.json` (dependências e scripts), `next.config.mjs`, `.gitignore`, `.env.example`, `.env.local`, `lib/preferences.js` (importação relativa)
- Test: `tests/unit/db.test.js`

**Interfaces:**
- Produces:
  - tabelas `user`, `session`, `account`, `verification`, `profiles`, `parentalPins`, `demoState` (exportadas de `lib/db/schema.js`)
  - `createDb(url: string): { db, client, kind: 'pglite' | 'pg' }`
  - `getDb(): db` (instância única do servidor, guardada em `globalThis`)
  - `runMigrations(conn): Promise<void>`
  - ajudante de teste `createTestDb(): Promise<db>` (PGlite em memória, já migrado)

- [ ] **Step 1: Dependências e scripts**

```bash
npm install better-auth drizzle-orm pg @electric-sql/pglite resend
npm install -D drizzle-kit
```

Em `package.json`, acrescentar em `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "node --env-file=.env.local scripts/migrate.mjs",
"demo:seed": "node --env-file=.env.local scripts/demo-seed.mjs"
```

Em `.gitignore`, acrescentar:

```
# bancos locais (PGlite)
.data/
```

Em `next.config.mjs`, dentro de `nextConfig`, acrescentar (o PGlite carrega WebAssembly e não deve ser empacotado):

```js
  serverExternalPackages: ['@electric-sql/pglite'],
```

Em `.env.example`, acrescentar:

```
# Banco de dados. Desenvolvimento: PGlite numa pasta local. Produção: endereço do Neon.
DATABASE_URL=pglite:./.data/dev

# Autenticação (gere com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Opcional: e-mail de "Esqueci minha senha". Sem a chave, o link aparece no terminal.
# RESEND_API_KEY=
# EMAIL_FROM=Pai d'Égua <nao-responda@seu-dominio.com>

# Senha da conta de demonstração (pública por natureza; troque se quiser)
DEMO_PASSWORD=demo-paidegua-2026
```

Copiar as mesmas linhas para `.env.local`, gerando o `BETTER_AUTH_SECRET` com o comando indicado.

Em `lib/preferences.js`, trocar `import { ALL_PROVIDER_IDS } from '@/lib/providers';` por:

```js
import { ALL_PROVIDER_IDS } from './providers.js';
```

- [ ] **Step 2: Escrever o teste que falha**

`tests/helpers/test-db.js`:

```js
import { createDb } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';

// Banco PostgreSQL em memória (PGlite), com todas as migrações aplicadas.
export async function createTestDb() {
  const conn = createDb('pglite:memory');
  await runMigrations(conn);
  return conn.db;
}
```

`tests/unit/db.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { createDb } from '@/lib/db';
import { user, profiles, parentalPins } from '@/lib/db/schema';

describe('banco de dados', () => {
  it('cria as tabelas e apaga perfis e PIN junto com a conta', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', prefs: {} });
    await db.insert(parentalPins).values({ userId: 'u1', pinHash: 'x' });
    await db.delete(user).where(eq(user.id, 'u1'));
    expect(await db.select().from(profiles)).toEqual([]);
    expect(await db.select().from(parentalPins)).toEqual([]);
  });

  it('valores padrão: e-mail não verificado e PIN sem tentativas', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(parentalPins).values({ userId: 'u1', pinHash: 'x' });
    const [u] = await db.select().from(user);
    const [p] = await db.select().from(parentalPins);
    expect(u.emailVerified).toBe(false);
    expect(u.createdAt).toBeInstanceOf(Date);
    expect(p.failedAttempts).toBe(0);
    expect(p.lockedUntil).toBeNull();
  });

  it('dá um erro claro sem DATABASE_URL', () => {
    expect(() => createDb('')).toThrow('Defina DATABASE_URL em .env.local');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/unit/db.test.js`
Expected: FAIL, "Failed to resolve import "@/lib/db"".

- [ ] **Step 4: Implementar o esquema, a conexão e as migrações**

`lib/db/schema.js`:

```js
import { boolean, date, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

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
```

`lib/db/index.js`:

```js
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

// 'pglite:memory' ou 'pglite:<pasta>' → PostgreSQL em processo (dev e testes); outro endereço → Neon/PostgreSQL.
export function createDb(url) {
  if (!url) throw new Error('Defina DATABASE_URL em .env.local');
  if (url.startsWith('pglite:')) {
    const where = url.slice('pglite:'.length);
    const client = where === 'memory' ? new PGlite() : new PGlite(where);
    return { db: drizzlePglite(client, { schema }), client, kind: 'pglite' };
  }
  const client = new pg.Pool({ connectionString: url, max: 5 });
  return { db: drizzlePg(client, { schema }), client, kind: 'pg' };
}

// Uma conexão por processo; guardada em globalThis para sobreviver ao recarregamento do `npm run dev`.
export function getDb() {
  if (!globalThis.__paideguaDb) globalThis.__paideguaDb = createDb(process.env.DATABASE_URL);
  return globalThis.__paideguaDb.db;
}
```

`lib/db/migrate.js`:

```js
import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';

export async function runMigrations(conn, migrationsFolder = path.resolve(process.cwd(), 'drizzle')) {
  const migrate = conn.kind === 'pglite' ? migratePglite : migratePg;
  await migrate(conn.db, { migrationsFolder });
}
```

`drizzle.config.mjs`:

```js
export default {
  schema: './lib/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
};
```

`scripts/migrate.mjs`:

```js
// Uso: npm run db:migrate
import { mkdirSync } from 'node:fs';
import { createDb } from '../lib/db/index.js';
import { runMigrations } from '../lib/db/migrate.js';

const url = process.env.DATABASE_URL;
if (url?.startsWith('pglite:') && url !== 'pglite:memory') mkdirSync(url.slice('pglite:'.length), { recursive: true });
const conn = createDb(url);
await runMigrations(conn);
await conn.client.end?.();
await conn.client.close?.();
console.log('Banco atualizado.');
```

- [ ] **Step 5: Gerar a migração**

Run: `npm run db:generate`
Expected: cria `drizzle/0000_*.sql` e `drizzle/meta/`, com as 7 tabelas.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/unit/db.test.js`
Expected: PASS (3 testes).

Run: `npm run db:migrate`
Expected: "Banco atualizado." e a pasta `.data/dev` criada.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.mjs .gitignore .env.example lib/db lib/preferences.js drizzle drizzle.config.mjs scripts/migrate.mjs tests/helpers/test-db.js tests/unit/db.test.js
git commit -m "feat: banco de dados (Drizzle + PGlite/Neon) com tabelas de contas e perfis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Login com Better Auth

**Files:**
- Create: `lib/auth/create-auth.js`, `lib/auth/index.js`, `lib/auth/client.js`, `lib/email.js`, `app/api/auth/[...all]/route.js`, `tests/helpers/test-auth.js`
- Test: `tests/unit/auth.test.js`, `tests/unit/email.test.js`

**Interfaces:**
- Consumes: `createTestDb` e as tabelas (Tarefa 1)
- Produces:
  - `SESSION_SECONDS = 2592000`, `SESSION_UPDATE_SECONDS = 86400`
  - `createAuth({ db, secret, baseURL, sendResetEmail, rateLimit = true, withNextCookies = true })` → instância do Better Auth (`auth.api.signUpEmail`, `signInEmail`, `getSession`, `requestPasswordReset`, `resetPassword`, `verifyPassword`, `changePassword`, `deleteUser`, `signOut`)
  - `getAuth()` → instância única do servidor
  - `authClient` (navegador): `authClient.signIn.email`, `signUp.email`, `requestPasswordReset`, `resetPassword`, `changePassword`, `deleteUser`, `signOut`
  - `sendResetEmail({ to, name, url }, opts?)`
  - ajudantes de teste `createTestAuth(db?)` → `{ auth, db, sent }` e `cookiesFrom(response): string`

- [ ] **Step 1: Escrever os testes que falham**

`tests/helpers/test-auth.js`:

```js
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
```

`tests/unit/auth.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createTestAuth, signUp, cookiesFrom } from '../helpers/test-auth';
import { SESSION_SECONDS } from '@/lib/auth/create-auth';

const headersWith = (cookie) => new Headers({ cookie });

describe('login com e-mail e senha', () => {
  it('cria a conta, já entra e a sessão dura 30 dias', async () => {
    const { auth } = await createTestAuth();
    const { response, user, cookie } = await signUp(auth);
    expect(response.status).toBe(200);
    expect(user).toMatchObject({ name: 'Ana', email: 'ana@ex.com' });
    const session = await auth.api.getSession({ headers: headersWith(cookie) });
    expect(session.user.email).toBe('ana@ex.com');
    const daysLeft = (new Date(session.session.expiresAt) - Date.now()) / 86400000;
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(daysLeft).toBeLessThanOrEqual(SESSION_SECONDS / 86400);
  });

  it('não aceita e-mail repetido nem senha curta', async () => {
    const { auth } = await createTestAuth();
    await signUp(auth);
    await expect(auth.api.signUpEmail({ body: { name: 'Outra', email: 'ana@ex.com', password: 'senha-forte-2' } }))
      .rejects.toMatchObject({ status: 'UNPROCESSABLE_ENTITY' });
    await expect(auth.api.signUpEmail({ body: { name: 'Bia', email: 'bia@ex.com', password: '1234567' } }))
      .rejects.toThrow();
  });

  it('entra com a senha certa e recusa a errada', async () => {
    const { auth } = await createTestAuth();
    await signUp(auth);
    const ok = await auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'senha-forte-1' }, asResponse: true });
    expect(ok.status).toBe(200);
    await expect(auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'errada-123' } }))
      .rejects.toMatchObject({ status: 'UNAUTHORIZED' });
  });

  it('redefinição: manda o link, troca a senha e encerra as sessões antigas', async () => {
    const { auth, sent } = await createTestAuth();
    const { cookie } = await signUp(auth);
    await auth.api.requestPasswordReset({ body: { email: 'ana@ex.com', redirectTo: '/redefinir-senha' } });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'ana@ex.com', name: 'Ana' });
    const token = new URL(sent[0].url).pathname.split('/').pop();
    await auth.api.resetPassword({ body: { newPassword: 'nova-senha-123', token } });
    expect(await auth.api.getSession({ headers: headersWith(cookie) })).toBeNull();
    const ok = await auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'nova-senha-123' }, asResponse: true });
    expect(ok.status).toBe(200);
  });

  it('pedir redefinição para e-mail sem conta não envia nada e não dá erro', async () => {
    const { auth, sent } = await createTestAuth();
    await expect(auth.api.requestPasswordReset({ body: { email: 'ninguem@ex.com', redirectTo: '/redefinir-senha' } }))
      .resolves.toBeDefined();
    expect(sent).toHaveLength(0);
  });

  it('o mesmo link de redefinição não vale duas vezes', async () => {
    const { auth, sent } = await createTestAuth();
    await signUp(auth);
    await auth.api.requestPasswordReset({ body: { email: 'ana@ex.com', redirectTo: '/redefinir-senha' } });
    const token = new URL(sent[0].url).pathname.split('/').pop();
    await auth.api.resetPassword({ body: { newPassword: 'nova-senha-123', token } });
    await expect(auth.api.resetPassword({ body: { newPassword: 'outra-senha-123', token } })).rejects.toThrow();
  });

  it('sair encerra a sessão', async () => {
    const { auth } = await createTestAuth();
    const { cookie } = await signUp(auth);
    const out = await auth.api.signOut({ headers: headersWith(cookie), asResponse: true });
    expect(out.status).toBe(200);
    expect(await auth.api.getSession({ headers: headersWith(cookie) })).toBeNull();
    expect(cookiesFrom(out)).toContain('session_token=');
  });
});
```

`tests/unit/email.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { sendResetEmail } from '@/lib/email';

describe('sendResetEmail', () => {
  it('sem chave do Resend, mostra o link no terminal', async () => {
    const log = vi.fn();
    await sendResetEmail({ to: 'ana@ex.com', name: 'Ana', url: 'http://x/redefinir' }, { apiKey: '', log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('http://x/redefinir'));
  });

  it('com a chave, envia pelo Resend em português', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
    await sendResetEmail(
      { to: 'ana@ex.com', name: 'Ana', url: 'http://x/redefinir' },
      { apiKey: 'chave', from: 'Pai <a@b.c>', createClient: () => ({ emails: { send } }) },
    );
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@ex.com',
      from: 'Pai <a@b.c>',
      subject: "Redefina sua senha do Pai d'Égua",
      html: expect.stringContaining('http://x/redefinir'),
    }));
  });

  it('falha do Resend vira erro claro', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(sendResetEmail({ to: 'a@b.c', name: 'A', url: 'u' }, { apiKey: 'k', from: 'f', createClient: () => ({ emails: { send } }) }))
      .rejects.toThrow('Não foi possível enviar o e-mail');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/auth.test.js tests/unit/email.test.js`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`lib/email.js`:

```js
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// E-mail de "Esqueci minha senha". Sem RESEND_API_KEY (desenvolvimento), o link vai para o terminal.
export async function sendResetEmail(
  { to, name, url },
  {
    apiKey = process.env.RESEND_API_KEY,
    from = process.env.EMAIL_FROM,
    log = console.log,
    createClient = async (key) => new (await import('resend')).Resend(key),
  } = {},
) {
  if (!apiKey) {
    log(`[Pai d'Égua] Link para redefinir a senha de ${to}: ${url}`);
    return;
  }
  const client = await createClient(apiKey);
  const { error } = await client.emails.send({
    from,
    to,
    subject: "Redefina sua senha do Pai d'Égua",
    html: `<p>Olá, ${escape(name)}!</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no Pai d'Égua.</p>
<p><a href="${escape(url)}">Criar uma nova senha</a> (o link vale por 1 hora).</p>
<p>Se não foi você, pode ignorar este e-mail.</p>`,
  });
  if (error) throw new Error('Não foi possível enviar o e-mail agora.');
}
```

`lib/auth/create-auth.js`:

```js
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
```

`lib/auth/index.js`:

```js
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
```

`lib/auth/client.js`:

```js
import { createAuthClient } from 'better-auth/react';

// Login no navegador (formulários de entrar, criar conta, senha).
export const authClient = createAuthClient({ basePath: '/api/auth' });
```

`app/api/auth/[...all]/route.js`:

```js
import { getAuth } from '@/lib/auth';

const handler = (request) => getAuth().handler(request);

export const GET = handler;
export const POST = handler;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/auth.test.js tests/unit/email.test.js`
Expected: PASS. Se algum código de status vier com outro nome na versão instalada (por exemplo `BAD_REQUEST` em vez de `UNPROCESSABLE_ENTITY` para e-mail repetido), conferir em `node_modules/better-auth/dist/api/routes/sign-up.mjs` e ajustar só a expectativa do teste, registrando a decisão.

- [ ] **Step 5: Commit**

```bash
git add lib/auth lib/email.js app/api/auth tests/helpers/test-auth.js tests/unit/auth.test.js tests/unit/email.test.js
git commit -m "feat: login com e-mail e senha (Better Auth), sessão de 30 dias e redefinição de senha" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Cookies assinados e o "viewer" (quem está vendo)

**Files:**
- Create: `lib/auth/signed-cookie.js`, `lib/auth/viewer-core.js`
- Test: `tests/unit/viewer.test.js`

**Interfaces:**
- Produces:
  - `signValue(value: string, secret: string): string` e `verifySignedValue(signed: string, secret: string): string | null`
  - `PROFILE_COOKIE = 'paidegua_perfil'`, `UNLOCKED_COOKIE = 'paidegua_liberados'`, `PARENT_COOKIE = 'paidegua_adulto'`
  - `VISITOR_MAX_RATING = '14'`, `MAX_UNLOCKED = 50`, `PARENT_MODE_MS = 600000`, `DEMO_EMAIL = 'demo@paidegua.app'`
  - `encodeUnlocked(keys: string[], secret): string` e `decodeUnlocked(cookie, secret): Set<string>`
  - `encodeParentMode(now: number, secret): string` e `parentModeActive(cookie, secret, now): boolean`
  - `buildViewer({ session, profiles, profileCookie, unlockedCookie, parentCookie, secret, now })` → formato "viewer" (topo do plano)
  - `titleKey({ type, id }): string` → `'movie-1'`, `'tv-2'`

`viewer-core.js` é puro (sem Next nem banco); a Tarefa 8 cria o `viewer.js` que lê cookies e sessão do Next e chama `buildViewer`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/viewer.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { signValue, verifySignedValue } from '@/lib/auth/signed-cookie';
import {
  buildViewer, encodeUnlocked, decodeUnlocked, encodeParentMode, parentModeActive,
  titleKey, VISITOR_MAX_RATING, MAX_UNLOCKED, PARENT_MODE_MS, DEMO_EMAIL,
} from '@/lib/auth/viewer-core';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const adulto = { id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', maxRating: null, prefs: {} };
const kids = { id: 'p2', userId: 'u1', name: 'Pequeno', color: '#ec4899', kind: 'kids', maxRating: '10', prefs: {} };
const session = { user: { id: 'u1', name: 'Ana', email: 'ana@ex.com' } };
const base = { session, profiles: [adulto, kids], secret: SECRET, now: 1_000_000 };

describe('cookies assinados', () => {
  it('ida e volta, e recusa valor adulterado', () => {
    const signed = signValue('p1', SECRET);
    expect(verifySignedValue(signed, SECRET)).toBe('p1');
    expect(verifySignedValue(signed.replace('p1', 'p2'), SECRET)).toBeNull();
    expect(verifySignedValue(signValue('p1', 'outro-segredo-qualquer-com-32-chars!!'), SECRET)).toBeNull();
    expect(verifySignedValue(undefined, SECRET)).toBeNull();
    expect(verifySignedValue('sem-assinatura', SECRET)).toBeNull();
  });
});

describe('buildViewer', () => {
  it('visitante: sem conta, vitrine até 14 anos', () => {
    const v = buildViewer({ ...base, session: null, profiles: [] });
    expect(v).toMatchObject({ user: null, profile: null, needsProfile: false, kids: false, maxRating: VISITOR_MAX_RATING });
    expect(VISITOR_MAX_RATING).toBe('14');
  });

  it('logado sem perfil escolhido precisa escolher', () => {
    const v = buildViewer({ ...base, profileCookie: undefined });
    expect(v).toMatchObject({ user: { id: 'u1' }, profile: null, needsProfile: true });
  });

  it('perfil adulto: sem limite de classificação', () => {
    const v = buildViewer({ ...base, profileCookie: signValue('p1', SECRET) });
    expect(v).toMatchObject({ profile: { id: 'p1' }, needsProfile: false, kids: false, maxRating: null });
  });

  it('perfil Kids: faixa do perfil e títulos liberados', () => {
    const v = buildViewer({
      ...base,
      profileCookie: signValue('p2', SECRET),
      unlockedCookie: encodeUnlocked(['movie-1'], SECRET),
    });
    expect(v).toMatchObject({ kids: true, maxRating: '10' });
    expect(v.unlocked.has('movie-1')).toBe(true);
    expect(v.unlocked.has('tv-1')).toBe(false);
  });

  it('cookie de perfil de outra conta, adulterado ou de perfil excluído é ignorado', () => {
    expect(buildViewer({ ...base, profileCookie: signValue('perfil-de-outra-conta', SECRET) }).needsProfile).toBe(true);
    expect(buildViewer({ ...base, profileCookie: 'p1.assinatura-falsa' }).needsProfile).toBe(true);
    expect(buildViewer({ ...base, profiles: [kids], profileCookie: signValue('p1', SECRET) }).needsProfile).toBe(true);
  });

  it('modo adulto (PIN digitado) vale por 10 minutos', () => {
    const cookie = encodeParentMode(1_000_000, SECRET);
    expect(parentModeActive(cookie, SECRET, 1_000_000 + PARENT_MODE_MS - 1)).toBe(true);
    expect(parentModeActive(cookie, SECRET, 1_000_000 + PARENT_MODE_MS + 1)).toBe(false);
    expect(parentModeActive('123.falso', SECRET, 1_000_000)).toBe(false);
    const v = buildViewer({ ...base, profileCookie: signValue('p2', SECRET), parentCookie: cookie, now: 1_000_000 + 1000 });
    expect(v.parentMode).toBe(true);
  });

  it('conta de demonstração é reconhecida', () => {
    const v = buildViewer({ ...base, session: { user: { id: 'u9', name: 'Demo', email: DEMO_EMAIL } }, profiles: [] });
    expect(v.isDemo).toBe(true);
  });
});

describe('títulos liberados', () => {
  it('chave por tipo e id', () => {
    expect(titleKey({ type: 'movie', id: 1 })).toBe('movie-1');
    expect(titleKey({ type: 'tv', id: 1 })).toBe('tv-1');
  });

  it('cookie adulterado vira lista vazia e o tamanho é limitado', () => {
    expect(decodeUnlocked('movie-1.falso', SECRET).size).toBe(0);
    const many = Array.from({ length: 200 }, (_, i) => `movie-${i}`);
    const set = decodeUnlocked(encodeUnlocked(many, SECRET), SECRET);
    expect(set.size).toBe(MAX_UNLOCKED);
    expect(set.has('movie-199')).toBe(true); // guarda os mais recentes
  });

  it('ignora chaves em formato estranho', () => {
    const set = decodeUnlocked(encodeUnlocked(['movie-1', 'filme-2', 'tv-x', 'tv-3'], SECRET), SECRET);
    expect([...set]).toEqual(['movie-1', 'tv-3']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/viewer.test.js`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`lib/auth/signed-cookie.js`:

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

// "valor.assinatura": impede que alguém troque o valor do cookie à mão.
export function signValue(value, secret) {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

export function verifySignedValue(signed, secret) {
  if (typeof signed !== 'string') return null;
  const dot = signed.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const expected = Buffer.from(signValue(value, secret));
  const received = Buffer.from(signed);
  return expected.length === received.length && timingSafeEqual(expected, received) ? value : null;
}
```

`lib/auth/viewer-core.js`:

```js
import { signValue, verifySignedValue } from './signed-cookie.js';

export const PROFILE_COOKIE = 'paidegua_perfil';
export const UNLOCKED_COOKIE = 'paidegua_liberados';
export const PARENT_COOKIE = 'paidegua_adulto';
export const VISITOR_MAX_RATING = '14';
export const MAX_UNLOCKED = 50;
export const PARENT_MODE_MS = 10 * 60 * 1000;
export const DEMO_EMAIL = 'demo@paidegua.app';

const KEY_FORMAT = /^(movie|tv)-\d+$/;

export const titleKey = ({ type, id }) => `${type}-${id}`;

export function encodeUnlocked(keys, secret) {
  const valid = keys.filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED);
  return signValue(valid.join(','), secret);
}

export function decodeUnlocked(cookie, secret) {
  const value = verifySignedValue(cookie, secret);
  if (!value) return new Set();
  return new Set(value.split(',').filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED));
}

export const encodeParentMode = (now, secret) => signValue(String(now), secret);

export function parentModeActive(cookie, secret, now) {
  const since = Number(verifySignedValue(cookie, secret));
  return Number.isFinite(since) && since > 0 && now - since <= PARENT_MODE_MS;
}

// Quem está vendo a página. Puro: recebe a sessão, os perfis da conta e os cookies brutos.
export function buildViewer({ session, profiles = [], profileCookie, unlockedCookie, parentCookie, secret, now = Date.now() }) {
  if (!session?.user) {
    return {
      user: null, profile: null, profiles: [], needsProfile: false, isDemo: false,
      kids: false, maxRating: VISITOR_MAX_RATING, unlocked: new Set(), parentMode: false,
    };
  }
  const { id, name, email } = session.user;
  const profileId = verifySignedValue(profileCookie, secret);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const kids = profile?.kind === 'kids';
  return {
    user: { id, name, email },
    profile,
    profiles,
    needsProfile: !profile,
    isDemo: email === DEMO_EMAIL,
    kids,
    maxRating: kids ? profile.maxRating : null,
    unlocked: kids ? decodeUnlocked(unlockedCookie, secret) : new Set(),
    parentMode: kids ? parentModeActive(parentCookie, secret, now) : true,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/viewer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/signed-cookie.js lib/auth/viewer-core.js tests/unit/viewer.test.js
git commit -m "feat: cookies assinados e o viewer (visitante, adulto ou Kids)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Classificação indicativa por título

**Files:**
- Create: `lib/tmdb/limit.js`, `lib/tmdb/ratings.js`
- Modify: `lib/tmdb/catalog.js` (usar `settledWithLimit` de `limit.js`)
- Test: `tests/unit/ratings.test.js`

**Interfaces:**
- Consumes: `tmdbFetch` (Etapa A), `brazilCertification` (Etapa A)
- Produces:
  - `settledWithLimit(items, limit, task)` (movido de `catalog.js`, mesma assinatura)
  - `RATING_ORDER = ['L','10','12','14','16','18']`, `KIDS_RATINGS = ['L','10','12','14']`
  - `ratingAllowed(cert: string|null, maxRating: string|null): boolean`
  - `getTitleRating(type, id): Promise<string|null>` (cache de 24 h)
  - `annotateRatings(titles, maxRating, unlocked = new Set()): Promise<(Title & { rating, locked })[]>`
  - `filterByRating(titles, maxRating): Promise<Title[]>` (sem `maxRating`, devolve igual)
  - `movieCertificationParams(maxRating)` → `{ certification_country: 'BR', 'certification.lte': maxRating }` ou `{}`

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/ratings.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mockTmdb, calledPaths } from '../helpers/mock-tmdb';
import {
  ratingAllowed, getTitleRating, annotateRatings, filterByRating, movieCertificationParams, KIDS_RATINGS,
} from '@/lib/tmdb/ratings';

const movieRating = (cert) => ({ results: [{ iso_3166_1: 'BR', release_dates: [{ certification: cert }] }] });
const tvRating = (rating) => ({ results: [{ iso_3166_1: 'BR', rating }] });
const t = (type, id) => ({ type, id, title: `${type}-${id}` });

describe('ratingAllowed', () => {
  it('segue a ordem L < 10 < 12 < 14 < 16 < 18', () => {
    expect(ratingAllowed('L', '10')).toBe(true);
    expect(ratingAllowed('10', '10')).toBe(true);
    expect(ratingAllowed('12', '10')).toBe(false);
    expect(ratingAllowed('18', '14')).toBe(false);
    expect(KIDS_RATINGS).toEqual(['L', '10', '12', '14']);
  });

  it('sem limite, tudo passa; sem classificação, bloqueia', () => {
    expect(ratingAllowed('18', null)).toBe(true);
    expect(ratingAllowed(null, '14')).toBe(false);
    expect(ratingAllowed('XYZ', '14')).toBe(false);
  });
});

describe('classificação dos títulos', () => {
  it('busca a classificação brasileira de filmes e séries', async () => {
    mockTmdb({ '/movie/1/release_dates': movieRating('12'), '/tv/2/content_ratings': tvRating('L') });
    await expect(getTitleRating('movie', 1)).resolves.toBe('12');
    await expect(getTitleRating('tv', 2)).resolves.toBe('L');
  });

  it('marca cadeado acima da faixa, sem classificação ou com falha, mas respeita os liberados', async () => {
    mockTmdb({
      '/movie/1/release_dates': movieRating('L'),
      '/movie/2/release_dates': movieRating('16'),
      '/movie/3/release_dates': movieRating(''),
      '/movie/4/release_dates': 500,
      '/movie/5/release_dates': movieRating('18'),
    });
    const out = await annotateRatings([t('movie', 1), t('movie', 2), t('movie', 3), t('movie', 4), t('movie', 5)], '10', new Set(['movie-5']));
    expect(out.map((x) => [x.id, x.rating, x.locked])).toEqual([
      [1, 'L', false], [2, '16', true], [3, null, true], [4, null, true], [5, '18', false],
    ]);
  });

  it('sem faixa (adulto), não consulta nada', async () => {
    const fetchMock = mockTmdb({});
    const out = await annotateRatings([t('movie', 1)], null);
    expect(out[0].locked).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filterByRating tira os bloqueados e mantém o formato do título', async () => {
    mockTmdb({ '/movie/1/release_dates': movieRating('L'), '/tv/2/content_ratings': tvRating('16') });
    const out = await filterByRating([t('movie', 1), t('tv', 2)], '14');
    expect(out).toEqual([t('movie', 1)]);
  });

  it('parâmetros de classificação para o discover de filmes', () => {
    expect(movieCertificationParams('14')).toEqual({ certification_country: 'BR', 'certification.lte': '14' });
    expect(movieCertificationParams(null)).toEqual({});
  });

  it('confere no máximo 8 títulos ao mesmo tempo (reaproveita o limite do catálogo)', async () => {
    const fetchMock = mockTmdb({});
    await annotateRatings(Array.from({ length: 3 }, (_, i) => t('movie', i)), '10');
    expect(calledPaths(fetchMock)).toEqual(['/movie/0/release_dates', '/movie/1/release_dates', '/movie/2/release_dates']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/ratings.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Extrair o limitador**

Criar `lib/tmdb/limit.js` com a função `settledWithLimit` exatamente como está hoje em `lib/tmdb/catalog.js` (mesmo corpo), exportada:

```js
// Como Promise.allSettled, mas com no máximo `limit` chamadas ao mesmo tempo (evita o limite de taxa do TMDB).
export async function settledWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```

Em `lib/tmdb/catalog.js`, apagar a função local `settledWithLimit` (e o comentário acima dela) e importar: `import { settledWithLimit } from './limit';`.

- [ ] **Step 4: Implementar as classificações**

`lib/tmdb/ratings.js`:

```js
import { tmdbFetch } from './client';
import { settledWithLimit } from './limit';
import { brazilCertification } from '@/lib/certification';

export const RATING_ORDER = ['L', '10', '12', '14', '16', '18'];
export const KIDS_RATINGS = ['L', '10', '12', '14'];
const DAY = 60 * 60 * 24;
const MAX_CONCURRENT = 8;

// Sem limite (adulto), tudo passa. Sem classificação conhecida, bloqueia (precaução no Kids e na vitrine).
export function ratingAllowed(cert, maxRating) {
  if (!maxRating) return true;
  const rating = RATING_ORDER.indexOf(cert);
  return rating !== -1 && rating <= RATING_ORDER.indexOf(maxRating);
}

export async function getTitleRating(type, id) {
  if (type === 'movie') {
    const data = await tmdbFetch(`/movie/${id}/release_dates`, {}, { revalidate: DAY });
    return brazilCertification({ release_dates: data }, 'movie');
  }
  const data = await tmdbFetch(`/tv/${id}/content_ratings`, {}, { revalidate: DAY });
  return brazilCertification({ content_ratings: data }, 'tv');
}

export async function annotateRatings(titles, maxRating, unlocked = new Set()) {
  if (!maxRating) return titles.map((t) => ({ ...t, rating: null, locked: false }));
  const checks = await settledWithLimit(titles, MAX_CONCURRENT, (t) => getTitleRating(t.type, t.id));
  return titles.map((t, i) => {
    const rating = checks[i].status === 'fulfilled' ? checks[i].value : null;
    const locked = !ratingAllowed(rating, maxRating) && !unlocked.has(`${t.type}-${t.id}`);
    return { ...t, rating, locked };
  });
}

export async function filterByRating(titles, maxRating) {
  if (!maxRating) return titles;
  const annotated = await annotateRatings(titles, maxRating);
  return titles.filter((_, i) => !annotated[i].locked);
}

// O discover de filmes do TMDB já filtra pela classificação brasileira (só títulos classificados).
export const movieCertificationParams = (maxRating) =>
  (maxRating ? { certification_country: 'BR', 'certification.lte': maxRating } : {});
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/ratings.test.js tests/unit/catalog.test.js`
Expected: PASS (o catálogo continua igual depois da extração).

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/limit.js lib/tmdb/ratings.js lib/tmdb/catalog.js tests/unit/ratings.test.js
git commit -m "feat: classificação indicativa por título, com cadeado e títulos liberados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Serviço de perfis

**Files:**
- Create: `lib/profiles.js`
- Test: `tests/unit/profiles.test.js`

**Interfaces:**
- Consumes: tabelas `profiles`, `user` (Tarefa 1); `parsePrefs`, `defaultPrefs` (Etapa A, `lib/preferences.js`)
- Produces:
  - `MAX_PROFILES = 5`, `PROFILE_COLORS` (8 cores da seção Global Constraints), `PROFILE_KINDS = ['adulto', 'kids']`
  - `validateProfileInput(input)` → `{ ok: true, value: { name, color, kind, maxRating } }` ou `{ ok: false, errors: { name?, color?, kind?, maxRating? } }`
  - `listProfiles(db, userId)` → perfis em ordem de criação
  - `getOwnedProfile(db, userId, profileId)` → perfil ou `null`
  - `createProfile(db, userId, input, { prefs } = {})` → `{ ok: true, profile }` ou `{ ok: false, errors }` (com `errors.form` quando passa de 5)
  - `updateProfile(db, userId, profileId, input)` → `{ ok, profile | errors }`
  - `deleteProfile(db, userId, profileId)` → `{ ok: true }` ou `{ ok: false, errors: { form } }`
  - `saveProfilePrefs(db, userId, profileId, prefs)` → preferências validadas por `parsePrefs`, ou `null` se o perfil não for da conta
  - Perfil devolvido: `{ id, userId, name, color, kind, maxRating, prefs, createdAt }`

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/profiles.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user } from '@/lib/db/schema';
import {
  MAX_PROFILES, PROFILE_COLORS, validateProfileInput, listProfiles, getOwnedProfile,
  createProfile, updateProfile, deleteProfile, saveProfilePrefs,
} from '@/lib/profiles';

let db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: 'u1', name: 'Ana', email: 'ana@ex.com' },
    { id: 'u2', name: 'Bia', email: 'bia@ex.com' },
  ]);
});

const adulto = (name = 'Ana') => ({ name, color: PROFILE_COLORS[0], kind: 'adulto' });

describe('validação', () => {
  it('aceita adulto e Kids com faixa', () => {
    expect(validateProfileInput(adulto())).toEqual({ ok: true, value: { name: 'Ana', color: PROFILE_COLORS[0], kind: 'adulto', maxRating: null } });
    expect(validateProfileInput({ name: ' Pequeno ', color: PROFILE_COLORS[1], kind: 'kids', maxRating: '10' }).value)
      .toMatchObject({ name: 'Pequeno', kind: 'kids', maxRating: '10' });
  });

  it('recusa nome vazio ou longo, cor fora da paleta, tipo desconhecido e faixa errada', () => {
    const r = validateProfileInput({ name: '   ', color: '#00ff00', kind: 'robô', maxRating: '18' });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(['color', 'kind', 'name']);
    expect(validateProfileInput({ ...adulto('x'.repeat(21)) }).errors.name).toBe('Use de 1 a 20 caracteres.');
    expect(validateProfileInput({ ...adulto(), kind: 'kids', maxRating: '16' }).errors.maxRating).toBe('Escolha Livre, 10, 12 ou 14 anos.');
  });

  it('adulto nunca guarda faixa', () => {
    expect(validateProfileInput({ ...adulto(), maxRating: '10' }).value.maxRating).toBeNull();
  });

  it('não tem verde nem amarelo na paleta', () => {
    expect(PROFILE_COLORS).toHaveLength(8);
    expect(PROFILE_COLORS).not.toContain('#22c55e');
    expect(PROFILE_COLORS).not.toContain('#eab308');
  });
});

describe('perfis no banco', () => {
  it('cria, lista em ordem e guarda as preferências iniciais', async () => {
    const a = await createProfile(db, 'u1', adulto('Ana'), { prefs: { version: 1, theme: 'claro' } });
    await createProfile(db, 'u1', { ...adulto('Pequeno'), kind: 'kids', maxRating: 'L' });
    expect(a.ok).toBe(true);
    expect(a.profile.prefs.theme).toBe('claro');
    const list = await listProfiles(db, 'u1');
    expect(list.map((p) => p.name)).toEqual(['Ana', 'Pequeno']);
    expect(list[1]).toMatchObject({ kind: 'kids', maxRating: 'L' });
    expect(list[1].prefs.theme).toBe('sistema');
  });

  it('no máximo 5 perfis', async () => {
    for (let i = 0; i < MAX_PROFILES; i += 1) await createProfile(db, 'u1', adulto(`P${i}`));
    const sexto = await createProfile(db, 'u1', adulto('Sexto'));
    expect(sexto).toEqual({ ok: false, errors: { form: 'Limite de 5 perfis.' } });
  });

  it('ninguém lê, edita ou exclui perfil de outra conta', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    await createProfile(db, 'u1', adulto('Outro'));
    expect(await getOwnedProfile(db, 'u2', profile.id)).toBeNull();
    expect((await updateProfile(db, 'u2', profile.id, adulto('Invasor'))).ok).toBe(false);
    expect((await deleteProfile(db, 'u2', profile.id)).ok).toBe(false);
    expect(await saveProfilePrefs(db, 'u2', profile.id, { version: 1, theme: 'claro' })).toBeNull();
    expect((await getOwnedProfile(db, 'u1', profile.id)).name).toBe('Ana');
  });

  it('edita nome, tipo e faixa', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    const r = await updateProfile(db, 'u1', profile.id, { name: 'Ana Kids', color: PROFILE_COLORS[2], kind: 'kids', maxRating: '12' });
    expect(r.profile).toMatchObject({ name: 'Ana Kids', kind: 'kids', maxRating: '12' });
  });

  it('não exclui o último perfil', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    expect(await deleteProfile(db, 'u1', profile.id)).toEqual({ ok: false, errors: { form: 'A conta precisa de pelo menos um perfil.' } });
    const outro = await createProfile(db, 'u1', adulto('Outro'));
    expect(await deleteProfile(db, 'u1', outro.profile.id)).toEqual({ ok: true });
  });

  it('preferências gravadas passam pela validação', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    const saved = await saveProfilePrefs(db, 'u1', profile.id, { version: 1, theme: 'noturno', brightness: 500 });
    expect(saved).toMatchObject({ theme: 'noturno', brightness: 100 });
    expect((await getOwnedProfile(db, 'u1', profile.id)).prefs.brightness).toBe(100);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/profiles.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/profiles.js`:

```js
import { randomUUID } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { profiles } from './db/schema.js';
import { defaultPrefs, parsePrefs } from './preferences.js';

export const MAX_PROFILES = 5;
// Paleta do site, sem verde nem amarelo.
export const PROFILE_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#0ea5e9', '#06b6d4', '#a855f7', '#ef4444', '#6366f1'];
export const PROFILE_KINDS = ['adulto', 'kids'];
const KIDS_RATINGS = ['L', '10', '12', '14'];

export function validateProfileInput(input = {}) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  if (name.length < 1 || name.length > 20) errors.name = 'Use de 1 a 20 caracteres.';
  if (!PROFILE_COLORS.includes(input.color)) errors.color = 'Escolha uma das cores.';
  if (!PROFILE_KINDS.includes(input.kind)) errors.kind = 'Escolha adulto ou Kids.';
  const kids = input.kind === 'kids';
  if (kids && !KIDS_RATINGS.includes(input.maxRating)) errors.maxRating = 'Escolha Livre, 10, 12 ou 14 anos.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, color: input.color, kind: input.kind, maxRating: kids ? input.maxRating : null } };
}

export async function listProfiles(db, userId) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(asc(profiles.createdAt), asc(profiles.id));
}

export async function getOwnedProfile(db, userId, profileId) {
  if (!profileId) return null;
  const [row] = await db.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return row ?? null;
}

async function countProfiles(db, userId) {
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, userId));
  return Number(total);
}

export async function createProfile(db, userId, input, { prefs } = {}) {
  const valid = validateProfileInput(input);
  if (!valid.ok) return valid;
  if ((await countProfiles(db, userId)) >= MAX_PROFILES) return { ok: false, errors: { form: 'Limite de 5 perfis.' } };
  const [profile] = await db
    .insert(profiles)
    .values({ id: randomUUID(), userId, ...valid.value, prefs: prefs ? parsePrefs(prefs) : defaultPrefs() })
    .returning();
  return { ok: true, profile };
}

export async function updateProfile(db, userId, profileId, input) {
  const valid = validateProfileInput(input);
  if (!valid.ok) return valid;
  const [profile] = await db
    .update(profiles)
    .set(valid.value)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();
  return profile ? { ok: true, profile } : { ok: false, errors: { form: 'Perfil não encontrado.' } };
}

export async function deleteProfile(db, userId, profileId) {
  if (!(await getOwnedProfile(db, userId, profileId))) return { ok: false, errors: { form: 'Perfil não encontrado.' } };
  if ((await countProfiles(db, userId)) <= 1) return { ok: false, errors: { form: 'A conta precisa de pelo menos um perfil.' } };
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return { ok: true };
}

export async function saveProfilePrefs(db, userId, profileId, prefs) {
  const clean = parsePrefs(prefs);
  const [row] = await db
    .update(profiles)
    .set({ prefs: clean })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();
  return row ? clean : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/profiles.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/profiles.js tests/unit/profiles.test.js
git commit -m "feat: serviço de perfis (até 5, Kids com faixa, preferências por perfil)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: PIN dos pais

**Files:**
- Create: `lib/pin.js`
- Test: `tests/unit/pin.test.js`

**Interfaces:**
- Consumes: tabela `parentalPins` (Tarefa 1)
- Produces:
  - `PIN_MAX_ATTEMPTS = 5`, `PIN_LOCK_MS = 300000`
  - `isValidPin(pin): boolean` (exatamente 4 números)
  - `hashPin(pin): Promise<string>` e `pinMatches(pin, stored): Promise<boolean>`
  - `hasPin(db, userId): Promise<boolean>`
  - `setPin(db, userId, pin): Promise<{ ok: true } | { ok: false, error }>`
  - `verifyPin(db, userId, pin, now = new Date())` → `{ ok: true }` ou `{ ok: false, reason: 'sem-pin' | 'bloqueado' | 'incorreto', remaining?, lockedUntil? }`
  - `pinMessage(result, now = new Date()): string` (texto para a interface)

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/pin.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user, parentalPins } from '@/lib/db/schema';
import {
  PIN_MAX_ATTEMPTS, PIN_LOCK_MS, isValidPin, hasPin, setPin, verifyPin, pinMessage,
} from '@/lib/pin';

let db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
});

describe('PIN dos pais', () => {
  it('aceita só 4 números', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const bad of ['123', '12345', '12a4', '', ' 1234', null]) expect(isValidPin(bad)).toBe(false);
  });

  it('guarda protegido, nunca o número', async () => {
    expect(await hasPin(db, 'u1')).toBe(false);
    expect(await setPin(db, 'u1', '4321')).toEqual({ ok: true });
    const [row] = await db.select().from(parentalPins);
    expect(row.pinHash).not.toContain('4321');
    expect(await hasPin(db, 'u1')).toBe(true);
    expect(await setPin(db, 'u1', '12')).toEqual({ ok: false, error: 'O PIN tem 4 números.' });
  });

  it('confere o PIN e conta as tentativas restantes', async () => {
    await setPin(db, 'u1', '4321');
    expect(await verifyPin(db, 'u1', '4321')).toEqual({ ok: true });
    expect(await verifyPin(db, 'u1', '0000')).toEqual({ ok: false, reason: 'incorreto', remaining: 4 });
    expect(pinMessage({ ok: false, reason: 'incorreto', remaining: 4 })).toBe('PIN incorreto. Restam 4 tentativas.');
    expect(pinMessage({ ok: false, reason: 'incorreto', remaining: 1 })).toBe('PIN incorreto. Resta 1 tentativa.');
  });

  it('5 erros bloqueiam por 5 minutos, mesmo com o PIN certo; depois libera', async () => {
    await setPin(db, 'u1', '4321');
    const t0 = new Date('2026-10-17T12:00:00Z');
    for (let i = 0; i < PIN_MAX_ATTEMPTS - 1; i += 1) await verifyPin(db, 'u1', '0000', t0);
    const fifth = await verifyPin(db, 'u1', '0000', t0);
    expect(fifth).toMatchObject({ ok: false, reason: 'bloqueado' });
    const in4min = new Date(t0.getTime() + 4 * 60 * 1000);
    expect(await verifyPin(db, 'u1', '4321', in4min)).toMatchObject({ ok: false, reason: 'bloqueado' });
    expect(pinMessage(fifth, in4min)).toBe('Muitas tentativas. Tente de novo em 1 minuto.');
    const in6min = new Date(t0.getTime() + PIN_LOCK_MS + 60 * 1000);
    expect(await verifyPin(db, 'u1', '4321', in6min)).toEqual({ ok: true });
    expect(await verifyPin(db, 'u1', '0000', in6min)).toMatchObject({ remaining: 4 });
  });

  it('acertar zera as tentativas', async () => {
    await setPin(db, 'u1', '4321');
    await verifyPin(db, 'u1', '0000');
    await verifyPin(db, 'u1', '4321');
    expect(await verifyPin(db, 'u1', '0000')).toMatchObject({ remaining: 4 });
  });

  it('conta sem PIN', async () => {
    expect(await verifyPin(db, 'u1', '1234')).toEqual({ ok: false, reason: 'sem-pin' });
  });

  it('trocar o PIN desbloqueia e zera tentativas', async () => {
    await setPin(db, 'u1', '4321');
    for (let i = 0; i < PIN_MAX_ATTEMPTS; i += 1) await verifyPin(db, 'u1', '0000');
    await setPin(db, 'u1', '9999');
    expect(await verifyPin(db, 'u1', '9999')).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/pin.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/pin.js`:

```js
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { parentalPins } from './db/schema.js';

const scrypt = promisify(scryptCb);
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 5 * 60 * 1000;

export const isValidPin = (pin) => typeof pin === 'string' && /^\d{4}$/.test(pin);

// "sal:hash" em hexadecimal; o PIN em si nunca é guardado.
export async function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function pinMatches(pin, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

async function getRow(db, userId) {
  const [row] = await db.select().from(parentalPins).where(eq(parentalPins.userId, userId));
  return row ?? null;
}

export async function hasPin(db, userId) {
  return Boolean(await getRow(db, userId));
}

export async function setPin(db, userId, pin) {
  if (!isValidPin(pin)) return { ok: false, error: 'O PIN tem 4 números.' };
  const values = { pinHash: await hashPin(pin), failedAttempts: 0, lockedUntil: null, updatedAt: new Date() };
  await db
    .insert(parentalPins)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: parentalPins.userId, set: values });
  return { ok: true };
}

export async function verifyPin(db, userId, pin, now = new Date()) {
  const row = await getRow(db, userId);
  if (!row) return { ok: false, reason: 'sem-pin' };
  if (row.lockedUntil && row.lockedUntil > now) return { ok: false, reason: 'bloqueado', lockedUntil: row.lockedUntil };

  // Bloqueio vencido: começa uma nova série de tentativas.
  const attempts = row.lockedUntil ? 0 : row.failedAttempts;
  if (isValidPin(pin) && (await pinMatches(pin, row.pinHash))) {
    await db.update(parentalPins).set({ failedAttempts: 0, lockedUntil: null }).where(eq(parentalPins.userId, userId));
    return { ok: true };
  }
  const failed = attempts + 1;
  if (failed >= PIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + PIN_LOCK_MS);
    await db.update(parentalPins).set({ failedAttempts: 0, lockedUntil }).where(eq(parentalPins.userId, userId));
    return { ok: false, reason: 'bloqueado', lockedUntil };
  }
  await db.update(parentalPins).set({ failedAttempts: failed, lockedUntil: null }).where(eq(parentalPins.userId, userId));
  return { ok: false, reason: 'incorreto', remaining: PIN_MAX_ATTEMPTS - failed };
}

export function pinMessage(result, now = new Date()) {
  if (result.reason === 'incorreto') {
    return result.remaining === 1 ? 'PIN incorreto. Resta 1 tentativa.' : `PIN incorreto. Restam ${result.remaining} tentativas.`;
  }
  if (result.reason === 'bloqueado') {
    const minutes = Math.max(1, Math.ceil((new Date(result.lockedUntil) - now) / 60000));
    return `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
  }
  if (result.reason === 'sem-pin') return 'Esta conta ainda não tem PIN dos pais.';
  return '';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/pin.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pin.js tests/unit/pin.test.js
git commit -m "feat: PIN dos pais protegido, com bloqueio de 5 minutos após 5 erros" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Conta de demonstração

**Files:**
- Create: `lib/demo.js`, `scripts/demo-seed.mjs`
- Test: `tests/unit/demo.test.js`

**Interfaces:**
- Consumes: `createAuth` (Tarefa 2), `createProfile`, `listProfiles`, `PROFILE_COLORS` (Tarefa 5), `setPin`, `verifyPin` (Tarefa 6), tabelas `user`, `profiles`, `demoState` (Tarefa 1), `DEMO_EMAIL` (Tarefa 3, repetido aqui como constante para o script não importar `viewer-core`)
- Produces:
  - `DEMO_EMAIL = 'demo@paidegua.app'`, `DEMO_PIN = '1234'`, `DEMO_PROFILES`
  - `belemDate(now: Date): string` → `'AAAA-MM-DD'` no fuso UTC−3
  - `ensureDemoAccount(db, auth, password, now = new Date())` → `userId` (cria a conta se não existir e reseta)
  - `resetDemo(db, userId, now = new Date())`
  - `resetDemoIfNeeded(db, userId, now = new Date())` → `boolean` (true se resetou)

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/demo.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createTestAuth } from '../helpers/test-auth';
import { listProfiles, createProfile, PROFILE_COLORS } from '@/lib/profiles';
import { verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, DEMO_PIN, belemDate, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { DEMO_EMAIL as VIEWER_DEMO_EMAIL } from '@/lib/auth/viewer-core';

describe('conta de demonstração', () => {
  it('data de Belém é UTC−3', () => {
    expect(belemDate(new Date('2026-10-18T02:59:00Z'))).toBe('2026-10-17');
    expect(belemDate(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18');
    expect(DEMO_EMAIL).toBe(VIEWER_DEMO_EMAIL);
  });

  it('cria a conta com Pai, Mãe e Pequeno (Kids 10) e PIN 1234', async () => {
    const { auth, db } = await createTestAuth();
    const userId = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    const profiles = await listProfiles(db, userId);
    expect(profiles.map((p) => [p.name, p.kind, p.maxRating])).toEqual([
      ['Pai', 'adulto', null], ['Mãe', 'adulto', null], ['Pequeno', 'kids', '10'],
    ]);
    expect(await verifyPin(db, userId, DEMO_PIN)).toEqual({ ok: true });
    const login = await auth.api.signInEmail({ body: { email: DEMO_EMAIL, password: 'demo-paidegua-2026' }, asResponse: true });
    expect(login.status).toBe(200);
  });

  it('rodar de novo não duplica a conta', async () => {
    const { auth, db } = await createTestAuth();
    const a = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    const b = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    expect(b).toBe(a);
    expect(await listProfiles(db, a)).toHaveLength(3);
  });

  it('reseta uma vez por dia (horário de Belém), desfazendo o que visitantes mudaram', async () => {
    const { auth, db } = await createTestAuth();
    const day1 = new Date('2026-10-17T15:00:00Z');
    const userId = await ensureDemoAccount(db, auth, 'demo-paidegua-2026', day1);
    await createProfile(db, userId, { name: 'Bagunça', color: PROFILE_COLORS[0], kind: 'adulto' });
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-17T23:00:00Z'))).toBe(false);
    expect(await listProfiles(db, userId)).toHaveLength(4);
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-18T04:00:00Z'))).toBe(true);
    expect((await listProfiles(db, userId)).map((p) => p.name)).toEqual(['Pai', 'Mãe', 'Pequeno']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/demo.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/demo.js`:

```js
import { eq } from 'drizzle-orm';
import { demoState, profiles, user } from './db/schema.js';
import { PROFILE_COLORS, createProfile } from './profiles.js';
import { setPin } from './pin.js';

export const DEMO_EMAIL = 'demo@paidegua.app';
export const DEMO_PIN = '1234';
export const DEMO_PROFILES = [
  { name: 'Pai', color: PROFILE_COLORS[3], kind: 'adulto' },
  { name: 'Mãe', color: PROFILE_COLORS[1], kind: 'adulto' },
  { name: 'Pequeno', color: PROFILE_COLORS[2], kind: 'kids', maxRating: '10' },
];

// Data no horário de Belém (UTC−3), no formato AAAA-MM-DD.
export const belemDate = (now) => new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function resetDemo(db, userId, now = new Date()) {
  await db.delete(profiles).where(eq(profiles.userId, userId));
  // Um a um, para manter a ordem de criação (Pai, Mãe, Pequeno).
  for (let i = 0; i < DEMO_PROFILES.length; i += 1) {
    const { profile } = await createProfile(db, userId, DEMO_PROFILES[i]);
    await db.update(profiles).set({ createdAt: new Date(now.getTime() + i) }).where(eq(profiles.id, profile.id));
  }
  await setPin(db, userId, DEMO_PIN);
  const lastReset = belemDate(now);
  await db.insert(demoState).values({ id: 1, lastReset }).onConflictDoUpdate({ target: demoState.id, set: { lastReset } });
}

export async function resetDemoIfNeeded(db, userId, now = new Date()) {
  const [state] = await db.select().from(demoState).where(eq(demoState.id, 1));
  if (state?.lastReset === belemDate(now)) return false;
  await resetDemo(db, userId, now);
  return true;
}

export async function ensureDemoAccount(db, auth, password, now = new Date()) {
  const [existing] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL));
  if (existing) return existing.id;
  const created = await auth.api.signUpEmail({ body: { name: 'Família Demonstração', email: DEMO_EMAIL, password } });
  await resetDemo(db, created.user.id, now);
  return created.user.id;
}
```

`scripts/demo-seed.mjs`:

```js
// Uso: npm run demo:seed  (cria a conta de demonstração, se ainda não existir)
import { createDb } from '../lib/db/index.js';
import { createAuth } from '../lib/auth/create-auth.js';
import { ensureDemoAccount, DEMO_EMAIL } from '../lib/demo.js';

const conn = createDb(process.env.DATABASE_URL);
const auth = createAuth({
  db: conn.db,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  sendResetEmail: async () => {},
  rateLimit: false,
  withNextCookies: false,
});
await ensureDemoAccount(conn.db, auth, process.env.DEMO_PASSWORD || 'demo-paidegua-2026');
await conn.client.end?.();
await conn.client.close?.();
console.log(`Conta de demonstração pronta: ${DEMO_EMAIL}`);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/demo.test.js`
Expected: PASS.

Run: `npm run demo:seed`
Expected: "Conta de demonstração pronta: demo@paidegua.app".

- [ ] **Step 5: Commit**

```bash
git add lib/demo.js scripts/demo-seed.mjs tests/unit/demo.test.js
git commit -m "feat: conta de demonstração com reset diário pelo horário de Belém" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Acesso no servidor e ações da conta

**Files:**
- Create: `lib/auth/viewer.js`, `lib/auth/guards.js`, `lib/account-rules.js`, `lib/actions/conta.js`
- Modify: `app/api/explorar/route.js`, `app/api/buscar/route.js`, `app/(vitrine)/filmes/page.jsx`, `app/(vitrine)/series/page.jsx`, `app/explorar/page.jsx`, `app/busca/page.jsx`, `app/filme/[id]/page.jsx`, `app/serie/[id]/page.jsx`
- Test: `tests/unit/account-rules.test.js`, `tests/unit/guards.test.js`, `tests/unit/api-protegida.test.js`

**Interfaces:**
- Consumes: `buildViewer`, cookies e constantes (Tarefa 3); `getAuth` (Tarefa 2); `getDb` (Tarefa 1); serviços das Tarefas 5, 6 e 7
- Produces:
  - `getViewer(): Promise<Viewer>` (memorizado por requisição com `cache` do React)
  - `requireUser(returnTo)`, `requireProfile(returnTo)` → `Viewer` ou redirecionamento (`/entrar?voltar=…`, `/perfis?voltar=…`)
  - `profileSwitchAllowed(viewer)`, `adultAreaAllowed(viewer)`, `canChangeAccount(viewer)`, `safeReturnPath(path)`
  - Ações do servidor (`lib/actions/conta.js`), todas assíncronas:
    - `chooseProfileAction(profileId, voltar = '/')` → redireciona; ou `{ ok: false, error: 'pin' | string }`
    - `createFirstProfileAction(localPrefs)` → redireciona para `/`
    - `createProfileAction(prevState, formData)`, `updateProfileAction(prevState, formData)` → `{ ok, errors? }`
    - `deleteProfileAction(profileId)` → `{ ok, error? }`
    - `setPinAction(prevState, formData)` (campos `pin`, `confirm`, `password`) → `{ ok, error? }`
    - `verifyPinAction({ pin, purpose: 'adulto' | 'titulo', titleKey? })` → `{ ok: true }` ou `{ ok: false, message }`
    - `savePrefsAction(prefs)` → `{ ok }`
    - `signInDemoAction()` → redireciona para `/perfis`
    - `signOutAction()` → redireciona para `/`; ou `{ ok: false, error: 'pin' }`
    - `changePasswordAction(prevState, formData)` (campos `current`, `next`, `confirm`) → `{ ok, error? }`
    - `deleteAccountAction(prevState, formData)` (campos `password`, `confirm`) → redireciona para `/`; ou `{ ok: false, error }`

As regras de quem pode o quê ficam em `lib/account-rules.js` (puro e testado); as ações só juntam regra, serviço, cookie e redirecionamento.

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/account-rules.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { profileSwitchAllowed, adultAreaAllowed, canChangeAccount, safeReturnPath } from '@/lib/account-rules';

const visitor = { user: null, kids: false, parentMode: false, isDemo: false };
const adult = { user: { id: 'u1' }, kids: false, parentMode: true, isDemo: false };
const kids = { user: { id: 'u1' }, kids: true, parentMode: false, isDemo: false };
const kidsWithPin = { ...kids, parentMode: true };

describe('regras da conta', () => {
  it('no Kids, trocar perfil e áreas de adulto pedem o PIN', () => {
    expect(profileSwitchAllowed(adult)).toBe(true);
    expect(profileSwitchAllowed(kids)).toBe(false);
    expect(profileSwitchAllowed(kidsWithPin)).toBe(true);
    expect(profileSwitchAllowed(visitor)).toBe(false);
    expect(adultAreaAllowed(kids)).toBe(false);
    expect(adultAreaAllowed(kidsWithPin)).toBe(true);
  });

  it('a conta de demonstração não troca senha nem é excluída', () => {
    expect(canChangeAccount(adult)).toBe(true);
    expect(canChangeAccount({ ...adult, isDemo: true })).toBe(false);
  });

  it('só volta para caminhos do próprio site', () => {
    expect(safeReturnPath('/filme/1?x=2')).toBe('/filme/1?x=2');
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '', null, 'filme/1']) expect(safeReturnPath(bad)).toBe('/');
  });
});
```

`tests/unit/guards.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
vi.mock('next/navigation', () => ({
  redirect: (url) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }); },
}));

const { requireUser, requireProfile } = await import('@/lib/auth/guards');

beforeEach(() => viewer.mockReset());

describe('guardas das páginas', () => {
  it('visitante vai para a entrada e depois volta ao destino', async () => {
    viewer.mockResolvedValue({ user: null });
    await expect(requireProfile('/filme/1')).rejects.toMatchObject({ url: '/entrar?voltar=%2Ffilme%2F1' });
    await expect(requireUser('/conta')).rejects.toMatchObject({ url: '/entrar?voltar=%2Fconta' });
  });

  it('logado sem perfil escolhido vai para "Quem está assistindo?"', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, needsProfile: true });
    await expect(requireProfile('/explorar')).rejects.toMatchObject({ url: '/perfis?voltar=%2Fexplorar' });
  });

  it('com perfil, segue e devolve o viewer', async () => {
    const v = { user: { id: 'u1' }, needsProfile: false, profile: { id: 'p1' } };
    viewer.mockResolvedValue(v);
    await expect(requireProfile('/explorar')).resolves.toBe(v);
  });
});
```

`tests/unit/api-protegida.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));

const { GET: explorar } = await import('@/app/api/explorar/route');
const { GET: buscar } = await import('@/app/api/buscar/route');

describe('rotas internas exigem perfil', () => {
  it('visitante recebe 401 com mensagem', async () => {
    viewer.mockResolvedValue({ user: null, profile: null });
    for (const [GET, url] of [[explorar, 'http://localhost/api/explorar'], [buscar, 'http://localhost/api/buscar?q=matrix']]) {
      const res = await GET(new NextRequest(url));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Entre na sua conta para continuar.' });
    }
  });

  it('logado sem perfil escolhido também recebe 401', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profile: null, needsProfile: true });
    expect((await explorar(new NextRequest('http://localhost/api/explorar'))).status).toBe(401);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/account-rules.test.js tests/unit/guards.test.js tests/unit/api-protegida.test.js`
Expected: FAIL, importações não encontradas (e as rotas ainda respondem sem perguntar quem é).

- [ ] **Step 3: Regras, viewer e guardas**

`lib/account-rules.js`:

```js
// Quem pode o quê. No Kids, sair do perfil ou entrar em áreas de adulto pede o PIN (modo adulto).
export const profileSwitchAllowed = (viewer) => Boolean(viewer?.user) && (!viewer.kids || viewer.parentMode);
export const adultAreaAllowed = profileSwitchAllowed;
export const canChangeAccount = (viewer) => Boolean(viewer?.user) && !viewer.isDemo;

// Evita redirecionar para outro site depois de entrar.
export function safeReturnPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  return path;
}
```

`lib/auth/viewer.js`:

```js
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
```

`lib/auth/guards.js`:

```js
import { redirect } from 'next/navigation';
import { getViewer } from './viewer';

const back = (path) => encodeURIComponent(path || '/');

export async function requireUser(returnTo) {
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/entrar?voltar=${back(returnTo)}`);
  return viewer;
}

export async function requireProfile(returnTo) {
  const viewer = await requireUser(returnTo);
  if (viewer.needsProfile) redirect(`/perfis?voltar=${back(returnTo)}`);
  return viewer;
}
```

- [ ] **Step 4: Rotas internas exigem perfil**

`app/api/explorar/route.js` (substituir todo o conteúdo):

```js
import { NextResponse } from 'next/server';
import { parseExploreParams } from '@/lib/explore-params';
import { discoverPage } from '@/lib/tmdb/catalog';
import { annotateRatings } from '@/lib/tmdb/ratings';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { getViewer } from '@/lib/auth/viewer';

export async function GET(request) {
  const viewer = await getViewer();
  if (!viewer.profile) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const filters = parseExploreParams(request.nextUrl.searchParams);
  const myProviders = parseProvidersCookie(request.cookies.get(PROVIDERS_COOKIE)?.value);
  try {
    const page = await discoverPage(filters, { myProviders });
    // No Kids, títulos acima da faixa vêm com cadeado.
    const results = viewer.kids ? await annotateRatings(page.results, viewer.maxRating, viewer.unlocked) : page.results;
    return NextResponse.json({ ...page, results });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar agora.' }, { status: 502 });
  }
}
```

`app/api/buscar/route.js` (substituir todo o conteúdo):

```js
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
```

Os testes antigos `tests/unit/api-explorar.test.js` e `tests/unit/api-buscar.test.js` passam a precisar de um perfil: acrescentar no topo de cada um

```js
vi.mock('@/lib/auth/viewer', () => ({
  getViewer: async () => ({ user: { id: 'u1' }, profile: { id: 'p1' }, kids: false, maxRating: null, unlocked: new Set() }),
}));
```

(e incluir `vi` na importação de `vitest`, se ainda não estiver).

- [ ] **Step 5: Páginas internas exigem perfil**

Em cada página abaixo, chamar a guarda no começo da função da página, com o caminho de volta:

- `app/(vitrine)/filmes/page.jsx`: a página vira assíncrona — `export default async function MoviesPage() { await requireProfile('/filmes'); return <HomeView heading="Filmes" type="movie" />; }`
- `app/(vitrine)/series/page.jsx`: `export default async function SeriesPage() { await requireProfile('/series'); return <HomeView heading="Séries" type="tv" showMoods={false} />; }`
- `app/explorar/page.jsx`: primeira linha da função: `await requireProfile('/explorar');`
- `app/busca/page.jsx`: primeira linha: `await requireProfile('/busca');`
- `app/filme/[id]/page.jsx`: depois de ler `id`: `await requireProfile(\`/filme/${id}\`);`
- `app/serie/[id]/page.jsx`: depois de ler `id`: `await requireProfile(\`/serie/${id}\`);`

Em todas, importar `import { requireProfile } from '@/lib/auth/guards';`.

- [ ] **Step 6: Ações da conta**

`lib/actions/conta.js`:

```js
'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/auth/viewer';
import { signValue } from '@/lib/auth/signed-cookie';
import {
  PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE, PARENT_MODE_MS, encodeParentMode, encodeUnlocked,
} from '@/lib/auth/viewer-core';
import { adultAreaAllowed, canChangeAccount, profileSwitchAllowed, safeReturnPath } from '@/lib/account-rules';
import { createProfile, deleteProfile, getOwnedProfile, listProfiles, saveProfilePrefs, updateProfile } from '@/lib/profiles';
import { hasPin, pinMessage, setPin, verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { PROVIDERS_COOKIE, providersCookieValue } from '@/lib/preferences';

const secret = () => process.env.BETTER_AUTH_SECRET;
const demoPassword = () => process.env.DEMO_PASSWORD || 'demo-paidegua-2026';
// Cookies de sessão do navegador (somem ao fechar), protegidos contra leitura pelo JavaScript da página.
const sessionCookie = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };

async function applyProfileCookies(profile) {
  const jar = await cookies();
  jar.set(PROFILE_COOKIE, signValue(profile.id, secret()), sessionCookie);
  jar.delete(UNLOCKED_COOKIE);
  jar.delete(PARENT_COOKIE);
  // "Meus streamings" do perfil vale também nas páginas montadas no servidor.
  jar.set(PROVIDERS_COOKIE, providersCookieValue(profile.prefs?.myProviders ?? []), { path: '/', maxAge: 31536000, sameSite: 'lax' });
}

async function clearProfileCookies() {
  const jar = await cookies();
  [PROFILE_COOKIE, UNLOCKED_COOKIE, PARENT_COOKIE].forEach((name) => jar.delete(name));
}

const field = (formData, name) => String(formData.get(name) ?? '');
const profileInput = (formData) => ({
  name: field(formData, 'name'),
  color: field(formData, 'color'),
  kind: field(formData, 'kind'),
  maxRating: field(formData, 'maxRating') || null,
});

export async function chooseProfileAction(profileId, voltar = '/') {
  const viewer = await getViewer();
  if (!viewer.user) redirect('/entrar');
  if (viewer.profile && !profileSwitchAllowed(viewer)) return { ok: false, error: 'pin' };
  const profile = await getOwnedProfile(getDb(), viewer.user.id, profileId);
  if (!profile) return { ok: false, error: 'Perfil não encontrado.' };
  await applyProfileCookies(profile);
  redirect(safeReturnPath(voltar));
}

// Logo depois de criar a conta: o primeiro perfil leva o nome da pessoa e as preferências do navegador.
export async function createFirstProfileAction(localPrefs) {
  const viewer = await getViewer();
  if (!viewer.user) redirect('/entrar');
  const db = getDb();
  let [profile] = await listProfiles(db, viewer.user.id);
  if (!profile) {
    const name = viewer.user.name.trim().slice(0, 20) || 'Eu';
    ({ profile } = await createProfile(db, viewer.user.id, { name, color: '#8b5cf6', kind: 'adulto' }, { prefs: localPrefs }));
  }
  await applyProfileCookies(profile);
  redirect('/');
}

export async function createProfileAction(_prev, formData) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } };
  const input = profileInput(formData);
  if (input.kind === 'kids' && !(await hasPin(getDb(), viewer.user.id))) {
    return { ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true };
  }
  const result = await createProfile(getDb(), viewer.user.id, input);
  if (result.ok) revalidatePath('/perfis', 'layout');
  return result.ok ? { ok: true } : result;
}

export async function updateProfileAction(_prev, formData) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } };
  const input = profileInput(formData);
  if (input.kind === 'kids' && !(await hasPin(getDb(), viewer.user.id))) {
    return { ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true };
  }
  const result = await updateProfile(getDb(), viewer.user.id, field(formData, 'id'), input);
  if (result.ok) revalidatePath('/perfis', 'layout');
  return result.ok ? { ok: true } : result;
}

export async function deleteProfileAction(profileId) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const result = await deleteProfile(getDb(), viewer.user.id, profileId);
  if (!result.ok) return { ok: false, error: result.errors.form };
  if (viewer.profile?.id === profileId) await clearProfileCookies();
  revalidatePath('/perfis', 'layout');
  return { ok: true };
}

export async function setPinAction(_prev, formData) {
  const viewer = await getViewer();
  if (!viewer.user || !adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const pin = field(formData, 'pin');
  if (pin !== field(formData, 'confirm')) return { ok: false, error: 'Os PINs não são iguais.' };
  const db = getDb();
  // Trocar um PIN que já existe pede a senha da conta (criar o primeiro, não).
  if (await hasPin(db, viewer.user.id)) {
    if (!canChangeAccount(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
    try {
      await getAuth().api.verifyPassword({ body: { password: field(formData, 'password') }, headers: await headers() });
    } catch {
      return { ok: false, error: 'Senha incorreta.' };
    }
  }
  return setPin(db, viewer.user.id, pin);
}

export async function verifyPinAction({ pin, purpose, titleKey }) {
  const viewer = await getViewer();
  if (!viewer.user) return { ok: false, message: 'Entre na sua conta para continuar.' };
  const result = await verifyPin(getDb(), viewer.user.id, String(pin ?? ''));
  if (!result.ok) return { ok: false, message: pinMessage(result) };
  const jar = await cookies();
  if (purpose === 'titulo' && titleKey) {
    jar.set(UNLOCKED_COOKIE, encodeUnlocked([...viewer.unlocked, titleKey], secret()), sessionCookie);
  } else {
    jar.set(PARENT_COOKIE, encodeParentMode(Date.now(), secret()), { ...sessionCookie, maxAge: PARENT_MODE_MS / 1000 });
  }
  return { ok: true };
}

export async function savePrefsAction(prefs) {
  const viewer = await getViewer();
  if (!viewer.profile) return { ok: false };
  const saved = await saveProfilePrefs(getDb(), viewer.user.id, viewer.profile.id, prefs);
  if (saved) {
    (await cookies()).set(PROVIDERS_COOKIE, providersCookieValue(saved.myProviders), { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }
  return { ok: Boolean(saved) };
}

export async function signInDemoAction() {
  const db = getDb();
  const auth = getAuth();
  const userId = await ensureDemoAccount(db, auth, demoPassword());
  await resetDemoIfNeeded(db, userId);
  await auth.api.signInEmail({ body: { email: DEMO_EMAIL, password: demoPassword() }, headers: await headers() });
  redirect('/perfis');
}

export async function signOutAction() {
  const viewer = await getViewer();
  if (viewer.profile && !profileSwitchAllowed(viewer)) return { ok: false, error: 'pin' };
  await getAuth().api.signOut({ headers: await headers() });
  await clearProfileCookies();
  redirect('/');
}

export async function changePasswordAction(_prev, formData) {
  const viewer = await getViewer();
  if (!canChangeAccount(viewer) || !adultAreaAllowed(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
  const next = field(formData, 'next');
  if (next !== field(formData, 'confirm')) return { ok: false, error: 'As senhas não são iguais.' };
  if (next.length < 8) return { ok: false, error: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  try {
    await getAuth().api.changePassword({
      body: { currentPassword: field(formData, 'current'), newPassword: next, revokeOtherSessions: true },
      headers: await headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Senha atual incorreta.' };
  }
}

export async function deleteAccountAction(_prev, formData) {
  const viewer = await getViewer();
  if (!canChangeAccount(viewer) || !adultAreaAllowed(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
  if (field(formData, 'confirm') !== 'EXCLUIR') return { ok: false, error: 'Digite EXCLUIR para confirmar.' };
  try {
    await getAuth().api.deleteUser({ body: { password: field(formData, 'password') }, headers: await headers() });
  } catch {
    return { ok: false, error: 'Senha incorreta.' };
  }
  await clearProfileCookies();
  redirect('/');
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/unit/account-rules.test.js tests/unit/guards.test.js tests/unit/api-protegida.test.js tests/unit/api-explorar.test.js tests/unit/api-buscar.test.js`
Expected: PASS.

Run: `npm run build`
Expected: build concluído (as ações compilam; páginas internas passam a ser dinâmicas).

- [ ] **Step 8: Commit**

```bash
git add lib/auth/viewer.js lib/auth/guards.js lib/account-rules.js lib/actions/conta.js app tests/unit
git commit -m "feat: páginas e rotas internas exigem perfil; ações da conta no servidor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Vitrine do visitante e conteúdo do Kids

**Files:**
- Modify: `lib/tmdb/catalog.js`, `lib/explore-params.js` (nenhuma mudança de assinatura; só uso), `components/HomeView.jsx`, `app/(vitrine)/page.jsx`
- Test: `tests/unit/catalog.test.js` (novos casos)

**Interfaces:**
- Consumes: `filterByRating`, `movieCertificationParams` (Tarefa 4); `getViewerOrVisitor` (Tarefa 8)
- Produces (mudanças de assinatura, com valores padrão que mantêm o comportamento atual):
  - `getHomeRowDefs(myProviders = [], type, { maxRating = null } = {})` → cada definição ganha `maxRating`
  - `loadHomeRow(def)` → filtra séries pela classificação quando `def.maxRating` existe (filmes já vêm filtrados pelo TMDB)
  - `getHomeHero(myProviders = [], type, { maxRating = null } = {})`
  - `getMoodCards({ maxRating = null } = {})`
  - `discoverPage(filters, { myProviders = [], extraParams = {} } = {})`
  - `HomeView({ heading, type, showMoods, viewer })` — `viewer` define a faixa (`viewer.maxRating`)

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `tests/unit/catalog.test.js`:

```js
describe('faixa de classificação (visitante e Kids)', () => {
  const tvRating = (rating) => ({ results: [{ iso_3166_1: 'BR', rating }] });

  it('fileiras: filmes filtrados pelo TMDB e séries conferidas uma a uma', async () => {
    const fetchMock = mockTmdb({
      '/discover/movie': { results: [movie(1, 5)] },
      '/discover/tv': { results: [tv(2, 4), tv(3, 3)] },
      '/tv/2/content_ratings': tvRating('12'),
      '/tv/3/content_ratings': tvRating('16'),
    });
    const [def] = getHomeRowDefs([8], undefined, { maxRating: '14' });
    const row = await loadHomeRow(def);
    expect(row.items.map((t) => `${t.type}-${t.id}`)).toEqual(['movie-1', 'tv-2']);
    const discoverMovie = fetchMock.mock.calls.map(([u]) => new URL(u)).find((u) => u.pathname.endsWith('/discover/movie'));
    expect(discoverMovie.searchParams.get('certification_country')).toBe('BR');
    expect(discoverMovie.searchParams.get('certification.lte')).toBe('14');
  });

  it('sem faixa (adulto), nada muda e nenhuma classificação é consultada', async () => {
    const fetchMock = mockTmdb({ '/discover/movie': { results: [movie(1, 5)] }, '/discover/tv': { results: [tv(2, 4)] } });
    const [def] = getHomeRowDefs([8]);
    const row = await loadHomeRow(def);
    expect(row.items).toHaveLength(2);
    expect(calledPaths(fetchMock).some((p) => p.includes('content_ratings'))).toBe(false);
  });

  it('destaque só com títulos da faixa', async () => {
    mockTmdb({
      '/trending/all/week': { results: [
        { id: 1, media_type: 'movie', title: 'Terror', backdrop_path: '/a.jpg' },
        { id: 2, media_type: 'movie', title: 'Animação', backdrop_path: '/b.jpg' },
      ] },
      '/movie/1/watch/providers': available,
      '/movie/2/watch/providers': available,
      '/movie/1/release_dates': { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '18' }] }] },
      '/movie/2/release_dates': { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: 'L' }] }] },
      '/movie/2/videos': { results: [] },
      '/discover/movie': { results: [] },
      '/discover/tv': { results: [] },
    });
    const hero = await getHomeHero([], undefined, { maxRating: '10' });
    expect(hero.map((t) => t.title)).toEqual(['Animação']);
  });

  it('humores da vitrine usam a faixa no discover de filmes', async () => {
    const fetchMock = mockTmdb({
      '/search/keyword': (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] }),
      '/discover/movie': { results: [{ id: 1, title: 'X', backdrop_path: '/x.jpg' }] },
    });
    await getMoodCards({ maxRating: '14' });
    const calls = fetchMock.mock.calls.map(([u]) => new URL(u)).filter((u) => u.pathname.endsWith('/discover/movie'));
    expect(calls.length).toBe(8);
    expect(calls.every((u) => u.searchParams.get('certification.lte') === '14')).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/catalog.test.js`
Expected: FAIL nos 4 casos novos.

- [ ] **Step 3: Implementar no catálogo**

Em `lib/tmdb/catalog.js`:

1. Importar: `import { filterByRating, movieCertificationParams } from './ratings';`
2. `discoverPage`: mudar a assinatura para `export async function discoverPage(filters, { myProviders = [], extraParams = {} } = {})` e, onde monta a chamada, trocar `tmdbFetch(path, params, …)` por `tmdbFetch(path, { ...params, ...extraParams }, { revalidate: CACHE.rows })`.
3. `getMoodCards`: assinatura `export async function getMoodCards({ maxRating = null } = {})` e passar `{ extraParams: movieCertificationParams(maxRating) }` como segundo argumento de `discoverPage`.
4. `getHomeRowDefs`: assinatura `export function getHomeRowDefs(myProviders = [], type, { maxRating = null } = {})`; logo no começo, `const cert = movieCertificationParams(maxRating);`; em **todas** as chamadas de `discoverMixed` dentro das definições, somar `cert` aos parâmetros de filme: na fileira de lançamentos, `movieParams: { 'primary_release_date.gte': …, 'primary_release_date.lte': …, ...cert }`; nas fileiras de plataforma, `movieParams: { ...recent.movie, ...cert }`; nas fileiras de gênero, acrescentar `movieParams: cert`. Por fim, retornar as definições com `maxRating`: `return defs.map((d) => ({ ...d, maxRating }));` (guardar o array atual numa constante `defs`).
5. `loadHomeRow`: depois de obter `items`, quando `def.maxRating` existir, filtrar só as séries:

```js
  let list = items.status === 'fulfilled' ? items.value : [];
  if (def.maxRating) {
    const series = await filterByRating(list.filter((t) => t.type === 'tv'), def.maxRating);
    const allowed = new Set(series.map((t) => t.id));
    list = list.filter((t) => t.type === 'movie' || allowed.has(t.id));
  }
```

e usar `list` no lugar de `items.status === 'fulfilled' ? items.value : []` no objeto devolvido.

6. `getHomeHero`: assinatura `export async function getHomeHero(myProviders = [], type, { maxRating = null } = {})` e repassar `maxRating` para `getHeroItems(providers, myProviders.length > 0, type, maxRating)`. Em `getHeroItems(providers, onlyThese, type, maxRating = null)`, logo depois de calcular `available`, aplicar `const allowed = await filterByRating(available, maxRating);` e usar `allowed` no lugar de `available` daí em diante; no complemento com `discoverMixed`, passar `movieParams: { ...movie, ...movieCertificationParams(maxRating) }` e filtrar o resultado com `filterByRating(…, maxRating)`.

- [ ] **Step 4: Início com a faixa de quem está vendo**

Em `components/HomeView.jsx`:
- assinatura `export async function HomeView({ heading, type, showMoods = true, viewer })`;
- `const maxRating = viewer?.maxRating ?? null;`
- `getHomeRowDefs(myProviders, type, { maxRating })`, `<HeroSection … maxRating={maxRating} />` com `getHomeHero(myProviders, type, { maxRating })` e `<MoodSection maxRating={maxRating} />` com `getMoodCards({ maxRating })`.

`app/(vitrine)/page.jsx` (substituir todo o conteúdo):

```jsx
import { redirect } from 'next/navigation';
import { HomeView } from '@/components/HomeView';
import { getViewerOrVisitor } from '@/lib/auth/viewer';

export default async function HomePage() {
  const viewer = await getViewerOrVisitor();
  // Logado sem perfil escolhido nesta visita: primeiro "Quem está assistindo?" (ou entra direto, se só houver um).
  if (viewer.user && viewer.needsProfile) redirect('/perfil-unico');
  return <HomeView heading="Início" viewer={viewer} />;
}
```

Em `app/(vitrine)/filmes/page.jsx` e `app/(vitrine)/series/page.jsx`, passar o viewer devolvido por `requireProfile` para o `HomeView`: `const viewer = await requireProfile('/filmes'); return <HomeView heading="Filmes" type="movie" viewer={viewer} />;` (e o equivalente em Séries).

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/catalog.test.js`
Expected: PASS (casos antigos e novos).

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/catalog.js components/HomeView.jsx "app/(vitrine)" tests/unit/catalog.test.js
git commit -m "feat: vitrine do visitante até 14 anos e Início do Kids só com a faixa liberada" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Preferências salvas no perfil

**Files:**
- Modify: `components/settings/SettingsProvider.jsx`, `app/layout.jsx`
- Test: `tests/components/settings-perfil.test.jsx`

**Interfaces:**
- Consumes: `savePrefsAction` (Tarefa 8); `getViewerOrVisitor` (Tarefa 8)
- Produces: `<SettingsProvider initialPrefs?={Prefs} onSave?={(prefs) => Promise} >` — com `initialPrefs`, as preferências vêm do perfil (não do navegador) e cada mudança é gravada com `onSave`, no máximo uma vez a cada `PREFS_SAVE_DEBOUNCE_MS = 500`; o `localStorage` vira só espelho
- Exporta `PREFS_SAVE_DEBOUNCE_MS`

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/settings-perfil.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings, PREFS_SAVE_DEBOUNCE_MS } from '@/components/settings/SettingsProvider';
import { STORAGE_KEY, defaultPrefs } from '@/lib/preferences';

function Probe() {
  const { prefs, updatePrefs } = useSettings();
  return (
    <>
      <p>tema:{prefs.theme} brilho:{prefs.brightness}</p>
      <button onClick={() => updatePrefs({ brightness: 40 })}>40</button>
      <button onClick={() => updatePrefs({ brightness: 30 })}>30</button>
    </>
  );
}

const flush = () => act(async () => {});
afterEach(() => vi.useRealTimers());

describe('preferências do perfil', () => {
  it('usa as preferências do perfil, não as do navegador', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultPrefs(), theme: 'claro' }));
    render(<SettingsProvider initialPrefs={{ ...defaultPrefs(), theme: 'noturno' }} onSave={vi.fn()}><Probe /></SettingsProvider>);
    await flush();
    expect(screen.getByText(/tema:noturno/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe('noturno'); // espelho para o script do <head>
  });

  it('grava no perfil uma vez, agrupando mudanças seguidas', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<SettingsProvider initialPrefs={defaultPrefs()} onSave={onSave}><Probe /></SettingsProvider>);
    await flush();
    expect(onSave).not.toHaveBeenCalled(); // carregar não grava
    await act(async () => { screen.getByText('40').click(); });
    await act(async () => { vi.advanceTimersByTime(PREFS_SAVE_DEBOUNCE_MS - 100); });
    await act(async () => { screen.getByText('30').click(); });
    await act(async () => { vi.advanceTimersByTime(PREFS_SAVE_DEBOUNCE_MS); });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ brightness: 30 });
  });

  it('visitante continua só com o navegador', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultPrefs(), theme: 'claro' }));
    render(<SettingsProvider><Probe /></SettingsProvider>);
    await flush();
    expect(screen.getByText(/tema:claro/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/settings-perfil.test.jsx`
Expected: FAIL (o provedor ainda ignora `initialPrefs` e não exporta `PREFS_SAVE_DEBOUNCE_MS`).

- [ ] **Step 3: Implementar**

Em `components/settings/SettingsProvider.jsx`:

1. Importar `useRef` de `react` e `parsePrefs` de `@/lib/preferences`.
2. Exportar `export const PREFS_SAVE_DEBOUNCE_MS = 500;`.
3. Assinatura: `export function SettingsProvider({ children, initialPrefs, onSave })`.
4. Estado inicial: `useState(() => (initialPrefs ? parsePrefs(initialPrefs) : defaultPrefs()))`.
5. No efeito de carga (o que hoje faz `setPrefs(loadPrefs(safeLocalStorage()))`), carregar do navegador **só quando não houver `initialPrefs`**:

```js
  useEffect(() => {
    if (!initialPrefs) setPrefs(loadPrefs(safeLocalStorage()));
    setSystemDark(systemPrefersDark());
    setLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- carga única
```

(mantendo o bloco `eslint-disable/enable react-hooks/set-state-in-effect` que já existe em volta).

6. Gravação agrupada no perfil, logo depois do efeito que aplica os atributos no `<html>`:

```js
  // Com perfil: grava as mudanças no servidor, agrupando mudanças seguidas (ex.: arrastar o brilho).
  const firstSave = useRef(true);
  useEffect(() => {
    if (!loaded || !onSave) return undefined;
    if (firstSave.current) {
      firstSave.current = false;
      return undefined;
    }
    const timer = setTimeout(() => onSave(prefs), PREFS_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [prefs, loaded, onSave]);
```

O efeito existente que chama `savePrefs(safeLocalStorage(), prefs)` continua, servindo de espelho.

Em `app/layout.jsx`:
- importar `getViewerOrVisitor` de `@/lib/auth/viewer` e `savePrefsAction` de `@/lib/actions/conta`;
- dentro de `RootLayout` (já assíncrono): `const viewer = await getViewerOrVisitor();`
- `<SettingsProvider initialPrefs={viewer.profile?.prefs} onSave={viewer.profile ? savePrefsAction : undefined}>`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/settings-perfil.test.jsx tests/components/base.test.jsx tests/components/settings-panel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/settings/SettingsProvider.jsx app/layout.jsx tests/components/settings-perfil.test.jsx
git commit -m "feat: aparência e acessibilidade salvas em cada perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Cadeado e PIN no Kids (componentes)

**Files:**
- Create: `components/kids/PinDialog.jsx`, `components/kids/LockedPosterCard.jsx`, `components/kids/PinGate.jsx`
- Modify: `components/PosterCard.jsx`, `components/TitlePage.jsx`, `app/filme/[id]/page.jsx`, `app/serie/[id]/page.jsx`
- Test: `tests/components/kids.test.jsx`

**Interfaces:**
- Consumes: `verifyPinAction` (Tarefa 8); `useDialogFocus` (Etapa A); `getTitleRating`, `ratingAllowed`, `annotateRatings` (Tarefa 4); `titleKey` (Tarefa 3)
- Produces:
  - `<PinDialog open title description purpose titleKey? onClose onSuccess />` (janela com campo de PIN; chama `verifyPinAction`)
  - `<LockedPosterCard title fluid? />` (cartaz com 🔒; clique abre o PIN e, liberado, vai para a página do título)
  - `<PinGate title description purpose titleKey? />` (bloco no lugar do conteúdo; liberado, recarrega a página com `router.refresh()`)
  - `PosterCard` com `title.locked === true` renderiza `LockedPosterCard`
  - `TitlePage({ type, id, viewer })` (novo parâmetro `viewer`)

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/kids.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinDialog } from '@/components/kids/PinDialog';
import { PinGate } from '@/components/kids/PinGate';
import { PosterCard } from '@/components/PosterCard';
import { verifyPinAction } from '@/lib/actions/conta';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn() }));

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  verifyPinAction.mockReset();
});

const locked = { id: 7, type: 'movie', title: 'Filme de Terror', year: 2024, posterPath: null, rating: '16', locked: true };

describe('PinDialog', () => {
  it('campo numérico de 4 dígitos; PIN errado mostra a mensagem do servidor', async () => {
    verifyPinAction.mockResolvedValue({ ok: false, message: 'PIN incorreto. Restam 4 tentativas.' });
    const onSuccess = vi.fn();
    render(<PinDialog open title="Este título precisa de um adulto" purpose="titulo" titleKey="movie-7" onClose={() => {}} onSuccess={onSuccess} />);
    const input = screen.getByLabelText('PIN dos pais');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '4');
    await userEvent.type(input, '0000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(verifyPinAction).toHaveBeenCalledWith({ pin: '0000', purpose: 'titulo', titleKey: 'movie-7' });
    expect(await screen.findByRole('alert')).toHaveTextContent('PIN incorreto. Restam 4 tentativas.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('PIN certo chama onSuccess', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    render(<PinDialog open title="Área de adultos" purpose="adulto" onClose={() => {}} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('cartaz bloqueado', () => {
  it('mostra o cadeado, não é link e pede o PIN; liberado, abre o título', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    render(<PosterCard title={locked} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Filme de Terror (2024) — bloqueado para este perfil' });
    await userEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Este título precisa de um adulto' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(push).toHaveBeenCalledWith('/filme/7');
  });

  it('cartaz liberado continua sendo link normal', () => {
    render(<PosterCard title={{ ...locked, locked: false }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/7');
  });
});

describe('PinGate', () => {
  it('no lugar do conteúdo; liberado, recarrega a página', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    render(<PinGate title="Este título precisa de um adulto" description="Peça para um adulto digitar o PIN." purpose="titulo" titleKey="movie-7" />);
    await userEvent.click(screen.getByRole('button', { name: 'Digitar o PIN' }));
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/kids.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`components/kids/PinDialog.jsx`:

```jsx
'use client';

import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X } from 'lucide-react';
import { useDialogFocus } from '@/components/useDialogFocus';
import { verifyPinAction } from '@/lib/actions/conta';

// Janela "Peça para um adulto digitar o PIN". O servidor confere o PIN e conta as tentativas.
export function PinDialog({ open, title, description = 'Peça para um adulto digitar o PIN dos pais.', purpose, titleKey, onClose, onSuccess }) {
  const ref = useRef(null);
  const id = useId();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const guards = useDialogFocus(ref, open, onClose);
  if (!open || typeof document === 'undefined') return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const result = await verifyPinAction({ pin, purpose, titleKey });
    setBusy(false);
    if (result.ok) {
      setPin('');
      setMessage('');
      onSuccess();
    } else {
      setPin('');
      setMessage(result.message);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-desc`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-fg shadow-glow"
      >
        {guards.start}
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-xl font-black">
            <Lock aria-hidden="true" className="h-5 w-5" /> {title}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 hover:bg-surface-2">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p id={`${id}-desc`} className="mt-2 text-sm text-muted">{description}</p>
        <form onSubmit={submit} className="mt-5">
          <label htmlFor={`${id}-pin`} className="block text-sm font-semibold">PIN dos pais</label>
          <input
            id={`${id}-pin`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-describedby={message ? `${id}-erro` : undefined}
            className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-center text-2xl tracking-[0.6em]"
          />
          {message && <p id={`${id}-erro`} role="alert" className="mt-2 text-sm font-semibold text-accent-2">{message}</p>}
          <button
            type="submit"
            disabled={busy || pin.length !== 4}
            className="neon-gradient mt-5 w-full rounded-full px-6 py-3 font-bold text-white shadow-glow disabled:opacity-50"
          >
            Confirmar
          </button>
        </form>
        {guards.end}
      </div>
    </div>,
    document.body,
  );
}
```

`components/kids/LockedPosterCard.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PinDialog } from '@/components/kids/PinDialog';
import { titleHref } from '@/lib/tmdb/normalize';
import { imageSet } from '@/lib/images';

// Cartaz de um título acima da faixa do perfil Kids: o clique pede o PIN em vez de abrir.
export function LockedPosterCard({ title, fluid = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const img = imageSet(title.posterPath, 'poster');
  const label = title.year ? `${title.title} (${title.year})` : title.title;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label} — bloqueado para este perfil`}
        className={`group block text-left ${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}
      >
        <span className="relative block aspect-[2/3] overflow-hidden rounded-lg bg-surface-2">
          {img ? (
            <img src={img.src} srcSet={img.srcSet} sizes="176px" alt="" className="h-full w-full object-cover opacity-40 blur-[2px]" />
          ) : (
            <span aria-hidden="true" className="neon-gradient block h-full opacity-40" />
          )}
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/70 p-3 text-white"><Lock className="h-7 w-7" /></span>
          </span>
        </span>
        <span aria-hidden="true" className="mt-2 line-clamp-1 block text-sm text-muted">{title.title}</span>
      </button>
      <PinDialog
        open={open}
        title="Este título precisa de um adulto"
        purpose="titulo"
        titleKey={`${title.type}-${title.id}`}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.push(titleHref(title));
        }}
      />
    </>
  );
}
```

`components/kids/PinGate.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PinDialog } from '@/components/kids/PinDialog';

// Bloco que ocupa o lugar do conteúdo (título bloqueado ou área de adultos no Kids).
export function PinGate({ title, description, purpose, titleKey }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="rounded-full bg-surface-2 p-5"><Lock aria-hidden="true" className="h-10 w-10 text-accent-2" /></span>
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="text-muted">{description}</p>
      <button onClick={() => setOpen(true)} className="neon-gradient rounded-full px-6 py-3 font-bold text-white shadow-glow">
        Digitar o PIN
      </button>
      <PinDialog
        open={open}
        title={title}
        description={description}
        purpose={purpose}
        titleKey={titleKey}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
```

Em `components/PosterCard.jsx`:
- importar `import { LockedPosterCard } from '@/components/kids/LockedPosterCard';`
- primeira linha da função: `if (title.locked) return <LockedPosterCard title={title} fluid={fluid} />;`

Em `components/TitlePage.jsx`:
- importar `getTitleRating`, `ratingAllowed`, `annotateRatings` de `@/lib/tmdb/ratings` e `PinGate` de `@/components/kids/PinGate`;
- assinatura `export async function TitlePage({ type, id, viewer })`;
- depois de `if (!title) notFound();`:

```jsx
  if (viewer?.kids) {
    const key = `${type}-${id}`;
    const rating = await getTitleRating(type, id).catch(() => null);
    if (!ratingAllowed(rating, viewer.maxRating) && !viewer.unlocked.has(key)) {
      // Bloqueado: nada de sinopse, trailer ou imagem; só o pedido de PIN.
      return (
        <PinGate
          title="Este título precisa de um adulto"
          description={`"${title.title}" está acima da faixa deste perfil. Peça para um adulto digitar o PIN.`}
          purpose="titulo"
          titleKey={key}
        />
      );
    }
    title.recommendations = await annotateRatings(title.recommendations, viewer.maxRating, viewer.unlocked);
  }
```

Em `app/filme/[id]/page.jsx` e `app/serie/[id]/page.jsx`, passar o viewer: `const viewer = await requireProfile(…); return <TitlePage type="movie" id={id} viewer={viewer} />;` (e `type="tv"` na série).

Em `app/explorar/page.jsx` e `app/busca/page.jsx`, depois de obter os resultados da primeira página, quando `viewer.kids`, anotar os cadeados: `results = await annotateRatings(results, viewer.maxRating, viewer.unlocked)` (guardando o viewer devolvido por `requireProfile`).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/kids.test.jsx tests/components/poster-row-mood.test.jsx tests/components/title-page.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/kids components/PosterCard.jsx components/TitlePage.jsx app tests/components/kids.test.jsx
git commit -m "feat: cadeado e PIN dos pais no perfil Kids" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Telas de entrar, criar conta e senha

**Files:**
- Create: `components/auth/AuthShell.jsx`, `components/auth/SignInForm.jsx`, `components/auth/SignUpForm.jsx`, `components/auth/ForgotPasswordForm.jsx`, `components/auth/ResetPasswordForm.jsx`, `lib/auth/messages.js`, `app/entrar/page.jsx`, `app/criar-conta/page.jsx`, `app/esqueci-senha/page.jsx`, `app/redefinir-senha/page.jsx`
- Test: `tests/components/auth-forms.test.jsx`

**Interfaces:**
- Consumes: `authClient` (Tarefa 2); `signInDemoAction`, `createFirstProfileAction` (Tarefa 8); `loadPrefs` (Etapa A); `safeReturnPath` (Tarefa 8); `getViewerOrVisitor` (Tarefa 8); `BrandLogo` (Etapa A)
- Produces:
  - `authErrorMessage(error, context: 'entrar' | 'criar' | 'senha'): string`
  - páginas `/entrar?voltar=`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha?token=` (ou `?error=INVALID_TOKEN`)

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/auth-forms.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { authErrorMessage } from '@/lib/auth/messages';
import { authClient } from '@/lib/auth/client';
import { createFirstProfileAction } from '@/lib/actions/conta';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
vi.mock('@/lib/actions/conta', () => ({ signInDemoAction: vi.fn(), createFirstProfileAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mensagens de erro', () => {
  it('não revela qual dos dois errou, e trata limite e e-mail repetido', () => {
    expect(authErrorMessage({ status: 401 }, 'entrar')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage({ status: 429 }, 'entrar')).toBe('Muitas tentativas. Tente de novo em alguns minutos.');
    expect(authErrorMessage({ status: 422, code: 'USER_ALREADY_EXISTS' }, 'criar')).toBe('Já existe uma conta com este e-mail.');
    expect(authErrorMessage({ status: 500 }, 'criar')).toBe('Não foi possível concluir agora. Tente de novo.');
  });
});

describe('Entrar', () => {
  it('entra e volta para onde a pessoa queria ir', async () => {
    authClient.signIn.email.mockResolvedValue({ data: {}, error: null });
    render(<SignInForm voltar="/filme/1" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: 'ana@ex.com', password: 'senha-forte-1' });
    expect(push).toHaveBeenCalledWith('/filme/1');
  });

  it('erro aparece ligado ao formulário', async () => {
    authClient.signIn.email.mockResolvedValue({ data: null, error: { status: 401 } });
    render(<SignInForm voltar="/" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada-123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(push).not.toHaveBeenCalled();
  });

  it('tem a conta de demonstração com o PIN de teste e os links', () => {
    render(<SignInForm voltar="/" />);
    expect(screen.getByRole('button', { name: 'Experimentar sem cadastro' })).toBeInTheDocument();
    expect(screen.getByText('Conta de demonstração · PIN de teste: 1234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/criar-conta');
  });
});

describe('Criar conta', () => {
  it('confere a confirmação da senha antes de enviar', async () => {
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), 'senha-forte-2');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não são iguais.');
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it('cria a conta e o primeiro perfil com as preferências do navegador', async () => {
    authClient.signUp.email.mockResolvedValue({ data: {}, error: null });
    localStorage.setItem('catalogo:prefs', JSON.stringify({ version: 1, theme: 'claro' }));
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ex.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-1');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), 'senha-forte-1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(authClient.signUp.email).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@ex.com', password: 'senha-forte-1' });
    expect(createFirstProfileAction).toHaveBeenCalledWith(expect.objectContaining({ theme: 'claro' }));
  });
});

describe('Senha', () => {
  it('pedido de redefinição sempre mostra a mesma mensagem', async () => {
    authClient.requestPasswordReset.mockResolvedValue({ data: {}, error: null });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'qualquer@ex.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(authClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'qualquer@ex.com', redirectTo: '/redefinir-senha' });
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta com este e-mail, enviamos um link.');
  });

  it('link vencido mostra a mensagem e o caminho para pedir outro', () => {
    render(<ResetPasswordForm token={null} error="INVALID_TOKEN" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Este link expirou.');
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
  });

  it('cria a nova senha com o token', async () => {
    authClient.resetPassword.mockResolvedValue({ data: {}, error: null });
    render(<ResetPasswordForm token="abc" />);
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'nova-senha-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(authClient.resetPassword).toHaveBeenCalledWith({ newPassword: 'nova-senha-123', token: 'abc' });
    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/auth-forms.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`lib/auth/messages.js`:

```js
// Mensagens que não revelam se um e-mail tem conta.
export function authErrorMessage(error, context) {
  if (!error) return '';
  if (error.status === 429) return 'Muitas tentativas. Tente de novo em alguns minutos.';
  if (context === 'entrar' && (error.status === 401 || error.status === 403)) return 'E-mail ou senha incorretos.';
  if (context === 'criar' && (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error.status === 422)) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (context === 'senha' && error.code === 'INVALID_TOKEN') return 'Este link expirou.';
  return 'Não foi possível concluir agora. Tente de novo.';
}
```

`components/auth/AuthShell.jsx`:

```jsx
import { BrandLogo } from '@/components/BrandLogo';

// Moldura das telas de conta: logo, título e o cartão do formulário.
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-glow">
        <BrandLogo className="mb-6" />
        <h1 className="text-2xl font-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export const inputClass = 'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 text-fg';
export const buttonClass = 'neon-gradient w-full rounded-full px-6 py-3 font-bold text-white shadow-glow disabled:opacity-50';

export function Field({ id, label, ...props }) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}
      <input id={id} className={inputClass} {...props} />
    </label>
  );
}
```

`components/auth/SignInForm.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { signInDemoAction } from '@/lib/actions/conta';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function SignInForm({ voltar = '/' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err, 'entrar'));
      return;
    }
    router.push(voltar);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4" aria-describedby={error ? 'entrar-erro' : undefined}>
        <Field id="entrar-email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="entrar-senha" label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p id="entrar-erro" role="alert" className="text-sm font-semibold text-accent-2">{error}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>Entrar</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/esqueci-senha" className="text-accent hover:underline">Esqueci minha senha</Link>
        <Link href="/criar-conta" className="text-accent hover:underline">Criar conta</Link>
      </div>
      <form action={signInDemoAction} className="mt-8 border-t border-line pt-6 text-center">
        <button type="submit" className="w-full rounded-full border border-line px-6 py-3 font-bold hover:bg-surface-2">
          Experimentar sem cadastro
        </button>
        <p className="mt-2 text-xs text-muted">Conta de demonstração · PIN de teste: 1234</p>
      </form>
    </>
  );
}
```

`components/auth/SignUpForm.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { createFirstProfileAction } from '@/lib/actions/conta';
import { loadPrefs } from '@/lib/preferences';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function SignUpForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    setBusy(true);
    const { error: err } = await authClient.signUp.email({ name: form.name.trim(), email: form.email, password: form.password });
    if (err) {
      setBusy(false);
      setError(authErrorMessage(err, 'criar'));
      return;
    }
    // Primeiro perfil com o nome da pessoa e o que ela já tinha escolhido no navegador.
    let prefs;
    try {
      prefs = loadPrefs(window.localStorage);
    } catch {
      prefs = undefined;
    }
    await createFirstProfileAction(prefs);
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Field id="criar-nome" label="Nome" autoComplete="name" required maxLength={40} value={form.name} onChange={set('name')} />
        <Field id="criar-email" label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field id="criar-senha" label="Senha" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={set('password')} />
        <Field id="criar-confirma" label="Confirme a senha" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        <p className="text-xs text-muted">Use pelo menos 8 caracteres.</p>
        {error && <p role="alert" className="text-sm font-semibold text-accent-2">{error}{error.startsWith('Já existe') && <> <Link href="/esqueci-senha" className="underline">Esqueci minha senha</Link></>}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>Criar conta</button>
      </form>
      <p className="mt-4 text-center text-sm">Já tem conta? <Link href="/entrar" className="text-accent hover:underline">Entrar</Link></p>
    </>
  );
}
```

`components/auth/ForgotPasswordForm.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | enviado | erro

  async function submit(e) {
    e.preventDefault();
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' });
      setState(error && error.status >= 500 ? 'erro' : 'enviado');
    } catch {
      setState('erro');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="esqueci-email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {state === 'enviado' && <p role="status" className="text-sm font-semibold">Se houver uma conta com este e-mail, enviamos um link.</p>}
      {state === 'erro' && <p role="alert" className="text-sm font-semibold text-accent-2">Não foi possível enviar o e-mail agora. Tente de novo.</p>}
      <button type="submit" className={buttonClass}>Enviar link</button>
    </form>
  );
}
```

`components/auth/ResetPasswordForm.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function ResetPasswordForm({ token, error: initialError }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(initialError || !token ? 'Este link expirou.' : '');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    if (err) setError(authErrorMessage({ ...err, code: err.code ?? 'INVALID_TOKEN' }, 'senha'));
    else setDone(true);
  }

  if (done) {
    return <p role="status" className="font-semibold">Senha alterada. <Link href="/entrar" className="text-accent underline">Entrar</Link></p>;
  }
  if (error === 'Este link expirou.') {
    return (
      <div role="alert" className="space-y-3">
        <p className="font-semibold">Este link expirou.</p>
        <Link href="/esqueci-senha" className="text-accent underline">Pedir outro link</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="nova-senha" label="Nova senha" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field id="nova-confirma" label="Confirme a nova senha" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p role="alert" className="text-sm font-semibold text-accent-2">{error}</p>}
      <button type="submit" className={buttonClass}>Salvar nova senha</button>
    </form>
  );
}
```

`app/entrar/page.jsx`:

```jsx
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { getViewerOrVisitor } from '@/lib/auth/viewer';
import { safeReturnPath } from '@/lib/account-rules';

export const metadata = { title: 'Entrar' };

export default async function SignInPage({ searchParams }) {
  const { voltar } = await searchParams;
  const back = safeReturnPath(Array.isArray(voltar) ? voltar[0] : voltar);
  if ((await getViewerOrVisitor()).user) redirect(back);
  const subtitle = voltar ? 'Entre ou crie sua conta para continuar.' : 'Que bom ter você de volta.';
  return (
    <AuthShell title="Entrar" subtitle={subtitle}>
      <SignInForm voltar={back} />
    </AuthShell>
  );
}
```

`app/criar-conta/page.jsx`:

```jsx
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getViewerOrVisitor } from '@/lib/auth/viewer';

export const metadata = { title: 'Criar conta' };

export default async function SignUpPage() {
  if ((await getViewerOrVisitor()).user) redirect('/');
  return (
    <AuthShell title="Criar conta" subtitle="Uma conta para a família toda, com até 5 perfis.">
      <SignUpForm />
    </AuthShell>
  );
}
```

`app/esqueci-senha/page.jsx`:

```jsx
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Esqueci minha senha' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueci minha senha" subtitle="Enviamos um link para você criar uma senha nova.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
```

`app/redefinir-senha/page.jsx`:

```jsx
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = { title: 'Redefinir senha' };

export default async function ResetPasswordPage({ searchParams }) {
  const { token, error } = await searchParams;
  return (
    <AuthShell title="Criar uma nova senha">
      <ResetPasswordForm token={token ?? null} error={error ?? null} />
    </AuthShell>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/auth-forms.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth lib/auth/messages.js app/entrar app/criar-conta app/esqueci-senha app/redefinir-senha tests/components/auth-forms.test.jsx
git commit -m "feat: telas de entrar, criar conta e redefinir senha, com conta de demonstração" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: "Quem está assistindo?" e Gerenciar perfis

**Files:**
- Create: `components/profiles/ProfileAvatar.jsx`, `components/profiles/ProfilePicker.jsx`, `components/profiles/ProfileManager.jsx`, `components/profiles/ProfileForm.jsx`, `components/profiles/PinSetupForm.jsx`, `app/perfis/page.jsx`, `app/perfis/gerenciar/page.jsx`
- Test: `tests/components/profiles.test.jsx`

**Interfaces:**
- Consumes: ações da Tarefa 8 (`chooseProfileAction`, `createProfileAction`, `updateProfileAction`, `deleteProfileAction`, `setPinAction`); `PinGate` (Tarefa 11); `MAX_PROFILES`, `PROFILE_COLORS` (Tarefa 5); `adultAreaAllowed` (Tarefa 8); `requireUser` (Tarefa 8); `playOpeningSound` (Etapa A); `parsePrefs`, `shouldPlayOpeningSound`, `resolveTheme` (Etapa A)
- Produces:
  - `<ProfileAvatar profile size? />` (inicial sobre a cor do perfil; selo "Kids")
  - `<ProfilePicker profiles voltar />`
  - `<ProfileManager profiles hasPin isDemo />`
  - `<ProfileForm profile? onDone hasPin onNeedsPin />` e `<PinSetupForm needsPassword onDone />`

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/profiles.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { ProfileManager } from '@/components/profiles/ProfileManager';
import { chooseProfileAction, createProfileAction, deleteProfileAction } from '@/lib/actions/conta';
import { playOpeningSound } from '@/lib/opening-sound';
import { defaultPrefs } from '@/lib/preferences';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/opening-sound', () => ({ playOpeningSound: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({
  chooseProfileAction: vi.fn(),
  createProfileAction: vi.fn(),
  updateProfileAction: vi.fn(),
  deleteProfileAction: vi.fn(),
  setPinAction: vi.fn(),
}));

const p = (id, name, extra = {}) => ({ id, name, color: '#8b5cf6', kind: 'adulto', maxRating: null, prefs: defaultPrefs(), ...extra });

beforeEach(() => vi.clearAllMocks());

describe('Quem está assistindo?', () => {
  it('escolher um perfil toca o som de abertura e entra', async () => {
    render(<ProfilePicker profiles={[p('p1', 'Ana'), p('p2', 'Pequeno', { kind: 'kids', maxRating: '10' })]} voltar="/explorar" />);
    expect(screen.getByRole('heading', { name: 'Quem está assistindo?' })).toBeInTheDocument();
    expect(screen.getByText('Kids')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ana' }));
    expect(playOpeningSound).toHaveBeenCalled();
    expect(chooseProfileAction).toHaveBeenCalledWith('p1', '/explorar');
  });

  it('sem som no Modo calmo ou com o som desligado no perfil escolhido', async () => {
    render(<ProfilePicker profiles={[p('p1', 'Calma', { prefs: { ...defaultPrefs(), calm: true } }), p('p2', 'Mudo', { prefs: { ...defaultPrefs(), openingSound: false } })]} voltar="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Calma' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mudo' }));
    expect(playOpeningSound).not.toHaveBeenCalled();
  });

  it('tem o atalho para gerenciar perfis', () => {
    render(<ProfilePicker profiles={[p('p1', 'Ana')]} voltar="/" />);
    expect(screen.getByRole('link', { name: 'Gerenciar perfis' })).toHaveAttribute('href', '/perfis/gerenciar');
  });
});

describe('Gerenciar perfis', () => {
  it('com 5 perfis, some o botão de adicionar e aparece o aviso', () => {
    const five = ['A', 'B', 'C', 'D', 'E'].map((n, i) => p(`p${i}`, n));
    render(<ProfileManager profiles={five} hasPin isDemo={false} />);
    expect(screen.queryByRole('button', { name: 'Adicionar perfil' })).not.toBeInTheDocument();
    expect(screen.getByText('Limite de 5 perfis.')).toBeInTheDocument();
  });

  it('o único perfil não pode ser excluído', () => {
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin={false} isDemo={false} />);
    expect(screen.getByRole('button', { name: 'Excluir Ana' })).toBeDisabled();
    expect(screen.getByText('A conta precisa de pelo menos um perfil.')).toBeInTheDocument();
  });

  it('criar Kids sem PIN pede para criar o PIN antes', async () => {
    createProfileAction.mockResolvedValue({ ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true });
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin={false} isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    const form = screen.getByRole('form', { name: 'Novo perfil' });
    await userEvent.type(within(form).getByLabelText('Nome'), 'Pequeno');
    await userEvent.click(within(form).getByRole('radio', { name: 'Kids' }));
    await userEvent.selectOptions(within(form).getByLabelText('Classificação máxima'), '10');
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('form', { name: 'Criar o PIN dos pais' })).toBeInTheDocument();
  });

  it('a faixa só aparece para perfis Kids', async () => {
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    expect(screen.queryByLabelText('Classificação máxima')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Kids' }));
    expect(screen.getByLabelText('Classificação máxima')).toBeInTheDocument();
  });

  it('excluir pede confirmação', async () => {
    deleteProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileManager profiles={[p('p1', 'Ana'), p('p2', 'Bia')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Bia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir Bia' }));
    expect(deleteProfileAction).toHaveBeenCalledWith('p2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/profiles.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`components/profiles/ProfileAvatar.jsx`:

```jsx
// Avatar provisório (até a Etapa D): a inicial do nome sobre a cor do perfil.
export function ProfileAvatar({ profile, size = 'lg' }) {
  const box = size === 'lg' ? 'h-28 w-28 text-5xl sm:h-36 sm:w-36' : 'h-9 w-9 text-base';
  return (
    <span className="relative inline-block">
      <span aria-hidden="true" className={`flex items-center justify-center rounded-2xl font-black text-white ${box}`} style={{ background: profile.color }}>
        {profile.name.trim().charAt(0).toUpperCase()}
      </span>
      {profile.kind === 'kids' && size === 'lg' && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#1e1433]">Kids</span>
      )}
    </span>
  );
}
```

`components/profiles/ProfilePicker.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { chooseProfileAction } from '@/lib/actions/conta';
import { playOpeningSound } from '@/lib/opening-sound';
import { parsePrefs, resolveTheme, shouldPlayOpeningSound } from '@/lib/preferences';

const systemDark = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true);

export function ProfilePicker({ profiles, voltar = '/' }) {
  const [error, setError] = useState('');

  async function choose(profile) {
    // O clique é o momento em que o navegador deixa tocar som: aqui entra o som de abertura.
    const prefs = parsePrefs(profile.prefs);
    if (shouldPlayOpeningSound(prefs, resolveTheme(prefs, systemDark()))) playOpeningSound();
    const result = await chooseProfileAction(profile.id, voltar);
    if (result && !result.ok) setError(result.error === 'pin' ? 'Peça para um adulto digitar o PIN.' : result.error);
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-black sm:text-5xl">Quem está assistindo?</h1>
      <ul className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-10">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <button onClick={() => choose(profile)} className="group flex flex-col items-center gap-3 rounded-2xl p-2 focus-visible:outline-3">
              <span className="transition group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(236,72,153,.6)] calm:group-hover:scale-100">
                <ProfileAvatar profile={profile} />
              </span>
              <span className="text-lg font-semibold text-muted group-hover:text-fg">{profile.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-6 font-semibold text-accent-2">{error}</p>}
      <Link href="/perfis/gerenciar" className="mt-12 rounded-full border border-line px-6 py-2 font-semibold text-muted hover:text-fg">
        Gerenciar perfis
      </Link>
    </div>
  );
}
```

`components/profiles/PinSetupForm.jsx`:

```jsx
'use client';

import { useActionState, useEffect } from 'react';
import { setPinAction } from '@/lib/actions/conta';
import { Field, buttonClass } from '@/components/auth/AuthShell';

// Criar (ou trocar) o PIN dos pais. Trocar um PIN existente pede a senha da conta.
export function PinSetupForm({ needsPassword = false, onDone }) {
  const [state, action, pending] = useActionState(setPinAction, null);
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  const digits = { type: 'password', inputMode: 'numeric', maxLength: 4, pattern: '\\d{4}', required: true, autoComplete: 'off' };
  return (
    <form action={action} aria-label={needsPassword ? 'Trocar o PIN dos pais' : 'Criar o PIN dos pais'} className="space-y-4 rounded-xl border border-line p-4">
      <p className="text-sm text-muted">O PIN dos pais tem 4 números. Ele libera títulos bloqueados e permite sair do perfil Kids.</p>
      <Field id="pin-novo" name="pin" label="Novo PIN" {...digits} />
      <Field id="pin-confirma" name="confirm" label="Repita o PIN" {...digits} />
      {needsPassword && <Field id="pin-senha" name="password" label="Senha da conta" type="password" required autoComplete="current-password" />}
      {state && !state.ok && <p role="alert" className="text-sm font-semibold text-accent-2">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-semibold">PIN salvo.</p>}
      <button type="submit" disabled={pending} className={buttonClass}>Salvar PIN</button>
    </form>
  );
}
```

`components/profiles/ProfileForm.jsx`:

```jsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { createProfileAction, updateProfileAction } from '@/lib/actions/conta';
import { PROFILE_COLORS } from '@/lib/profiles';
import { Field, buttonClass, inputClass } from '@/components/auth/AuthShell';

const RATINGS = [['L', 'Livre'], ['10', '10 anos'], ['12', '12 anos'], ['14', '14 anos']];

// Criar ou editar um perfil: nome, cor, tipo (adulto ou Kids) e, no Kids, a classificação máxima.
export function ProfileForm({ profile, onDone, onNeedsPin }) {
  const [state, action, pending] = useActionState(profile ? updateProfileAction : createProfileAction, null);
  const [kind, setKind] = useState(profile?.kind ?? 'adulto');
  useEffect(() => {
    if (state?.ok) onDone?.();
    if (state?.needsPin) onNeedsPin?.();
  }, [state, onDone, onNeedsPin]);
  const errors = state?.errors ?? {};
  return (
    <form action={action} aria-label={profile ? `Editar ${profile.name}` : 'Novo perfil'} className="space-y-4 rounded-xl border border-line p-4">
      {profile && <input type="hidden" name="id" value={profile.id} />}
      <Field id={`nome-${profile?.id ?? 'novo'}`} name="name" label="Nome" maxLength={20} required defaultValue={profile?.name ?? ''} />
      {errors.name && <p role="alert" className="text-sm text-accent-2">{errors.name}</p>}
      <fieldset>
        <legend className="text-sm font-semibold">Cor</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROFILE_COLORS.map((color, i) => (
            <label key={color} className="cursor-pointer rounded-full p-0.5 has-checked:ring-3 has-checked:ring-accent-2">
              <input type="radio" name="color" value={color} defaultChecked={(profile?.color ?? PROFILE_COLORS[0]) === color} className="sr-only" aria-label={`Cor ${i + 1}`} />
              <span aria-hidden="true" className="block h-8 w-8 rounded-full" style={{ background: color }} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Tipo de perfil</legend>
        <div className="mt-2 flex gap-4">
          {[['adulto', 'Adulto'], ['kids', 'Kids']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="h-5 w-5 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === 'kids' && (
        <label htmlFor={`faixa-${profile?.id ?? 'novo'}`} className="block text-sm font-semibold">
          Classificação máxima
          <select id={`faixa-${profile?.id ?? 'novo'}`} name="maxRating" defaultValue={profile?.maxRating ?? '10'} className={inputClass}>
            {RATINGS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      )}
      {errors.form && <p role="alert" className="text-sm font-semibold text-accent-2">{errors.form}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>Salvar</button>
    </form>
  );
}
```

`components/profiles/ProfileManager.jsx`:

```jsx
'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { ProfileForm } from '@/components/profiles/ProfileForm';
import { PinSetupForm } from '@/components/profiles/PinSetupForm';
import { deleteProfileAction } from '@/lib/actions/conta';
import { MAX_PROFILES } from '@/lib/profiles';

export function ProfileManager({ profiles, hasPin }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // 'novo' | id do perfil
  const [confirming, setConfirming] = useState(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [error, setError] = useState('');
  const done = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);
  const askPin = useCallback(() => setNeedsPin(true), []);
  const onlyOne = profiles.length <= 1;

  async function remove(profile) {
    const result = await deleteProfileAction(profile.id);
    setConfirming(null);
    if (result.ok) router.refresh();
    else setError(result.error);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Gerenciar perfis</h1>
        <Link href="/perfis" className="font-semibold text-accent hover:underline">Pronto</Link>
      </div>
      {error && <p role="alert" className="mt-4 font-semibold text-accent-2">{error}</p>}
      <ul className="mt-8 space-y-4">
        {profiles.map((profile) => (
          <li key={profile.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-4">
              <ProfileAvatar profile={profile} size="sm" />
              <span className="flex-1 font-semibold">
                {profile.name}
                {profile.kind === 'kids' && <span className="ml-2 text-sm text-muted">Kids · até {profile.maxRating === 'L' ? 'Livre' : `${profile.maxRating} anos`}</span>}
              </span>
              <button onClick={() => setEditing(profile.id)} className="rounded-full border border-line px-4 py-1.5 text-sm">Editar</button>
              <button
                onClick={() => setConfirming(profile.id)}
                disabled={onlyOne}
                aria-label={`Excluir ${profile.name}`}
                className="rounded-full border border-line px-4 py-1.5 text-sm disabled:opacity-40"
              >
                Excluir
              </button>
            </div>
            {confirming === profile.id && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span>Excluir {profile.name}? Não dá para desfazer.</span>
                <button onClick={() => remove(profile)} className="rounded-full bg-red-600 px-4 py-1.5 font-bold text-white">Sim, excluir {profile.name}</button>
                <button onClick={() => setConfirming(null)} className="underline">Cancelar</button>
              </div>
            )}
            {editing === profile.id && <div className="mt-4"><ProfileForm profile={profile} onDone={done} onNeedsPin={askPin} /></div>}
          </li>
        ))}
      </ul>
      {onlyOne && <p className="mt-3 text-sm text-muted">A conta precisa de pelo menos um perfil.</p>}
      {profiles.length >= MAX_PROFILES ? (
        <p className="mt-6 text-sm text-muted">Limite de 5 perfis.</p>
      ) : editing === 'novo' ? (
        <div className="mt-6"><ProfileForm onDone={done} onNeedsPin={askPin} /></div>
      ) : (
        <button onClick={() => setEditing('novo')} className="neon-gradient mt-6 rounded-full px-6 py-3 font-bold text-white shadow-glow">
          Adicionar perfil
        </button>
      )}
      {needsPin && !hasPin && (
        <div className="mt-6"><PinSetupForm onDone={() => { setNeedsPin(false); router.refresh(); }} /></div>
      )}
    </div>
  );
}
```

`app/perfis/page.jsx`:

```jsx
import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed, safeReturnPath } from '@/lib/account-rules';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Quem está assistindo?' };

export default async function ProfilesPage({ searchParams }) {
  const viewer = await requireUser('/perfis');
  const { voltar } = await searchParams;
  // No Kids, trocar de perfil pede o PIN.
  if (viewer.profile && !adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para trocar de perfil, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <ProfilePicker profiles={viewer.profiles} voltar={safeReturnPath(Array.isArray(voltar) ? voltar[0] : voltar)} />;
}
```

`app/perfis/gerenciar/page.jsx`:

```jsx
import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getDb } from '@/lib/db';
import { hasPin } from '@/lib/pin';
import { ProfileManager } from '@/components/profiles/ProfileManager';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Gerenciar perfis' };

export default async function ManageProfilesPage() {
  const viewer = await requireUser('/perfis/gerenciar');
  if (viewer.profile && !adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para gerenciar os perfis, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <ProfileManager profiles={viewer.profiles} hasPin={await hasPin(getDb(), viewer.user.id)} />;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/profiles.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profiles app/perfis tests/components/profiles.test.jsx
git commit -m "feat: Quem está assistindo? (com som de abertura) e Gerenciar perfis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Topo com Entrar ou menu do perfil

**Files:**
- Create: `components/UserMenu.jsx`
- Modify: `components/Header.jsx`, `components/SearchBox.jsx`, `app/layout.jsx`
- Test: `tests/components/user-menu.test.jsx`

**Interfaces:**
- Consumes: `ProfileAvatar` (Tarefa 13); `PinDialog` (Tarefa 11); `signOutAction` (Tarefa 8); `getViewerOrVisitor` (Tarefa 8)
- Produces:
  - `Header({ genres, account })` com `account = { signedIn: boolean, profile: { name, color, kind } | null }`
  - `<UserMenu profile kids />`
  - `SearchBox({ genres, signedIn = true })` — visitante vê um link "Entre para buscar"

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/user-menu.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Header } from '@/components/Header';
import { verifyPinAction, signOutAction } from '@/lib/actions/conta';

const push = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/explorar', useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/actions/conta', () => ({ verifyPinAction: vi.fn(), signOutAction: vi.fn() }));

const adult = { signedIn: true, profile: { name: 'Ana', color: '#8b5cf6', kind: 'adulto' } };
const kids = { signedIn: true, profile: { name: 'Pequeno', color: '#ec4899', kind: 'kids' } };

beforeEach(() => vi.clearAllMocks());

describe('topo', () => {
  it('visitante vê Entrar e a busca pede login', () => {
    renderWithSettings(<Header account={{ signedIn: false, profile: null }} />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Entre para buscar' })).toHaveAttribute('href', '/entrar?voltar=%2Fbusca');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('adulto abre o menu do perfil com os quatro itens', async () => {
    renderWithSettings(<Header account={adult} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu do perfil Ana' }));
    expect(screen.getByRole('link', { name: 'Trocar perfil' })).toHaveAttribute('href', '/perfis');
    expect(screen.getByRole('link', { name: 'Gerenciar perfis' })).toHaveAttribute('href', '/perfis/gerenciar');
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/conta');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(signOutAction).toHaveBeenCalled();
  });

  it('no Kids, cada item do menu pede o PIN antes', async () => {
    verifyPinAction.mockResolvedValue({ ok: true });
    renderWithSettings(<Header account={kids} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu do perfil Pequeno' }));
    expect(screen.queryByRole('link', { name: 'Trocar perfil' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Trocar perfil' }));
    expect(screen.getByRole('dialog', { name: 'Área de adultos' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('PIN dos pais'), '1234{Enter}');
    expect(verifyPinAction).toHaveBeenCalledWith({ pin: '1234', purpose: 'adulto', titleKey: undefined });
    expect(push).toHaveBeenCalledWith('/perfis');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/user-menu.test.jsx`
Expected: FAIL (o topo ainda não recebe `account`).

- [ ] **Step 3: Implementar**

`components/UserMenu.jsx`:

```jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { PinDialog } from '@/components/kids/PinDialog';
import { signOutAction } from '@/lib/actions/conta';

const ITEMS = [
  { href: '/perfis', label: 'Trocar perfil' },
  { href: '/perfis/gerenciar', label: 'Gerenciar perfis' },
  { href: '/conta', label: 'Minha conta' },
];
const itemClass = 'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2';

// Menu do avatar. No Kids, todos os itens pedem o PIN dos pais antes.
export function UserMenu({ profile, kids }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // item que espera o PIN
  const wrapper = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(item) {
    setOpen(false);
    if (item === 'sair') await signOutAction();
    else router.push(item.href);
  }

  return (
    <div ref={wrapper} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Menu do perfil ${profile.name}`} className="rounded-xl p-0.5 hover:ring-2 hover:ring-accent-2">
        <ProfileAvatar profile={profile} size="sm" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-glow">
          <p className="px-3 py-2 text-sm font-bold">{profile.name}</p>
          {ITEMS.map((item) => (kids ? (
            <button key={item.href} className={itemClass} onClick={() => setPending(item)}>{item.label}</button>
          ) : (
            <Link key={item.href} href={item.href} className={itemClass} onClick={() => setOpen(false)}>{item.label}</Link>
          )))}
          <button className={itemClass} onClick={() => (kids ? setPending('sair') : run('sair'))}>Sair</button>
        </div>
      )}
      <PinDialog
        open={Boolean(pending)}
        title="Área de adultos"
        description="Peça para um adulto digitar o PIN dos pais."
        purpose="adulto"
        onClose={() => setPending(null)}
        onSuccess={() => {
          const item = pending;
          setPending(null);
          run(item);
        }}
      />
    </div>
  );
}
```

Em `components/Header.jsx`:
- importar `UserMenu`;
- assinatura `export function Header({ genres, account = { signedIn: false, profile: null } })`;
- passar `signedIn={account.signedIn}` para o `<SearchBox … />`;
- dentro de `<div data-slot="header-actions" …>`, depois do botão de Configurações, acrescentar:

```jsx
          {account.signedIn && account.profile ? (
            <UserMenu profile={account.profile} kids={account.profile.kind === 'kids'} />
          ) : (
            !account.signedIn && (
              <Link href="/entrar" className="neon-gradient rounded-full px-5 py-2 text-sm font-bold text-white shadow-glow">
                Entrar
              </Link>
            )
          )}
```

Em `components/SearchBox.jsx`:
- assinatura `export function SearchBox({ genres, signedIn = true })`;
- antes do `return` principal (depois de todos os hooks), para visitantes:

```jsx
  if (!signedIn) {
    return (
      <Link
        href="/entrar?voltar=%2Fbusca"
        className="order-last flex w-full items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-fg sm:order-none sm:w-72"
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        Entre para buscar
      </Link>
    );
  }
```

Em `app/layout.jsx`, montar o resumo da conta a partir do viewer já carregado na Tarefa 10 e passar ao topo:

```jsx
  const account = {
    signedIn: Boolean(viewer.user),
    profile: viewer.profile ? { name: viewer.profile.name, color: viewer.profile.color, kind: viewer.profile.kind } : null,
  };
```

e `<Header genres={genres} account={account} />`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/user-menu.test.jsx tests/components/header-nav.test.jsx tests/components/base.test.jsx tests/components/search-box.test.jsx`
Expected: PASS (os testes antigos do topo continuam passando: o padrão `account` é visitante e a busca recebe `signedIn` verdadeiro por padrão quando usada sozinha).

- [ ] **Step 5: Commit**

```bash
git add components/UserMenu.jsx components/Header.jsx components/SearchBox.jsx app/layout.jsx tests/components/user-menu.test.jsx
git commit -m "feat: topo com Entrar (visitante) ou menu do perfil (com PIN no Kids)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Minha conta

**Files:**
- Create: `components/account/AccountSettings.jsx`, `app/conta/page.jsx`
- Test: `tests/components/account.test.jsx`

**Interfaces:**
- Consumes: `changePasswordAction`, `deleteAccountAction` (Tarefa 8); `PinSetupForm` (Tarefa 13); `PinGate` (Tarefa 11); `requireUser`, `adultAreaAllowed` (Tarefa 8); `hasPin` (Tarefa 6)
- Produces: `<AccountSettings email isDemo hasPin />`

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/account.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from '@/components/account/AccountSettings';
import { changePasswordAction } from '@/lib/actions/conta';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/actions/conta', () => ({
  changePasswordAction: vi.fn(),
  deleteAccountAction: vi.fn(),
  setPinAction: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('Minha conta', () => {
  it('mostra o e-mail e as três seções', () => {
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin />);
    expect(screen.getByText('ana@ex.com')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Trocar senha' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Trocar o PIN dos pais' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Excluir conta' })).toBeInTheDocument();
  });

  it('trocar senha mostra o resultado do servidor', async () => {
    changePasswordAction.mockResolvedValue({ ok: false, error: 'Senha atual incorreta.' });
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin />);
    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada-123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'nova-senha-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument();
  });

  it('sem PIN, a seção do PIN é de criação (sem pedir senha)', () => {
    render(<AccountSettings email="ana@ex.com" isDemo={false} hasPin={false} />);
    expect(screen.getByRole('form', { name: 'Criar o PIN dos pais' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha da conta')).not.toBeInTheDocument();
  });

  it('na demonstração, tudo desabilitado com aviso', () => {
    render(<AccountSettings email="demo@paidegua.app" isDemo hasPin />);
    expect(screen.getAllByText('Indisponível na conta de demonstração.')).toHaveLength(1);
    expect(screen.queryByRole('form', { name: 'Trocar senha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Excluir conta' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/account.test.jsx`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`components/account/AccountSettings.jsx`:

```jsx
'use client';

import { useActionState } from 'react';
import { changePasswordAction, deleteAccountAction } from '@/lib/actions/conta';
import { PinSetupForm } from '@/components/profiles/PinSetupForm';
import { Field, buttonClass } from '@/components/auth/AuthShell';

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Result({ state, success }) {
  if (!state) return null;
  return state.ok
    ? <p role="status" className="text-sm font-semibold">{success}</p>
    : <p role="alert" className="text-sm font-semibold text-accent-2">{state.error}</p>;
}

export function AccountSettings({ email, isDemo, hasPin }) {
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, null);
  const [delState, delAction, delPending] = useActionState(deleteAccountAction, null);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-black">Minha conta</h1>
      <p className="text-muted">Conta: <span className="font-semibold text-fg">{email}</span></p>
      {isDemo ? (
        <p className="rounded-xl border border-line p-4 text-sm">Indisponível na conta de demonstração.</p>
      ) : (
        <>
          <Section title="Trocar senha">
            <form action={pwAction} aria-label="Trocar senha" className="space-y-4">
              <Field id="conta-atual" name="current" label="Senha atual" type="password" required autoComplete="current-password" />
              <Field id="conta-nova" name="next" label="Nova senha" type="password" required minLength={8} autoComplete="new-password" />
              <Field id="conta-confirma" name="confirm" label="Confirme a nova senha" type="password" required autoComplete="new-password" />
              <Result state={pwState} success="Senha alterada. As outras sessões foram encerradas." />
              <button type="submit" disabled={pwPending} className={buttonClass}>Salvar nova senha</button>
            </form>
          </Section>
          <Section title="PIN dos pais">
            <PinSetupForm needsPassword={hasPin} />
          </Section>
          <Section title="Excluir conta">
            <form action={delAction} aria-label="Excluir conta" className="space-y-4">
              <p className="text-sm text-muted">Apaga a conta, todos os perfis e o PIN. Não dá para desfazer.</p>
              <Field id="excluir-senha" name="password" label="Senha da conta" type="password" required autoComplete="current-password" />
              <Field id="excluir-confirma" name="confirm" label='Digite "EXCLUIR" para confirmar' required />
              <Result state={delState} success="" />
              <button type="submit" disabled={delPending} className="w-full rounded-full bg-red-600 px-6 py-3 font-bold text-white disabled:opacity-50">
                Excluir minha conta
              </button>
            </form>
          </Section>
        </>
      )}
    </div>
  );
}
```

`app/conta/page.jsx`:

```jsx
import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getDb } from '@/lib/db';
import { hasPin } from '@/lib/pin';
import { AccountSettings } from '@/components/account/AccountSettings';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Minha conta' };

export default async function AccountPage() {
  const viewer = await requireUser('/conta');
  if (viewer.profile && !adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para abrir Minha conta, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <AccountSettings email={viewer.user.email} isDemo={viewer.isDemo} hasPin={await hasPin(getDb(), viewer.user.id)} />;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/account.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/account app/conta tests/components/account.test.jsx
git commit -m "feat: Minha conta (trocar senha, trocar PIN, excluir conta)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Do abrir o site até o perfil

**Files:**
- Create: `lib/auth/profile-cookies.js`, `app/perfil-unico/route.js`
- Modify: `lib/actions/conta.js` (usar o ajudante de cookies), `components/IntroScene.jsx`, `lib/theme-bootstrap.js`
- Test: `tests/unit/perfil-unico.test.js`, `tests/components/intro.test.jsx` (novo caso), `tests/unit/preferences.test.js` (novo caso)

**Interfaces:**
- Consumes: `getViewer` (Tarefa 8); `signValue`, constantes de cookie (Tarefa 3); `providersCookieValue`, `PROVIDERS_COOKIE` (Etapa A)
- Produces:
  - `profileCookieEntries(profile, secret, { production })` → lista `[nome, valor, opções]` dos cookies de perfil ativo (perfil assinado, "Meus streamings")
  - `CLEARED_PROFILE_COOKIES` → nomes a apagar ao trocar ou sair (`paidegua_liberados`, `paidegua_adulto`)
  - rota `GET /perfil-unico`: com um só perfil, ativa e vai ao Início; com vários, vai a `/perfis`; sem conta, vai ao Início
  - abertura também em `/perfis`

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/perfil-unico.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifySignedValue } from '@/lib/auth/signed-cookie';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
process.env.BETTER_AUTH_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const { GET } = await import('@/app/perfil-unico/route');

const req = () => new NextRequest('http://localhost:3000/perfil-unico');
const profile = (id) => ({ id, name: id, prefs: { myProviders: [8] } });

describe('/perfil-unico', () => {
  it('um só perfil: ativa e vai direto ao Início', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profiles: [profile('p1')] });
    const res = await GET(req());
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    const cookie = res.cookies.get('paidegua_perfil');
    expect(verifySignedValue(cookie.value, process.env.BETTER_AUTH_SECRET)).toBe('p1');
    expect(cookie.httpOnly).toBe(true);
    expect(res.cookies.get('catalogo_streamings').value).toBe('8');
  });

  it('vários perfis: "Quem está assistindo?"', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profiles: [profile('p1'), profile('p2')] });
    expect((await GET(req())).headers.get('location')).toBe('http://localhost:3000/perfis');
  });

  it('sem conta: Início', async () => {
    viewer.mockResolvedValue({ user: null, profiles: [] });
    expect((await GET(req())).headers.get('location')).toBe('http://localhost:3000/');
  });
});
```

Em `tests/components/intro.test.jsx`, acrescentar:

```jsx
  it('também aparece em "Quem está assistindo?" (depois de entrar, a primeira tela é a dos perfis)', async () => {
    pathname = '/perfis';
    renderWithSettings(<IntroScene />);
    await flush();
    expect(intro()).toBeInTheDocument();
  });
```

Em `tests/unit/preferences.test.js`, dentro de `describe('cobertura da abertura (sem piscar o Início)')`, acrescentar:

```js
  it('cobre também em /perfis', () => {
    window.history.pushState({}, '', '/perfis');
    bootstrapTheme();
    expect(document.documentElement).toHaveAttribute('data-intro', 'pending');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/perfil-unico.test.js tests/components/intro.test.jsx tests/unit/preferences.test.js`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

`lib/auth/profile-cookies.js`:

```js
import { signValue } from './signed-cookie.js';
import { PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE } from './viewer-core.js';
import { PROVIDERS_COOKIE, providersCookieValue } from '../preferences.js';

export const CLEARED_PROFILE_COOKIES = [UNLOCKED_COOKIE, PARENT_COOKIE];

// Cookies de perfil ativo: o id assinado (até fechar o navegador) e "Meus streamings" do perfil.
export function profileCookieEntries(profile, secret, { production = process.env.NODE_ENV === 'production' } = {}) {
  return [
    [PROFILE_COOKIE, signValue(profile.id, secret), { httpOnly: true, sameSite: 'lax', secure: production, path: '/' }],
    [PROVIDERS_COOKIE, providersCookieValue(profile.prefs?.myProviders ?? []), { path: '/', maxAge: 31536000, sameSite: 'lax' }],
  ];
}
```

`app/perfil-unico/route.js`:

```js
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
```

Em `lib/actions/conta.js`, trocar o corpo de `applyProfileCookies` por:

```js
async function applyProfileCookies(profile) {
  const jar = await cookies();
  for (const [name, value, options] of profileCookieEntries(profile, secret())) jar.set(name, value, options);
  CLEARED_PROFILE_COOKIES.forEach((name) => jar.delete(name));
}
```

importando `profileCookieEntries` e `CLEARED_PROFILE_COOKIES` de `@/lib/auth/profile-cookies` (e removendo as importações que ficarem sem uso).

Em `components/IntroScene.jsx`, trocar `pathname === '/'` por `INTRO_PATHS.includes(pathname)`, com `const INTRO_PATHS = ['/', '/perfis'];` junto das outras constantes.

Em `lib/theme-bootstrap.js`, trocar `location.pathname === '/'` por `(location.pathname === '/' || location.pathname === '/perfis')`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/perfil-unico.test.js tests/components/intro.test.jsx tests/unit/preferences.test.js`
Expected: PASS.

Run: `npm test`
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/profile-cookies.js app/perfil-unico lib/actions/conta.js components/IntroScene.jsx lib/theme-bootstrap.js tests
git commit -m "feat: abertura leva a Quem está assistindo? (ou direto ao Início com um só perfil)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Testes de ponta a ponta com contas

**Files:**
- Create: `tests/e2e/prepare-db.mjs`, `tests/e2e/helpers.js`, `tests/e2e/contas.spec.js`
- Modify: `playwright.config.mjs`, `tests/e2e/catalogo.spec.js`, `tests/fixtures/movie-101.json` (já tem classificação 12), `tests/e2e/mock-tmdb.mjs` (classificações)
- Test: os próprios testes de ponta a ponta

**Interfaces:**
- Consumes: o site inteiro; `scripts/migrate.mjs` e `scripts/demo-seed.mjs` (Tarefas 1 e 7)
- Produces: `npm run test:e2e` com banco PGlite próprio em `.data/e2e` (recriado a cada execução) e a conta de demonstração

- [ ] **Step 1: Banco de teste e configuração**

`tests/e2e/prepare-db.mjs`:

```js
// Recria o banco dos testes de ponta a ponta do zero.
import { rmSync } from 'node:fs';

rmSync(new URL('../../.data/e2e', import.meta.url), { recursive: true, force: true });
```

Em `playwright.config.mjs`, no segundo `webServer` (o do site):

```js
      command: 'node tests/e2e/clear-fetch-cache.mjs && node tests/e2e/prepare-db.mjs && node scripts/migrate.mjs && node scripts/demo-seed.mjs && npm run build && npm run start -- -p 3100',
      env: {
        TMDB_BASE_URL: 'http://localhost:4010/3',
        TMDB_READ_TOKEN: 'token-e2e',
        DATABASE_URL: 'pglite:./.data/e2e',
        BETTER_AUTH_SECRET: 'segredo-dos-testes-e2e-com-mais-de-32-caracteres',
        BETTER_AUTH_URL: 'http://localhost:3100',
        DEMO_PASSWORD: 'demo-paidegua-2026',
      },
```

Em `tests/e2e/mock-tmdb.mjs`, acrescentar as rotas de classificação (antes da rota genérica de `/movie/101`):

```js
  [/^\/3\/movie\/(\d+)\/release_dates$/, (url, match) => ({
    results: [{ iso_3166_1: 'BR', release_dates: [{ certification: { 101: '12', 102: 'L' }[match[1]] ?? '16' }] }],
  })],
  [/^\/3\/tv\/(\d+)\/content_ratings$/, () => ({ results: [{ iso_3166_1: 'BR', rating: '14' }] })],
```

- [ ] **Step 2: Ajudantes de login**

`tests/e2e/helpers.js`:

```js
// Bloqueia rede externa (YouTube e imagens) e pula a abertura.
export async function prepare(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
  await page.addInitScript(() => sessionStorage.setItem('paidegua:abertura', '1'));
}

// Entra na conta de demonstração e escolhe um perfil ("Pai", "Mãe" ou "Pequeno").
export async function signInDemo(page, profile = 'Pai') {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Experimentar sem cadastro' }).click();
  await page.waitForURL('**/perfis');
  await page.getByRole('button', { name: profile, exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
}
```

- [ ] **Step 3: Adaptar os testes da Etapa A**

Em `tests/e2e/catalogo.spec.js`:
- importar `import { prepare, signInDemo } from './helpers';`
- no `test.beforeEach` do grupo `catálogo`, depois de `blockExternal(page)`, entrar: `await signInDemo(page);` — e trocar as chamadas `skipEntry(page)` desse grupo por nada (a função `prepare` já pula a abertura; chamar `await prepare(page)` no lugar de `blockExternal` + `skipEntry`);
- nos testes de acessibilidade, para `/explorar` e `/filme/101`, entrar antes de navegar (`await signInDemo(page)`), e para `/` testar **duas vezes**: como visitante e logado;
- o teste "o modo de cor escolhido continua depois de recarregar" passa a valer para o perfil (continua igual, porque o perfil "Pai" grava a escolha).

- [ ] **Step 4: Escrever os testes novos**

`tests/e2e/contas.spec.js`:

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepare, signInDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('visitante vê só a vitrine e é levado a entrar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
  await page.goto('/filme/101');
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Ffilme%2F101$/);
  await expect(page.getByText('Entre ou crie sua conta para continuar.')).toBeVisible();
  const api = await page.request.get('/api/explorar');
  expect(api.status()).toBe(401);
});

test('criar conta leva direto ao Início com o primeiro perfil', async ({ page }) => {
  const email = `ana-${Date.now()}@ex.com`;
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill('Ana');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await page.getByLabel('Confirme a senha').fill('senha-forte-1');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'Menu do perfil Ana' })).toBeVisible();
});

test('entrar com senha errada mostra a mensagem certa', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('demo@paidegua.app');
  await page.getByLabel('Senha').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
});

test('demonstração: três perfis e o Kids marcado', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Experimentar sem cadastro' }).click();
  await page.waitForURL('**/perfis');
  for (const name of ['Pai', 'Mãe', 'Pequeno']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByText('Kids')).toBeVisible();
});

test('Kids: título acima da faixa só abre com o PIN', async ({ page }) => {
  await signInDemo(page, 'Pequeno');
  await page.goto('/filme/101'); // classificação 12, perfil até 10
  await expect(page.getByRole('heading', { name: 'Este título precisa de um adulto' })).toBeVisible();
  await expect(page.getByText('Uma aventura brilhante')).toHaveCount(0);
  await page.getByRole('button', { name: 'Digitar o PIN' }).click();
  await page.getByLabel('PIN dos pais').fill('0000');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('alert')).toHaveText('PIN incorreto. Restam 4 tentativas.');
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Aventura Neon/ })).toBeVisible();
});

test('Kids: sair do perfil e abrir áreas de adulto pedem o PIN', async ({ page }) => {
  await signInDemo(page, 'Pequeno');
  for (const path of ['/perfis', '/perfis/gerenciar', '/conta']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Área de adultos' })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu do perfil Pequeno' }).click();
  await page.getByRole('button', { name: 'Trocar perfil' }).click();
  await page.getByLabel('PIN dos pais').fill('1234');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page).toHaveURL(/\/perfis$/);
  await expect(page.getByRole('heading', { name: 'Quem está assistindo?' })).toBeVisible();
});

test('acessibilidade das telas de conta', async ({ page }) => {
  for (const path of ['/entrar', '/criar-conta', '/esqueci-senha']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
  await signInDemo(page, 'Pai');
  for (const path of ['/perfis', '/perfis/gerenciar', '/conta']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze();
    expect(results.violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});
```

- [ ] **Step 5: Rodar**

Run: `npm run test:e2e`
Expected: PASS em todos. Se o axe apontar violações nas telas novas, corrigir a causa (contraste, rótulo, ordem de títulos) e rodar de novo, sem desligar regras.

- [ ] **Step 6: Verificação final**

Run: `npm test` → Expected: todos passam.
Run: `npm run lint` → Expected: sem erros.
Run: `npm run build` → Expected: build concluído.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.mjs tests/e2e
git commit -m "test: testes de ponta a ponta de contas, perfis e Kids" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cobertura da especificação

| Seção da especificação | Tarefa |
|---|---|
| 3. Tecnologia | 1, 2 |
| 4. Regras de acesso | 3, 8, 9 |
| 4.1 Classificação | 4, 9, 11 |
| 5.1 Ordem ao abrir | 9, 16 |
| 5.2–5.4 Entrar, criar conta, senha | 2, 12 |
| 5.5 Quem está assistindo? | 13, 16 |
| 5.6 Gerenciar perfis | 5, 13 |
| 5.7 Menu do avatar | 14 |
| 5.8 Cadeado e PIN | 6, 11 |
| 5.9 Minha conta | 8, 15 |
| 5.10 Demonstração | 7, 8, 12 |
| 6. Dados | 1, 5, 6, 7 |
| 7. Sessão e cookies | 2, 3, 8, 16 |
| 8. Preferências | 5, 10 |
| 9. Mudanças na Etapa A | 9, 11, 14, 16, 17 |
| 10. Segurança | 2, 3, 6, 8 |
| 11. Erros | 5, 6, 8, 12, 13 |
| 12. Acessibilidade | 11–15, 17 |
| 13. Testes | todas |
| 14. Configuração | 1 |

**Ajustes em relação à especificação:**
- Desenvolvimento e testes usam PGlite (PostgreSQL local, sem criar conta em lugar nenhum); o Neon fica para a publicação.
- O PIN libera "ações de adulto" por 10 minutos (cookie `paidegua_adulto`), em vez de pedir o PIN de novo a cada clique dentro da mesma área.
