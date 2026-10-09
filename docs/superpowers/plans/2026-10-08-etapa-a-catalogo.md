# Etapa A – Catálogo: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o site de catálogo (filmes e séries incluídos em assinaturas de streaming no Brasil) com visual Neon, modos Escuro/Claro/Noturno e painel de Acessibilidade, usando a API do TMDB.

**Architecture:** Projeto Next.js (App Router) único. Todo acesso ao TMDB passa por `lib/tmdb/client.js`, que aplica as regras fixas (pt-BR, Brasil, só assinatura, sem conteúdo adulto), timeout, nova tentativa e cache. As páginas são montadas no servidor; busca, filtros e rolagem infinita chamam rotas internas (`/api/*`). As preferências da pessoa ficam no `localStorage`, com "Meus streamings" espelhado num cookie para o servidor.

**Tech Stack:** Next.js 16 (App Router, JavaScript), React 19, Tailwind CSS 4, Motion 14 (`motion/react`, antigo Framer Motion), Vitest 5 + React Testing Library + jsdom, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-08-etapa-a-catalogo-design.md`

## Pré-requisito (feito pela pessoa, uma vez)

1. Criar conta em https://www.themoviedb.org e gerar o **API Read Access Token** em https://www.themoviedb.org/settings/api.
2. Na Tarefa 1, colar o token em `.env.local` (`TMDB_READ_TOKEN=...`). Os testes automatizados **não** precisam do token; só o site rodando de verdade e os scripts de conferência.

## Global Constraints

- Node.js 22; Next.js 16 com App Router; JavaScript (sem TypeScript).
- Arquivos com JSX usam a extensão `.jsx` (inclusive em `app/`). Arquivos sem JSX usam `.js`.
- Importações internas usam o apelido `@/` (raiz do projeto).
- Nenhum código fora de `lib/tmdb/client.js` chama a API do TMDB.
- Toda chamada ao TMDB inclui `language=pt-BR`, `region=BR`, `watch_region=BR`, `include_adult=false`, `with_watch_monetization_types=flatrate`, e quem chama não pode sobrescrever esses valores.
- Timeout de 8 s; uma nova tentativa em falha de rede ou erro 5xx; em 429, espera `Retry-After` (máximo 2 s) e tenta uma vez.
- Cache: fileiras/gêneros/humores 6 h (21600 s); detalhes, vídeos e disponibilidade 24 h (86400 s); listas de plataformas e gêneros 24 h; palavras-chave dos humores 7 dias (604800 s); busca por texto sem cache.
- Textos da interface em português do Brasil.
- Cores: destaque roxo `#8b5cf6` e rosa `#ec4899`.
- Brilho do Noturno: 20% a 100%, padrão 60%.
- Destaque do Início troca a cada 15 s, entre os 5 primeiros em alta.
- Som de abertura: sobe de 0 ao volume final em 3 s, duração total de cerca de 5 s.
- Fileiras com 20 títulos; Explorar carrega 20 por vez; "ordenar por nota" exige ao menos 200 votos.
- Busca: mínimo de 2 caracteres e 300 ms após a última tecla.
- Testes nunca chamam a API real do TMDB.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (passada como segundo `-m`).

## Review Focus

1. **Busca com acentos e símbolos** ("ação & aventura", "Cidade de Deus"): a consulta chega intacta ao TMDB. Teste na Tarefa 2.
2. **Endereço do Explorar com valores inválidos** (`?nota=abc`, `?tipo=xyz`, `?anoDe=2020&anoAte=1990`, `?plataforma=999`): valores inválidos são ignorados ou corrigidos, sem erro. Teste na Tarefa 6.
3. **Título inexistente, com ID não numérico ou fora das assinaturas no Brasil**: página "Não encontrado", nunca erro 500. Teste na Tarefa 7.
4. **Preferências salvas corrompidas, de versão antiga ou fora da faixa** (brilho 500, tema "roxo"): voltam ao padrão ou à faixa permitida. Teste na Tarefa 8.
5. **Modo sensorial calmo ao abrir a página**: o trailer não começa nem por um instante antes de as preferências carregarem. Teste na Tarefa 13.

## Estrutura de arquivos

```
app/
  layout.jsx                 estrutura base, script de tema, provedor de preferências
  globals.css                Tailwind e tokens de cor por modo
  page.jsx                   Início
  error.jsx                  erro inesperado com "Tentar novamente"
  not-found.jsx              "Não encontrado"
  explorar/page.jsx
  busca/page.jsx
  filme/[id]/page.jsx
  serie/[id]/page.jsx
  api/explorar/route.js
  api/buscar/route.js
components/
  settings/SettingsProvider.jsx   contexto de preferências (cliente)
  settings/SettingsPanel.jsx      painel lateral de Configurações
  Header.jsx  Footer.jsx  BrightnessOverlay.jsx  EntryScreen.jsx
  Hero.jsx  TrailerModal.jsx  TrailerButton.jsx
  PosterCard.jsx  Row.jsx  MoodPicker.jsx  LoadError.jsx
  ExploreFilters.jsx  ExploreGrid.jsx  SearchBox.jsx  TitlePage.jsx
lib/
  brand.js                   nome do site
  tmdb/client.js             único ponto de contato com o TMDB
  tmdb/normalize.js          formato único de "título"
  tmdb/catalog.js            consultas de alto nível (Início, Explorar, busca, detalhes)
  images.js  providers.js  genres.js  moods.js  trailer.js  certification.js
  explore-params.js  preferences.js  theme-bootstrap.js  opening-sound.js  format.js
scripts/list-providers.mjs   confere os IDs das plataformas no TMDB
tests/
  setup.js  helpers/mock-tmdb.js  helpers/render-with-settings.jsx
  unit/*.test.js  components/*.test.jsx
  e2e/mock-tmdb.mjs  e2e/catalogo.spec.js  fixtures/*.json
```

**Formato "título"** (produzido por `normalizeTitle`, usado em todo o front-end):

```js
{ id: 101, type: 'movie' | 'tv', title: 'Aventura Neon', year: 2024 | null,
  overview: '...', posterPath: '/p.jpg' | null, backdropPath: '/b.jpg' | null,
  rating: 7.8 | null, popularity: 120.5, genreIds: [28, 12] }
```

---

### Task 1: Base do projeto

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.mjs`, `tests/setup.js`, `.env.example`, `.env.local` (não versionado), `lib/brand.js`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm test` (Vitest), `npm run test:e2e` (Playwright), apelido `@/`, `APP_NAME` em `lib/brand.js`.

- [ ] **Step 1: Gerar o Next.js numa pasta temporária e mover para a raiz**

A raiz já tem `docs/`, `.superpowers/` e `.gitignore`, e o `create-next-app` recusa pastas com arquivos desconhecidos.

```bash
npx create-next-app@latest app-temp --js --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cp -r app-temp/. .
rm -rf app-temp
git checkout -- .gitignore
```

Expected: `package.json`, `app/`, `public/`, `next.config.mjs`, `postcss.config.mjs`, `jsconfig.json` na raiz; `.gitignore` igual ao versionado.

- [ ] **Step 2: Trocar os arquivos gerados com JSX para `.jsx`**

```bash
mv app/page.js app/page.jsx
mv app/layout.js app/layout.jsx
```

- [ ] **Step 3: Instalar dependências**

```bash
npm install motion
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright
npx playwright install chromium
```

- [ ] **Step 4: Configurar o Vitest**

`vitest.config.mjs`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}', 'tests/components/**/*.test.{js,jsx}'],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
```

`tests/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const isBrowserLike = typeof window !== 'undefined';

// O jsdom não implementa matchMedia; o site e o Motion consultam essa API.
// (Testes de rotas internas usam o ambiente "node", sem window.)
if (isBrowserLike && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  if (!isBrowserLike) return;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
});
```

- [ ] **Step 5: Scripts no `package.json`**

Acrescentar em `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 6: Variáveis de ambiente e nome do site**

`.env.example`:

```
# Token de leitura (API Read Access Token, v4) da sua conta TMDB:
# https://www.themoviedb.org/settings/api
TMDB_READ_TOKEN=

# Opcional. Os testes de ponta a ponta apontam para um TMDB simulado.
# TMDB_BASE_URL=https://api.themoviedb.org/3
```

Copiar para `.env.local` e colar o token real (o `.gitignore` já ignora `.env*.local`).

`lib/brand.js`:

```js
// Nome exibido no topo e na tela de entrada. Troque aqui para renomear o site.
export const APP_NAME = 'Catálogo';
```

- [ ] **Step 7: Verificar**

Run: `npx vitest run --passWithNoTests` → Expected: sai com código 0.
Run: `npm run build` → Expected: build concluído sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: base do projeto Next.js com Tailwind, Motion, Vitest e Playwright" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cliente do TMDB com regras fixas

**Files:**
- Create: `lib/tmdb/client.js`
- Test: `tests/unit/tmdb-client.test.js`

**Interfaces:**
- Produces:
  - `FIXED_PARAMS` (objeto congelado com as 5 regras)
  - `buildTmdbUrl(path: string, params?: object): URL`
  - `tmdbFetch(path: string, params?: object, options?: { revalidate?: number }): Promise<object>`; sem `revalidate` usa `cache: 'no-store'`
  - `class TmdbError extends Error { status: number }` (0 para falha de rede)

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/tmdb-client.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTmdbUrl, tmdbFetch, TmdbError } from '@/lib/tmdb/client';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

beforeEach(() => {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-teste');
  vi.stubEnv('TMDB_BASE_URL', 'https://tmdb.teste/3');
});

describe('buildTmdbUrl', () => {
  it('aplica as regras fixas em toda chamada', () => {
    const url = buildTmdbUrl('/discover/movie', { with_genres: '28' });
    expect(url.origin + url.pathname).toBe('https://tmdb.teste/3/discover/movie');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('region')).toBe('BR');
    expect(url.searchParams.get('watch_region')).toBe('BR');
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(url.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
    expect(url.searchParams.get('with_genres')).toBe('28');
  });

  it('não deixa quem chama sobrescrever as regras fixas', () => {
    const url = buildTmdbUrl('/search/multi', {
      include_adult: 'true',
      language: 'en-US',
      with_watch_monetization_types: 'rent',
    });
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
  });

  it('mantém intacto texto com acentos e símbolos', () => {
    const url = buildTmdbUrl('/search/multi', { query: 'ação & aventura' });
    expect(url.searchParams.get('query')).toBe('ação & aventura');
    expect(url.search).toContain('query=a%C3%A7%C3%A3o+%26+aventura');
  });

  it('ignora parâmetros vazios', () => {
    const url = buildTmdbUrl('/discover/movie', { a: '', b: null, c: undefined, d: 0 });
    expect(url.searchParams.has('a')).toBe(false);
    expect(url.searchParams.has('b')).toBe(false);
    expect(url.searchParams.has('c')).toBe(false);
    expect(url.searchParams.get('d')).toBe('0');
  });
});

describe('tmdbFetch', () => {
  it('envia o token no cabeçalho, repassa o cache e devolve o JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1', {}, { revalidate: 60 })).resolves.toEqual({ ok: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-teste');
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it('sem revalidate não usa cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    await tmdbFetch('/search/multi', { query: 'x' });
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });

  it('dá um erro claro quando falta o token', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '');
    await expect(tmdbFetch('/movie/1')).rejects.toThrow('Defina TMDB_READ_TOKEN em .env.local');
  });

  it('tenta de novo uma vez após falha de rede', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('desiste após a segunda falha de rede', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).rejects.toBeInstanceOf(TmdbError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('tenta de novo uma vez após erro 500', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).resolves.toEqual({ ok: 1 });
  });

  it('não tenta de novo em 404 e informa o status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/999')).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('em 429 espera o Retry-After (no máximo 2 s) e tenta de novo', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '10' }))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const promise = tmdbFetch('/movie/1');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/tmdb-client.test.js`
Expected: FAIL, "Failed to resolve import '@/lib/tmdb/client'".

- [ ] **Step 3: Implementar**

`lib/tmdb/client.js`:

```js
const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const TIMEOUT_MS = 8000;
const MAX_RETRY_AFTER_MS = 2000;

// Regras fixas do catálogo. São aplicadas por último, então ninguém consegue sobrescrevê-las.
export const FIXED_PARAMS = Object.freeze({
  language: 'pt-BR',
  region: 'BR',
  watch_region: 'BR',
  include_adult: 'false',
  with_watch_monetization_types: 'flatrate',
});

export class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'TmdbError';
    this.status = status;
  }
}

export function buildTmdbUrl(path, params = {}) {
  const base = (process.env.TMDB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = new URL(base + path);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  for (const [key, value] of Object.entries(FIXED_PARAMS)) url.searchParams.set(key, value);
  return url;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function tmdbFetch(path, params = {}, { revalidate } = {}) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error('Defina TMDB_READ_TOKEN em .env.local');
  const url = buildTmdbUrl(path, params);
  const init = {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    ...(revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } }),
  };
  return attempt(url, init, true);
}

async function attempt(url, init, canRetry) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (canRetry) return attempt(url, init, false);
    throw new TmdbError(`Falha de rede ao chamar o TMDB: ${error.message}`, 0);
  }

  if (response.status === 429 && canRetry) {
    const seconds = Number(response.headers.get('retry-after'));
    const wait = Number.isFinite(seconds) && seconds > 0
      ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
      : MAX_RETRY_AFTER_MS;
    await sleep(wait);
    return attempt(url, init, false);
  }
  if (response.status >= 500 && canRetry) return attempt(url, init, false);
  if (!response.ok) {
    throw new TmdbError(`TMDB respondeu ${response.status} para ${url.pathname}`, response.status);
  }
  return response.json();
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/tmdb-client.test.js`
Expected: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb/client.js tests/unit/tmdb-client.test.js
git commit -m "feat: cliente do TMDB com regras fixas, timeout e novas tentativas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Formato único de título e imagens

**Files:**
- Create: `lib/tmdb/normalize.js`, `lib/images.js`
- Test: `tests/unit/normalize.test.js`

**Interfaces:**
- Produces:
  - `normalizeTitle(raw: object, fallbackType?: 'movie'|'tv'): Title` (formato na seção "Estrutura de arquivos")
  - `titleHref(title: Title): string` → `/filme/101` ou `/serie/201`
  - `imageUrl(path: string|null, size?: string): string|null` (tamanho padrão `w342`)

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/normalize.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeTitle, titleHref } from '@/lib/tmdb/normalize';
import { imageUrl } from '@/lib/images';

describe('normalizeTitle', () => {
  it('normaliza um filme', () => {
    const t = normalizeTitle({
      id: 101, title: 'Aventura Neon', release_date: '2024-05-10', overview: 'Sinopse',
      poster_path: '/p.jpg', backdrop_path: '/b.jpg', vote_average: 7.84, popularity: 50, genre_ids: [28],
    }, 'movie');
    expect(t).toEqual({
      id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, overview: 'Sinopse',
      posterPath: '/p.jpg', backdropPath: '/b.jpg', rating: 7.8, popularity: 50, genreIds: [28],
    });
  });

  it('normaliza uma série usando name e first_air_date', () => {
    const t = normalizeTitle({ id: 201, name: 'Série Brilhante', first_air_date: '2021-01-01' }, 'tv');
    expect(t.type).toBe('tv');
    expect(t.title).toBe('Série Brilhante');
    expect(t.year).toBe(2021);
  });

  it('media_type tem prioridade sobre o tipo informado', () => {
    expect(normalizeTitle({ id: 1, media_type: 'tv', name: 'X' }, 'movie').type).toBe('tv');
  });

  it('usa valores seguros quando faltam dados', () => {
    const t = normalizeTitle({ id: 5 }, 'movie');
    expect(t).toMatchObject({
      title: 'Sem título', year: null, overview: '', posterPath: null,
      backdropPath: null, rating: null, popularity: 0, genreIds: [],
    });
  });

  it('aceita genres (detalhes) no lugar de genre_ids', () => {
    expect(normalizeTitle({ id: 1, genres: [{ id: 18, name: 'Drama' }] }, 'movie').genreIds).toEqual([18]);
  });
});

describe('titleHref', () => {
  it('monta o endereço da página do título', () => {
    expect(titleHref({ id: 101, type: 'movie' })).toBe('/filme/101');
    expect(titleHref({ id: 201, type: 'tv' })).toBe('/serie/201');
  });
});

describe('imageUrl', () => {
  it('monta o endereço da imagem ou devolve null', () => {
    expect(imageUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w342/p.jpg');
    expect(imageUrl('/b.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/b.jpg');
    expect(imageUrl(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/normalize.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/images.js`:

```js
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path, size = 'w342') {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
```

`lib/tmdb/normalize.js`:

```js
export function normalizeTitle(raw, fallbackType) {
  const type = raw.media_type === 'movie' || raw.media_type === 'tv' ? raw.media_type : fallbackType;
  const isMovie = type === 'movie';
  const date = (isMovie ? raw.release_date : raw.first_air_date) || '';
  return {
    id: raw.id,
    type,
    title: (isMovie ? raw.title : raw.name) || raw.original_title || raw.original_name || 'Sem título',
    year: date ? Number(date.slice(0, 4)) : null,
    overview: raw.overview || '',
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? (raw.genres ? raw.genres.map((g) => g.id) : []),
  };
}

export function titleHref(title) {
  return `/${title.type === 'movie' ? 'filme' : 'serie'}/${title.id}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/normalize.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb/normalize.js lib/images.js tests/unit/normalize.test.js
git commit -m "feat: formato único de título e endereços de imagem" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Configuração de plataformas, gêneros e humores

**Files:**
- Create: `lib/providers.js`, `lib/genres.js`, `lib/moods.js`, `scripts/list-providers.mjs`
- Test: `tests/unit/config.test.js`

**Interfaces:**
- Produces:
  - `PROVIDERS: { id: number, name: string }[]`, `ALL_PROVIDER_IDS: number[]`
  - `GENRE_ROWS: { slug, label, movie: number, tv: number|null }[]`
  - `MOODS: { slug, emoji, label, movie: MoodCfg, tv: MoodCfg|null }[]`, com `MoodCfg = { genres?: number[], keywords?: string[], minRating?: number }`
  - `getMood(slug: string|null): Mood|undefined`

Os humores guardam **nomes** de palavras-chave em inglês (como o TMDB as cadastra). A Tarefa 7 converte os nomes em IDs pela API, com cache de 7 dias, então não há IDs para copiar à mão.

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/config.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { PROVIDERS, ALL_PROVIDER_IDS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { MOODS, getMood } from '@/lib/moods';

describe('plataformas', () => {
  it('têm IDs inteiros e únicos, na ordem definida', () => {
    expect(PROVIDERS[0].name).toBe('Netflix');
    expect(new Set(ALL_PROVIDER_IDS).size).toBe(PROVIDERS.length);
    expect(ALL_PROVIDER_IDS.every(Number.isInteger)).toBe(true);
  });
});

describe('fileiras de gênero', () => {
  it('cobrem os 8 gêneros do Início', () => {
    expect(GENRE_ROWS.map((g) => g.label)).toEqual([
      'Ação', 'Terror', 'Romance', 'Comédia', 'Infantil', 'Ficção científica', 'Animação', 'Drama',
    ]);
  });
});

describe('humores', () => {
  it('são os 8 combinados, com slugs únicos', () => {
    expect(MOODS.map((m) => m.label)).toEqual([
      'Relaxar', 'Rir', 'Histórias de superação', 'Me emocionar',
      'Adrenalina', 'Sentir medo', 'Me apaixonar', 'Fé e espiritualidade',
    ]);
    expect(new Set(MOODS.map((m) => m.slug)).size).toBe(8);
  });

  it('todo humor tem configuração para filmes', () => {
    for (const mood of MOODS) {
      expect(mood.movie.genres?.length || mood.movie.keywords?.length).toBeTruthy();
    }
  });

  it('Fé e espiritualidade usa palavras-chave de várias crenças', () => {
    expect(getMood('fe').movie.keywords).toEqual(
      expect.arrayContaining(['faith', 'christianity', 'spirituality', 'judaism']),
    );
  });

  it('getMood devolve undefined para slug desconhecido', () => {
    expect(getMood('xyz')).toBeUndefined();
    expect(getMood(null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/config.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/providers.js`:

```js
// IDs do TMDB para a região BR. Confira com: node --env-file=.env.local scripts/list-providers.mjs
export const PROVIDERS = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Amazon Prime Video' },
  { id: 337, name: 'Disney+' },
  { id: 1899, name: 'Max' },
  { id: 307, name: 'Globoplay' },
  { id: 350, name: 'Apple TV+' },
  { id: 531, name: 'Paramount+' },
];

export const ALL_PROVIDER_IDS = PROVIDERS.map((p) => p.id);
```

`lib/genres.js`:

```js
// IDs de gênero do TMDB. Séries usam IDs próprios; null = não há equivalente para séries.
export const GENRE_ROWS = [
  { slug: 'acao', label: 'Ação', movie: 28, tv: 10759 },
  { slug: 'terror', label: 'Terror', movie: 27, tv: null },
  { slug: 'romance', label: 'Romance', movie: 10749, tv: null },
  { slug: 'comedia', label: 'Comédia', movie: 35, tv: 35 },
  { slug: 'infantil', label: 'Infantil', movie: 10751, tv: 10762 },
  { slug: 'ficcao', label: 'Ficção científica', movie: 878, tv: 10765 },
  { slug: 'animacao', label: 'Animação', movie: 16, tv: 16 },
  { slug: 'drama', label: 'Drama', movie: 18, tv: 18 },
];
```

`lib/moods.js`:

```js
// genres: qualquer um dos gêneros (OU). keywords: nomes de palavras-chave do TMDB (OU).
// Quando há genres e keywords, o título precisa ter os dois. tv: null = só filmes.
const SUPERACAO = ['sports', 'based on true story', 'overcoming adversity', 'underdog'];
const FE = ['faith', 'christianity', 'bible', 'religion', 'spirituality', 'jesus christ', 'judaism', 'spiritism'];

export const MOODS = [
  { slug: 'relaxar', emoji: '😌', label: 'Relaxar',
    movie: { genres: [35, 10751, 16], minRating: 7 }, tv: { genres: [35, 10751, 16], minRating: 7 } },
  { slug: 'rir', emoji: '😂', label: 'Rir', movie: { genres: [35] }, tv: { genres: [35] } },
  { slug: 'superacao', emoji: '💪', label: 'Histórias de superação',
    movie: { genres: [18], keywords: SUPERACAO }, tv: { genres: [18], keywords: SUPERACAO } },
  { slug: 'emocionar', emoji: '🥹', label: 'Me emocionar',
    movie: { genres: [18, 10749], minRating: 7.5 }, tv: { genres: [18], minRating: 7.5 } },
  { slug: 'adrenalina', emoji: '⚡', label: 'Adrenalina', movie: { genres: [28, 53] }, tv: { genres: [10759] } },
  { slug: 'medo', emoji: '😱', label: 'Sentir medo', movie: { genres: [27] }, tv: null },
  { slug: 'paixao', emoji: '❤️', label: 'Me apaixonar', movie: { genres: [10749] }, tv: null },
  { slug: 'fe', emoji: '🙏', label: 'Fé e espiritualidade', movie: { keywords: FE }, tv: { keywords: FE } },
];

export function getMood(slug) {
  return MOODS.find((m) => m.slug === slug);
}
```

`scripts/list-providers.mjs`:

```js
// Uso: node --env-file=.env.local scripts/list-providers.mjs
const res = await fetch('https://api.themoviedb.org/3/watch/providers/movie?watch_region=BR&language=pt-BR', {
  headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
});
const { results } = await res.json();
results
  .sort((a, b) => (a.display_priorities?.BR ?? 999) - (b.display_priorities?.BR ?? 999))
  .slice(0, 40)
  .forEach((p) => console.log(String(p.provider_id).padStart(5), p.provider_name));
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/config.test.js`
Expected: PASS.

- [ ] **Step 5: Conferir as plataformas com o TMDB real**

Run: `node --env-file=.env.local scripts/list-providers.mjs`
Expected: lista com ID e nome. Para cada item de `PROVIDERS`, confirmar que o ID aparece com aquele nome; se algum ID estiver diferente, corrigir em `lib/providers.js`. Se "Mercado Play" aparecer, acrescentar `{ id: <ID exibido>, name: 'Mercado Play' }` no fim da lista. Rodar `npx vitest run tests/unit/config.test.js` de novo.

- [ ] **Step 6: Commit**

```bash
git add lib/providers.js lib/genres.js lib/moods.js scripts/list-providers.mjs tests/unit/config.test.js
git commit -m "feat: configuração de plataformas, gêneros e humores" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Trailer, classificação indicativa e formatação

**Files:**
- Create: `lib/trailer.js`, `lib/certification.js`, `lib/format.js`
- Test: `tests/unit/trailer-certification-format.test.js`

**Interfaces:**
- Produces:
  - `pickTrailer(videos?: object[]): string|null` (chave do YouTube)
  - `trailerEmbedUrl(key: string, opts?: { autoplay?, muted?, loop? }): string`
  - `brazilCertification(details: object, type: 'movie'|'tv'): string|null`
  - `formatRuntime(minutes: number|null): string|null`, `formatSeasons(n: number|null): string|null`
  - `certificationLabel(cert: string): string`, `CERTIFICATION_STYLES: Record<string,string>`

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/trailer-certification-format.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pickTrailer, trailerEmbedUrl } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';
import { formatRuntime, formatSeasons, certificationLabel } from '@/lib/format';

const v = (key, iso_639_1, type, extra = {}) => ({ key, site: 'YouTube', iso_639_1, type, official: true, ...extra });

describe('pickTrailer', () => {
  it('prefere trailer em português', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), v('pt1', 'pt', 'Trailer')])).toBe('pt1');
  });
  it('prefere o português do Brasil ao de Portugal', () => {
    expect(pickTrailer([
      v('ptpt', 'pt', 'Trailer', { iso_3166_1: 'PT' }),
      v('ptbr', 'pt', 'Trailer', { iso_3166_1: 'BR' }),
    ])).toBe('ptbr');
  });
  it('usa teaser em português antes de trailer em inglês', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), v('pt-teaser', 'pt', 'Teaser')])).toBe('pt-teaser');
  });
  it('cai para inglês e ignora vídeos fora do YouTube', () => {
    expect(pickTrailer([{ ...v('vimeo', 'pt', 'Trailer'), site: 'Vimeo' }, v('en1', 'en', 'Trailer')])).toBe('en1');
  });
  it('devolve null sem vídeos adequados', () => {
    expect(pickTrailer([v('x', 'pt', 'Featurette')])).toBeNull();
    expect(pickTrailer(undefined)).toBeNull();
  });
});

describe('trailerEmbedUrl', () => {
  it('usa o domínio sem cookies e as opções pedidas', () => {
    const url = new URL(trailerEmbedUrl('abc', { autoplay: true, muted: true, loop: true }));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/abc');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('abc');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
  });
  it('sem opções não toca sozinho nem fica mudo', () => {
    const url = new URL(trailerEmbedUrl('abc'));
    expect(url.searchParams.has('autoplay')).toBe(false);
    expect(url.searchParams.has('mute')).toBe(false);
  });
});

describe('brazilCertification', () => {
  it('lê a classificação brasileira de um filme', () => {
    const details = { release_dates: { results: [
      { iso_3166_1: 'US', release_dates: [{ certification: 'PG-13' }] },
      { iso_3166_1: 'BR', release_dates: [{ certification: '' }, { certification: '14' }] },
    ] } };
    expect(brazilCertification(details, 'movie')).toBe('14');
  });
  it('lê a classificação brasileira de uma série', () => {
    expect(brazilCertification({ content_ratings: { results: [{ iso_3166_1: 'BR', rating: 'L' }] } }, 'tv')).toBe('L');
  });
  it('devolve null quando não há classificação para o Brasil', () => {
    expect(brazilCertification({ release_dates: { results: [] } }, 'movie')).toBeNull();
    expect(brazilCertification({}, 'tv')).toBeNull();
  });
});

describe('formatação', () => {
  it('formata a duração', () => {
    expect(formatRuntime(128)).toBe('2h 8min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(null)).toBeNull();
  });
  it('formata temporadas', () => {
    expect(formatSeasons(1)).toBe('1 temporada');
    expect(formatSeasons(3)).toBe('3 temporadas');
    expect(formatSeasons(null)).toBeNull();
  });
  it('descreve a classificação por extenso', () => {
    expect(certificationLabel('L')).toBe('Classificação indicativa: livre');
    expect(certificationLabel('12')).toBe('Classificação indicativa: 12 anos');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/trailer-certification-format.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/trailer.js`:

```js
const PREFERENCE = [['pt', 'Trailer'], ['pt', 'Teaser'], ['en', 'Trailer'], ['en', 'Teaser']];

function score(video) {
  return (video.iso_3166_1 === 'BR' ? 2 : 0) + (video.official ? 1 : 0);
}

export function pickTrailer(videos = []) {
  const youtube = (videos ?? []).filter((v) => v.site === 'YouTube' && v.key);
  for (const [lang, type] of PREFERENCE) {
    const best = youtube
      .filter((v) => v.iso_639_1 === lang && v.type === type)
      .sort((a, b) => score(b) - score(a))[0];
    if (best) return best.key;
  }
  return null;
}

export function trailerEmbedUrl(key, { autoplay = false, muted = false, loop = false } = {}) {
  const params = new URLSearchParams({ rel: '0', playsinline: '1', enablejsapi: '1', modestbranding: '1' });
  if (autoplay) params.set('autoplay', '1');
  if (muted) params.set('mute', '1');
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', key);
  }
  return `https://www.youtube-nocookie.com/embed/${key}?${params}`;
}
```

`lib/certification.js`:

```js
export function brazilCertification(details, type) {
  if (type === 'movie') {
    const br = details.release_dates?.results?.find((r) => r.iso_3166_1 === 'BR');
    const cert = br?.release_dates?.map((d) => d.certification?.trim()).find(Boolean);
    return cert || null;
  }
  const br = details.content_ratings?.results?.find((r) => r.iso_3166_1 === 'BR');
  return br?.rating?.trim() || null;
}
```

`lib/format.js`:

```js
export function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function formatSeasons(n) {
  if (!n) return null;
  return n === 1 ? '1 temporada' : `${n} temporadas`;
}

export function certificationLabel(cert) {
  return cert === 'L' ? 'Classificação indicativa: livre' : `Classificação indicativa: ${cert} anos`;
}

// Cores oficiais da classificação indicativa brasileira.
export const CERTIFICATION_STYLES = {
  L: 'bg-green-600 text-white',
  10: 'bg-sky-600 text-white',
  12: 'bg-yellow-400 text-black',
  14: 'bg-orange-500 text-black',
  16: 'bg-red-600 text-white',
  18: 'bg-black text-white border border-white/40',
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/trailer-certification-format.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/trailer.js lib/certification.js lib/format.js tests/unit/trailer-certification-format.test.js
git commit -m "feat: escolha de trailer, classificação indicativa e formatação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Parâmetros do Explorar

**Files:**
- Create: `lib/explore-params.js`
- Test: `tests/unit/explore-params.test.js`

**Interfaces:**
- Consumes: `ALL_PROVIDER_IDS` (Tarefa 4), `getMood` (Tarefa 4)
- Produces:
  - `parseExploreParams(sp: URLSearchParams | Record<string,string|string[]>): Filters`
  - `Filters = { tipo: 'filme'|'serie', plataformas: number[], generos: number[], anoDe: number|null, anoAte: number|null, nota: number|null, duracao: 'curto'|'medio'|'longo'|null, idioma: string|null, ordem: 'popularidade'|'nota'|'recentes', humor: string|null, pagina: number }`
  - `toExploreQuery(filters: Filters): string` (sem `?`, omite valores padrão)
  - `toDiscoverRequest(filters: Filters, opts?: { myProviders?: number[], keywordIds?: number[] }): { path: string, params: object }`

Regras: aceita valores repetidos (`genero=28&genero=35`, vindos do formulário) e listas com vírgula (`genero=28,35`). Gêneros escolhidos pela pessoa substituem os do humor; a nota mínima final é a maior entre a escolhida e a do humor; duração vale só para filmes.

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/explore-params.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseExploreParams, toExploreQuery, toDiscoverRequest } from '@/lib/explore-params';
import { ALL_PROVIDER_IDS } from '@/lib/providers';

const parse = (query) => parseExploreParams(new URLSearchParams(query));

afterEach(() => vi.useRealTimers());

describe('parseExploreParams', () => {
  it('usa os padrões sem parâmetros', () => {
    expect(parse('')).toEqual({
      tipo: 'filme', plataformas: [], generos: [], anoDe: null, anoAte: null, nota: null,
      duracao: null, idioma: null, ordem: 'popularidade', humor: null, pagina: 1,
    });
  });

  it('lê todos os filtros válidos', () => {
    expect(parse('tipo=serie&plataforma=8,119&genero=18&anoDe=2000&anoAte=2010&nota=7&idioma=ko&ordem=nota&humor=rir&pagina=3'))
      .toEqual({
        tipo: 'serie', plataformas: [8, 119], generos: [18], anoDe: 2000, anoAte: 2010, nota: 7,
        duracao: null, idioma: 'ko', ordem: 'nota', humor: 'rir', pagina: 3,
      });
  });

  it('aceita valores repetidos vindos do formulário', () => {
    expect(parse('genero=28&genero=35').generos).toEqual([28, 35]);
  });

  it('aceita o objeto searchParams do Next.js', () => {
    expect(parseExploreParams({ genero: ['28', '35'], tipo: 'serie' })).toMatchObject({ generos: [28, 35], tipo: 'serie' });
  });

  it('ignora valores inválidos sem quebrar', () => {
    const f = parse('tipo=xyz&nota=abc&ordem=aleatorio&humor=nada&idioma=portugues&plataforma=999,8&genero=-1,abc&anoDe=1500&pagina=-4&duracao=enorme');
    expect(f).toMatchObject({
      tipo: 'filme', nota: null, ordem: 'popularidade', humor: null, idioma: null,
      plataformas: [8], generos: [], anoDe: null, pagina: 1, duracao: null,
    });
  });

  it('nota fora de 0 a 10 é ignorada', () => {
    expect(parse('nota=11').nota).toBeNull();
    expect(parse('nota=0').nota).toBe(0);
  });

  it('inverte anos trocados', () => {
    expect(parse('anoDe=2020&anoAte=1990')).toMatchObject({ anoDe: 1990, anoAte: 2020 });
  });

  it('limita a página a 500', () => {
    expect(parse('pagina=9999').pagina).toBe(500);
  });

  it('ignora duração em séries', () => {
    expect(parse('tipo=serie&duracao=curto').duracao).toBeNull();
    expect(parse('duracao=curto').duracao).toBe('curto');
  });
});

describe('toExploreQuery', () => {
  it('omite padrões e faz o caminho de volta', () => {
    expect(toExploreQuery(parse(''))).toBe('');
    const query = 'tipo=serie&humor=rir&plataforma=8%2C119&genero=18&anoDe=2000&nota=7&ordem=nota&pagina=2';
    expect(toExploreQuery(parse(query))).toBe(query);
  });
});

describe('toDiscoverRequest', () => {
  it('filme padrão: todas as plataformas, por popularidade', () => {
    const { path, params } = toDiscoverRequest(parse(''));
    expect(path).toBe('/discover/movie');
    expect(params).toEqual({ page: 1, with_watch_providers: ALL_PROVIDER_IDS.join('|'), sort_by: 'popularity.desc' });
  });

  it('plataformas do filtro > Meus streamings > todas', () => {
    expect(toDiscoverRequest(parse('plataforma=8'), { myProviders: [119] }).params.with_watch_providers).toBe('8');
    expect(toDiscoverRequest(parse(''), { myProviders: [119, 337] }).params.with_watch_providers).toBe('119|337');
  });

  it('aplica gêneros, anos, nota, duração e idioma de filmes', () => {
    const { params } = toDiscoverRequest(parse('genero=28,35&anoDe=2000&anoAte=2010&nota=6&duracao=medio&idioma=en'));
    expect(params).toMatchObject({
      with_genres: '28|35',
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2010-12-31',
      'vote_average.gte': 6,
      'with_runtime.gte': 90,
      'with_runtime.lte': 120,
      with_original_language: 'en',
    });
  });

  it('usa os campos de data de séries', () => {
    const { path, params } = toDiscoverRequest(parse('tipo=serie&anoDe=2015'));
    expect(path).toBe('/discover/tv');
    expect(params['first_air_date.gte']).toBe('2015-01-01');
  });

  it('ordenar por nota exige 200 votos', () => {
    expect(toDiscoverRequest(parse('ordem=nota')).params).toMatchObject({ sort_by: 'vote_average.desc', 'vote_count.gte': 200 });
  });

  it('mais recentes não mostra lançamentos futuros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    expect(toDiscoverRequest(parse('tipo=serie&ordem=recentes')).params).toMatchObject({
      sort_by: 'first_air_date.desc', 'first_air_date.lte': '2026-10-08',
    });
  });

  it('humor aplica gêneros e nota mínima do humor', () => {
    expect(toDiscoverRequest(parse('humor=relaxar')).params).toMatchObject({ with_genres: '35|10751|16', 'vote_average.gte': 7 });
  });

  it('gêneros da pessoa substituem os do humor e vale a maior nota', () => {
    expect(toDiscoverRequest(parse('humor=relaxar&genero=12&nota=8')).params).toMatchObject({ with_genres: '12', 'vote_average.gte': 8 });
  });

  it('inclui as palavras-chave já resolvidas', () => {
    expect(toDiscoverRequest(parse('humor=fe'), { keywordIds: [10, 20] }).params.with_keywords).toBe('10|20');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/explore-params.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/explore-params.js`:

```js
import { ALL_PROVIDER_IDS } from '@/lib/providers';
import { getMood } from '@/lib/moods';

const ORDERS = ['popularidade', 'nota', 'recentes'];
const DURATIONS = { curto: { lte: 90 }, medio: { gte: 90, lte: 120 }, longo: { gte: 120 } };

function getAll(sp, key) {
  if (!sp) return [];
  if (typeof sp.getAll === 'function') return sp.getAll(key);
  const value = sp[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const get = (sp, key) => getAll(sp, key)[0] ?? null;

function intList(sp, key) {
  return getAll(sp, key)
    .flatMap((v) => String(v).split(','))
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

function year(value) {
  const n = Number(value);
  return value && Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
}

export function parseExploreParams(sp) {
  const tipo = get(sp, 'tipo') === 'serie' ? 'serie' : 'filme';
  let anoDe = year(get(sp, 'anoDe'));
  let anoAte = year(get(sp, 'anoAte'));
  if (anoDe && anoAte && anoDe > anoAte) [anoDe, anoAte] = [anoAte, anoDe];

  const notaRaw = get(sp, 'nota');
  const notaNum = Number(notaRaw);
  const nota = notaRaw !== null && notaRaw !== '' && Number.isFinite(notaNum) && notaNum >= 0 && notaNum <= 10
    ? notaNum : null;

  const duracaoRaw = get(sp, 'duracao');
  const idiomaRaw = get(sp, 'idioma') || '';
  const ordemRaw = get(sp, 'ordem');
  const humorRaw = get(sp, 'humor');

  return {
    tipo,
    plataformas: intList(sp, 'plataforma').filter((id) => ALL_PROVIDER_IDS.includes(id)),
    generos: intList(sp, 'genero'),
    anoDe,
    anoAte,
    nota,
    duracao: tipo === 'filme' && DURATIONS[duracaoRaw] ? duracaoRaw : null,
    idioma: /^[a-z]{2}$/.test(idiomaRaw) ? idiomaRaw : null,
    ordem: ORDERS.includes(ordemRaw) ? ordemRaw : 'popularidade',
    humor: getMood(humorRaw) ? humorRaw : null,
    pagina: Math.min(Math.max(parseInt(get(sp, 'pagina'), 10) || 1, 1), 500),
  };
}

export function toExploreQuery(f) {
  const q = new URLSearchParams();
  if (f.tipo === 'serie') q.set('tipo', 'serie');
  if (f.humor) q.set('humor', f.humor);
  if (f.plataformas?.length) q.set('plataforma', f.plataformas.join(','));
  if (f.generos?.length) q.set('genero', f.generos.join(','));
  if (f.anoDe) q.set('anoDe', f.anoDe);
  if (f.anoAte) q.set('anoAte', f.anoAte);
  if (f.nota !== null && f.nota !== undefined) q.set('nota', f.nota);
  if (f.duracao) q.set('duracao', f.duracao);
  if (f.idioma) q.set('idioma', f.idioma);
  if (f.ordem && f.ordem !== 'popularidade') q.set('ordem', f.ordem);
  if (f.pagina > 1) q.set('pagina', f.pagina);
  return q.toString();
}

const today = () => new Date().toISOString().slice(0, 10);

export function toDiscoverRequest(filters, { myProviders = [], keywordIds = [] } = {}) {
  const isMovie = filters.tipo === 'filme';
  const mood = filters.humor ? getMood(filters.humor) : null;
  const moodCfg = mood ? (isMovie ? mood.movie : mood.tv) : null;
  const dateField = isMovie ? 'primary_release_date' : 'first_air_date';

  const providers = filters.plataformas.length ? filters.plataformas
    : myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const params = { page: filters.pagina, with_watch_providers: providers.join('|') };

  const genres = filters.generos.length ? filters.generos : moodCfg?.genres ?? [];
  if (genres.length) params.with_genres = genres.join('|');
  if (keywordIds.length) params.with_keywords = keywordIds.join('|');

  const minRating = Math.max(filters.nota ?? 0, moodCfg?.minRating ?? 0);
  if (minRating > 0) params['vote_average.gte'] = minRating;

  if (filters.anoDe) params[`${dateField}.gte`] = `${filters.anoDe}-01-01`;
  if (filters.anoAte) params[`${dateField}.lte`] = `${filters.anoAte}-12-31`;

  if (filters.duracao) {
    const d = DURATIONS[filters.duracao];
    if (d.gte) params['with_runtime.gte'] = d.gte;
    if (d.lte) params['with_runtime.lte'] = d.lte;
  }
  if (filters.idioma) params.with_original_language = filters.idioma;

  if (filters.ordem === 'nota') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 200;
  } else if (filters.ordem === 'recentes') {
    params.sort_by = `${dateField}.desc`;
    if (!filters.anoAte) params[`${dateField}.lte`] = today();
  } else {
    params.sort_by = 'popularity.desc';
  }

  return { path: isMovie ? '/discover/movie' : '/discover/tv', params };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/explore-params.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/explore-params.js tests/unit/explore-params.test.js
git commit -m "feat: leitura e conversão dos filtros do Explorar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Consultas do catálogo

**Files:**
- Create: `lib/tmdb/catalog.js`, `tests/helpers/mock-tmdb.js`
- Test: `tests/unit/catalog.test.js`

**Interfaces:**
- Consumes: `tmdbFetch` (Tarefa 2), `normalizeTitle` (Tarefa 3), `PROVIDERS`, `ALL_PROVIDER_IDS`, `GENRE_ROWS`, `getMood` (Tarefa 4), `pickTrailer`, `brazilCertification` (Tarefa 5), `toDiscoverRequest` (Tarefa 6)
- Produces:
  - `CACHE = { rows: 21600, details: 86400, lists: 86400, keywords: 604800 }`
  - `discoverMixed({ providers: number[], movieGenre?: number|null, tvGenre?: number|null }): Promise<Title[]>`. `undefined` = sem filtro de gênero; `null` = não buscar aquele tipo. Até 20 títulos, por popularidade.
  - `getHomeData(myProviders?: number[]): Promise<{ hero: (Title & { trailerKey: string|null })[], rows: { key, title, href, items: Title[] }[] }>`
  - `filterAvailable(titles: Title[]): Promise<Title[]>` (só os que têm `flatrate` no Brasil)
  - `searchAvailable(query: string, page?: number): Promise<{ results: Title[], totalPages: number }>`
  - `resolveKeywordIds(names: string[]): Promise<number[]>`
  - `discoverPage(filters: Filters, opts?: { myProviders?: number[] }): Promise<{ results: Title[], totalPages: number }>`
  - `getTitleDetails(type: 'movie'|'tv', id: string|number): Promise<TitleDetails|null>`; `null` = mostrar "Não encontrado"
  - `TitleDetails = Title & { genres: string[], runtime: number|null, seasons: number|null, certification: string|null, cast: { id, name, character, profilePath }[], trailerKey: string|null, providers: { id, name, logoPath }[], watchLink: string|null, recommendations: Title[] }`
  - `getGenreLists(): Promise<{ filme: {id,name}[], serie: {id,name}[] }>`
  - Ajudante de teste `mockTmdb(routes)` (ver Step 1)

- [ ] **Step 1: Ajudante de teste para simular o TMDB**

`tests/helpers/mock-tmdb.js`:

```js
import { vi } from 'vitest';

// routes: { '/caminho': corpo | status | (url) => corpo | status }. Caminhos sem rota respondem 404.
export function mockTmdb(routes) {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-teste');
  vi.stubEnv('TMDB_BASE_URL', 'https://tmdb.teste/3');
  const fetchMock = vi.fn(async (input) => {
    const url = new URL(input);
    const route = routes[url.pathname.replace(/^\/3/, '')];
    const body = typeof route === 'function' ? route(url) : route;
    if (body === undefined) return new Response('{}', { status: 404 });
    if (typeof body === 'number') return new Response('{}', { status: body });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const calledPaths = (fetchMock) => fetchMock.mock.calls.map(([u]) => new URL(u).pathname.replace(/^\/3/, ''));
```

- [ ] **Step 2: Escrever os testes que falham**

`tests/unit/catalog.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mockTmdb, calledPaths } from '../helpers/mock-tmdb';
import {
  discoverMixed, getHomeData, searchAvailable, discoverPage, getTitleDetails, resolveKeywordIds,
} from '@/lib/tmdb/catalog';
import { parseExploreParams } from '@/lib/explore-params';
import { PROVIDERS } from '@/lib/providers';

const movie = (id, popularity, extra = {}) => ({ id, title: `Filme ${id}`, popularity, backdrop_path: `/b${id}.jpg`, ...extra });
const tv = (id, popularity) => ({ id, name: `Série ${id}`, popularity, backdrop_path: `/b${id}.jpg` });
const available = { results: { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } };
const unavailable = { results: { BR: { rent: [{ provider_id: 2 }] } } };

describe('discoverMixed', () => {
  it('junta filmes e séries por popularidade, até 20', async () => {
    mockTmdb({
      '/discover/movie': { results: Array.from({ length: 15 }, (_, i) => movie(i + 1, i)) },
      '/discover/tv': { results: Array.from({ length: 15 }, (_, i) => tv(100 + i, i + 0.5)) },
    });
    const items = await discoverMixed({ providers: [8] });
    expect(items).toHaveLength(20);
    expect(items[0]).toMatchObject({ id: 114, type: 'tv' });
    expect(items[1]).toMatchObject({ id: 15, type: 'movie' });
  });

  it('não busca séries quando tvGenre é null e filtra pelo gênero', async () => {
    const fetchMock = mockTmdb({ '/discover/movie': { results: [movie(1, 1)] } });
    await discoverMixed({ providers: [8, 119], movieGenre: 27, tvGenre: null });
    expect(calledPaths(fetchMock)).toEqual(['/discover/movie']);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('with_genres')).toBe('27');
    expect(url.searchParams.get('with_watch_providers')).toBe('8|119');
  });
});

describe('getHomeData', () => {
  it('omite só a fileira que falhou e monta o destaque com trailer', async () => {
    mockTmdb({
      '/discover/movie': (url) => (url.searchParams.get('with_watch_providers') === '8' ? 500 : { results: [movie(1, 9)] }),
      '/discover/tv': (url) => (url.searchParams.get('with_watch_providers') === '8' ? 500 : { results: [tv(2, 1)] }),
      '/movie/1/videos': { results: [{ key: 'k1', site: 'YouTube', iso_639_1: 'pt', type: 'Trailer' }] },
      '/tv/2/videos': { results: [] },
    });
    const { hero, rows } = await getHomeData();
    expect(rows.find((r) => r.key === 'plataforma-8')).toBeUndefined();
    expect(rows.find((r) => r.key === 'plataforma-119')).toMatchObject({ title: 'Em alta na Amazon Prime Video', href: '/explorar?plataforma=119' });
    expect(rows.find((r) => r.key === 'genero-terror')).toMatchObject({ title: 'Terror', href: '/explorar?genero=27' });
    expect(hero[0]).toMatchObject({ id: 1, trailerKey: 'k1' });
    expect(hero[1]).toMatchObject({ id: 2, trailerKey: null });
  });

  it('com Meus streamings mostra só as fileiras dessas plataformas', async () => {
    mockTmdb({ '/discover/movie': { results: [movie(1, 1)] }, '/discover/tv': { results: [] }, '/movie/1/videos': { results: [] } });
    const { rows } = await getHomeData([337]);
    const platformRows = rows.filter((r) => r.key.startsWith('plataforma-'));
    expect(platformRows.map((r) => r.key)).toEqual(['plataforma-337']);
    expect(PROVIDERS.length).toBeGreaterThan(1);
  });
});

describe('searchAvailable', () => {
  it('não chama o TMDB com menos de 2 caracteres', async () => {
    const fetchMock = mockTmdb({});
    await expect(searchAvailable(' a ')).resolves.toEqual({ results: [], totalPages: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantém só filmes e séries disponíveis em assinatura', async () => {
    mockTmdb({
      '/search/multi': {
        total_pages: 1,
        results: [
          { id: 1, media_type: 'movie', title: 'Disponível' },
          { id: 2, media_type: 'movie', title: 'Só aluguel' },
          { id: 3, media_type: 'person', name: 'Pessoa' },
          { id: 4, media_type: 'tv', name: 'Série disponível' },
        ],
      },
      '/movie/1/watch/providers': available,
      '/movie/2/watch/providers': unavailable,
      '/tv/4/watch/providers': available,
    });
    const { results } = await searchAvailable('Disp');
    expect(results.map((t) => t.title)).toEqual(['Disponível', 'Série disponível']);
  });
});

describe('resolveKeywordIds', () => {
  it('converte nomes exatos em IDs e ignora os não encontrados', async () => {
    mockTmdb({
      '/search/keyword': (url) => ({
        faith: { results: [{ id: 10, name: 'Faith' }, { id: 11, name: 'faith healing' }] },
        bible: { results: [{ id: 20, name: 'bible' }] },
        inexistente: { results: [] },
      })[url.searchParams.get('query')],
    });
    await expect(resolveKeywordIds(['faith', 'bible', 'inexistente'])).resolves.toEqual([10, 20]);
  });
});

describe('discoverPage', () => {
  it('resolve as palavras-chave do humor antes de buscar', async () => {
    const fetchMock = mockTmdb({
      '/search/keyword': { results: [{ id: 10, name: 'faith' }] },
      '/discover/movie': { total_pages: 3, results: [movie(1, 1)] },
    });
    const page = await discoverPage(parseExploreParams(new URLSearchParams('humor=fe')));
    expect(page.totalPages).toBe(3);
    expect(page.results[0]).toMatchObject({ id: 1, type: 'movie' });
    const discoverCall = fetchMock.mock.calls.find(([u]) => u.toString().includes('/discover/movie'));
    expect(new URL(discoverCall[0]).searchParams.get('with_keywords')).toBe('10');
  });

  it('humor só de filmes com tipo série devolve vazio sem chamar o TMDB', async () => {
    const fetchMock = mockTmdb({});
    await expect(discoverPage(parseExploreParams(new URLSearchParams('humor=medo&tipo=serie'))))
      .resolves.toEqual({ results: [], totalPages: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('humor por palavra-chave sem nenhuma encontrada devolve vazio', async () => {
    mockTmdb({ '/search/keyword': { results: [] } });
    await expect(discoverPage(parseExploreParams(new URLSearchParams('humor=fe'))))
      .resolves.toEqual({ results: [], totalPages: 0 });
  });
});

describe('getTitleDetails', () => {
  const details = {
    id: 101, title: 'Aventura Neon', release_date: '2024-05-10', runtime: 128, genres: [{ id: 28, name: 'Ação' }],
    credits: { cast: Array.from({ length: 15 }, (_, i) => ({ id: i, name: `Ator ${i}`, character: `P${i}`, profile_path: null })) },
    videos: { results: [{ key: 'abc', site: 'YouTube', iso_639_1: 'pt', type: 'Trailer' }] },
    'watch/providers': { results: { BR: { link: 'https://tmdb/watch', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } },
    release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '12' }] }] },
    recommendations: { results: [{ id: 102, media_type: 'movie', title: 'Rec ok' }, { id: 103, media_type: 'movie', title: 'Rec fora' }] },
  };

  it('monta os detalhes completos de um filme', async () => {
    mockTmdb({ '/movie/101': details, '/movie/102/watch/providers': available, '/movie/103/watch/providers': unavailable });
    const t = await getTitleDetails('movie', '101');
    expect(t).toMatchObject({
      id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, runtime: 128, seasons: null,
      genres: ['Ação'], certification: '12', trailerKey: 'abc', watchLink: 'https://tmdb/watch',
      providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
    });
    expect(t.cast).toHaveLength(12);
    expect(t.recommendations.map((r) => r.title)).toEqual(['Rec ok']);
  });

  it('pede os dados extras numa só chamada', async () => {
    const fetchMock = mockTmdb({ '/tv/201': { ...details, id: 201, name: 'Série' } });
    await getTitleDetails('tv', 201);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('append_to_response')).toBe('credits,videos,watch/providers,content_ratings,recommendations');
    expect(url.searchParams.get('include_video_language')).toBe('pt,en');
  });

  it('devolve null para ID inexistente, não numérico ou fora das assinaturas', async () => {
    const fetchMock = mockTmdb({ '/movie/5': { ...details, id: 5, 'watch/providers': unavailable } });
    await expect(getTitleDetails('movie', '999')).resolves.toBeNull();
    await expect(getTitleDetails('movie', 'abc')).resolves.toBeNull();
    await expect(getTitleDetails('movie', '5')).resolves.toBeNull();
    expect(calledPaths(fetchMock)).not.toContain('/movie/abc');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/unit/catalog.test.js`
Expected: FAIL, importação de `@/lib/tmdb/catalog` não encontrada.

- [ ] **Step 4: Implementar**

`lib/tmdb/catalog.js`:

```js
import { tmdbFetch } from './client';
import { normalizeTitle } from './normalize';
import { ALL_PROVIDER_IDS, PROVIDERS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { getMood } from '@/lib/moods';
import { toDiscoverRequest } from '@/lib/explore-params';
import { pickTrailer } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';

const HOUR = 3600;
export const CACHE = { rows: 6 * HOUR, details: 24 * HOUR, lists: 24 * HOUR, keywords: 7 * 24 * HOUR };
const ROW_SIZE = 20;
const HERO_SIZE = 5;

async function discover(type, params) {
  const data = await tmdbFetch(`/discover/${type}`, params, { revalidate: CACHE.rows });
  return (data.results ?? []).map((r) => normalizeTitle(r, type));
}

export async function discoverMixed({ providers, movieGenre, tvGenre }) {
  const base = { with_watch_providers: providers.join('|'), sort_by: 'popularity.desc' };
  const requests = [];
  if (movieGenre !== null) requests.push(discover('movie', movieGenre ? { ...base, with_genres: movieGenre } : base));
  if (tvGenre !== null) requests.push(discover('tv', tvGenre ? { ...base, with_genres: tvGenre } : base));
  const lists = await Promise.all(requests);
  return lists.flat().sort((a, b) => b.popularity - a.popularity).slice(0, ROW_SIZE);
}

async function getHeroItems(providers) {
  const top = (await discoverMixed({ providers })).filter((t) => t.backdropPath).slice(0, HERO_SIZE);
  const videos = await Promise.allSettled(
    top.map((t) => tmdbFetch(`/${t.type}/${t.id}/videos`, { include_video_language: 'pt,en' }, { revalidate: CACHE.details })),
  );
  return top.map((t, i) => ({
    ...t,
    trailerKey: videos[i].status === 'fulfilled' ? pickTrailer(videos[i].value.results) : null,
  }));
}

export async function getHomeData(myProviders = []) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const rowDefs = [
    ...PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => ({
      key: `plataforma-${p.id}`,
      title: `Em alta na ${p.name}`,
      href: `/explorar?plataforma=${p.id}`,
      load: () => discoverMixed({ providers: [p.id] }),
    })),
    ...GENRE_ROWS.map((g) => ({
      key: `genero-${g.slug}`,
      title: g.label,
      href: `/explorar?genero=${g.movie}`,
      load: () => discoverMixed({ providers, movieGenre: g.movie, tvGenre: g.tv }),
    })),
  ];

  const [heroResult, ...rowResults] = await Promise.allSettled([getHeroItems(providers), ...rowDefs.map((d) => d.load())]);
  const rows = rowDefs
    .map((d, i) => ({ key: d.key, title: d.title, href: d.href, items: rowResults[i].status === 'fulfilled' ? rowResults[i].value : [] }))
    .filter((r) => r.items.length > 0);
  return { hero: heroResult.status === 'fulfilled' ? heroResult.value : [], rows };
}

async function getBrazilFlatrate(type, id) {
  const data = await tmdbFetch(`/${type}/${id}/watch/providers`, {}, { revalidate: CACHE.details });
  return data.results?.BR?.flatrate ?? [];
}

export async function filterAvailable(titles) {
  const checks = await Promise.allSettled(titles.map((t) => getBrazilFlatrate(t.type, t.id)));
  return titles.filter((_, i) => checks[i].status === 'fulfilled' && checks[i].value.length > 0);
}

export async function searchAvailable(query, page = 1) {
  const q = (query ?? '').trim();
  if (q.length < 2) return { results: [], totalPages: 0 };
  const data = await tmdbFetch('/search/multi', { query: q, page });
  const titles = (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => normalizeTitle(r));
  return { results: await filterAvailable(titles), totalPages: data.total_pages ?? 1 };
}

export async function resolveKeywordIds(names = []) {
  const responses = await Promise.allSettled(
    names.map((name) => tmdbFetch('/search/keyword', { query: name }, { revalidate: CACHE.keywords })),
  );
  return responses.flatMap((r, i) => {
    if (r.status !== 'fulfilled') return [];
    const match = (r.value.results ?? []).find((k) => k.name.toLowerCase() === names[i].toLowerCase());
    return match ? [match.id] : [];
  });
}

export async function discoverPage(filters, { myProviders = [] } = {}) {
  const type = filters.tipo === 'filme' ? 'movie' : 'tv';
  const mood = filters.humor ? getMood(filters.humor) : null;
  const moodCfg = mood ? mood[type] : null;
  if (mood && !moodCfg) return { results: [], totalPages: 0 };

  let keywordIds = [];
  if (moodCfg?.keywords?.length) {
    keywordIds = await resolveKeywordIds(moodCfg.keywords);
    if (!keywordIds.length) return { results: [], totalPages: 0 };
  }

  const { path, params } = toDiscoverRequest(filters, { myProviders, keywordIds });
  const data = await tmdbFetch(path, params, { revalidate: CACHE.rows });
  return {
    results: (data.results ?? []).map((r) => normalizeTitle(r, type)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

const APPEND = {
  movie: 'credits,videos,watch/providers,release_dates,recommendations',
  tv: 'credits,videos,watch/providers,content_ratings,recommendations',
};

export async function getTitleDetails(type, id) {
  if (!/^\d+$/.test(String(id))) return null;
  let raw;
  try {
    raw = await tmdbFetch(`/${type}/${id}`, { append_to_response: APPEND[type], include_video_language: 'pt,en' }, { revalidate: CACHE.details });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }

  const br = raw['watch/providers']?.results?.BR;
  const providers = (br?.flatrate ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path || null }));
  if (!providers.length) return null;

  const recommendations = (raw.recommendations?.results ?? []).slice(0, 20).map((r) => normalizeTitle(r, type));
  return {
    ...normalizeTitle(raw, type),
    genres: (raw.genres ?? []).map((g) => g.name),
    runtime: type === 'movie' ? raw.runtime || null : null,
    seasons: type === 'tv' ? raw.number_of_seasons || null : null,
    certification: brazilCertification(raw, type),
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id, name: c.name, character: c.character || '', profilePath: c.profile_path || null,
    })),
    trailerKey: pickTrailer(raw.videos?.results),
    providers,
    watchLink: br?.link ?? null,
    recommendations: await filterAvailable(recommendations),
  };
}

export async function getGenreLists() {
  const [movie, tv] = await Promise.all([
    tmdbFetch('/genre/movie/list', {}, { revalidate: CACHE.lists }),
    tmdbFetch('/genre/tv/list', {}, { revalidate: CACHE.lists }),
  ]);
  return { filme: movie.genres ?? [], serie: tv.genres ?? [] };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/catalog.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/catalog.js tests/helpers/mock-tmdb.js tests/unit/catalog.test.js
git commit -m "feat: consultas do catálogo (Início, Explorar, busca e detalhes)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Preferências e script de tema

**Files:**
- Create: `lib/preferences.js`, `lib/theme-bootstrap.js`
- Test: `tests/unit/preferences.test.js`

**Interfaces:**
- Consumes: `ALL_PROVIDER_IDS` (Tarefa 4)
- Produces:
  - `STORAGE_KEY = 'catalogo:prefs'`, `PROVIDERS_COOKIE = 'catalogo_streamings'`, `PREFS_VERSION = 1`
  - `Prefs = { version: 1, theme: 'sistema'|'escuro'|'claro'|'noturno', brightness: number (20–100), textSize: 'normal'|'grande'|'muito-grande', calm: boolean, highContrast: boolean, openingSound: boolean, myProviders: number[] }`
  - `defaultPrefs(): Prefs`, `parsePrefs(raw: string|object|null): Prefs`
  - `loadPrefs(storage: Storage|null): Prefs`, `savePrefs(storage: Storage|null, prefs: Prefs): boolean`
  - `resolveTheme(prefs, systemPrefersDark: boolean): 'escuro'|'claro'|'noturno'`
  - `rootAttributes(prefs, resolvedTheme): Record<string,string>` (atributos `data-*` do `<html>`)
  - `nightOverlayOpacity(prefs, resolvedTheme): number` (0 fora do Noturno)
  - `shouldAutoplayTrailer(prefs)`, `shouldRotateHero(prefs)`, `shouldPlayOpeningSound(prefs, resolvedTheme)`: boolean
  - `providersCookieValue(ids: number[]): string` (IDs separados por ponto), `parseProvidersCookie(value?: string): number[]`, `writeProvidersCookie(ids: number[]): void`
  - `bootstrapTheme(): void` e `THEME_SCRIPT: string` (em `lib/theme-bootstrap.js`)

O cookie separa os IDs com **ponto** (`8.119`) porque vírgula não é permitida em valores de cookie.

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/preferences.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  STORAGE_KEY, defaultPrefs, parsePrefs, loadPrefs, savePrefs, resolveTheme, rootAttributes,
  nightOverlayOpacity, shouldAutoplayTrailer, shouldRotateHero, shouldPlayOpeningSound,
  providersCookieValue, parseProvidersCookie, writeProvidersCookie,
} from '@/lib/preferences';
import { bootstrapTheme, THEME_SCRIPT } from '@/lib/theme-bootstrap';

describe('parsePrefs', () => {
  it('sem nada salvo usa o padrão', () => {
    expect(parsePrefs(null)).toEqual({
      version: 1, theme: 'sistema', brightness: 60, textSize: 'normal',
      calm: false, highContrast: false, openingSound: true, myProviders: [],
    });
  });

  it('lê preferências válidas', () => {
    const saved = { version: 1, theme: 'noturno', brightness: 35, textSize: 'grande', calm: true, highContrast: true, openingSound: false, myProviders: [8, 119] };
    expect(parsePrefs(JSON.stringify(saved))).toEqual(saved);
  });

  it('JSON corrompido ou versão antiga voltam ao padrão', () => {
    expect(parsePrefs('{quebrado')).toEqual(defaultPrefs());
    expect(parsePrefs(JSON.stringify({ version: 0, theme: 'claro' }))).toEqual(defaultPrefs());
  });

  it('corrige valores fora da faixa ou desconhecidos', () => {
    const p = parsePrefs(JSON.stringify({ version: 1, theme: 'roxo', brightness: 500, textSize: 'gigante', calm: 'sim', myProviders: [8, 999, 'x'] }));
    expect(p).toMatchObject({ theme: 'sistema', brightness: 100, textSize: 'normal', calm: false, myProviders: [8] });
    expect(parsePrefs(JSON.stringify({ version: 1, brightness: 1 })).brightness).toBe(20);
    expect(parsePrefs(JSON.stringify({ version: 1, brightness: 'x' })).brightness).toBe(60);
  });

  it('defaultPrefs devolve uma cópia nova a cada vez', () => {
    const a = defaultPrefs();
    a.myProviders.push(8);
    expect(defaultPrefs().myProviders).toEqual([]);
  });
});

describe('armazenamento', () => {
  it('salva e carrega do localStorage', () => {
    const prefs = { ...defaultPrefs(), theme: 'claro' };
    expect(savePrefs(localStorage, prefs)).toBe(true);
    expect(loadPrefs(localStorage)).toEqual(prefs);
  });

  it('armazenamento bloqueado não quebra', () => {
    const blocked = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(loadPrefs(blocked)).toEqual(defaultPrefs());
    expect(savePrefs(blocked, defaultPrefs())).toBe(false);
    expect(loadPrefs(null)).toEqual(defaultPrefs());
  });
});

describe('comportamento por modo', () => {
  const base = defaultPrefs();

  it('resolve o tema do sistema', () => {
    expect(resolveTheme(base, true)).toBe('escuro');
    expect(resolveTheme(base, false)).toBe('claro');
    expect(resolveTheme({ ...base, theme: 'noturno' }, false)).toBe('noturno');
  });

  it('gera os atributos do <html>', () => {
    expect(rootAttributes({ ...base, textSize: 'grande', calm: true }, 'claro')).toEqual({
      'data-theme': 'claro', 'data-text': 'grande', 'data-calm': 'true', 'data-contrast': 'false',
    });
  });

  it('escurece só no Noturno', () => {
    expect(nightOverlayOpacity({ ...base, brightness: 40 }, 'noturno')).toBeCloseTo(0.6);
    expect(nightOverlayOpacity({ ...base, brightness: 100 }, 'noturno')).toBe(0);
    expect(nightOverlayOpacity({ ...base, brightness: 40 }, 'escuro')).toBe(0);
  });

  it('Modo sensorial calmo desliga trailer automático e troca do destaque', () => {
    expect(shouldAutoplayTrailer(base)).toBe(true);
    expect(shouldRotateHero(base)).toBe(true);
    expect(shouldAutoplayTrailer({ ...base, calm: true })).toBe(false);
    expect(shouldRotateHero({ ...base, calm: true })).toBe(false);
  });

  it('som de abertura respeita a opção, o Noturno e o Modo calmo', () => {
    expect(shouldPlayOpeningSound(base, 'escuro')).toBe(true);
    expect(shouldPlayOpeningSound(base, 'noturno')).toBe(false);
    expect(shouldPlayOpeningSound({ ...base, calm: true }, 'claro')).toBe(false);
    expect(shouldPlayOpeningSound({ ...base, openingSound: false }, 'claro')).toBe(false);
  });
});

describe('cookie de Meus streamings', () => {
  it('ida e volta, ignorando IDs desconhecidos', () => {
    expect(providersCookieValue([8, 119])).toBe('8.119');
    expect(parseProvidersCookie('8.119.999.x')).toEqual([8, 119]);
    expect(parseProvidersCookie(undefined)).toEqual([]);
  });

  it('grava o cookie no documento', () => {
    writeProvidersCookie([8]);
    expect(document.cookie).toContain('catalogo_streamings=8');
  });
});

describe('bootstrapTheme', () => {
  it('aplica as preferências salvas antes da página aparecer', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, theme: 'noturno', textSize: 'muito-grande', calm: true, highContrast: true }));
    bootstrapTheme();
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('noturno');
    expect(root.getAttribute('data-text')).toBe('muito-grande');
    expect(root.getAttribute('data-calm')).toBe('true');
    expect(root.getAttribute('data-contrast')).toBe('true');
  });

  it('sem preferências segue o sistema', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    bootstrapTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
  });

  it('JSON corrompido não quebra', () => {
    localStorage.setItem(STORAGE_KEY, '{quebrado');
    expect(() => bootstrapTheme()).not.toThrow();
    expect(document.documentElement.getAttribute('data-text')).toBe('normal');
  });

  it('THEME_SCRIPT é um script autônomo que roda sozinho', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, theme: 'claro' }));
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('claro');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/preferences.test.js`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`lib/preferences.js`:

```js
import { ALL_PROVIDER_IDS } from '@/lib/providers';

export const STORAGE_KEY = 'catalogo:prefs';
export const PROVIDERS_COOKIE = 'catalogo_streamings';
export const PREFS_VERSION = 1;
const THEMES = ['escuro', 'claro', 'noturno'];
const TEXT_SIZES = ['normal', 'grande', 'muito-grande'];

export function defaultPrefs() {
  return {
    version: PREFS_VERSION, theme: 'sistema', brightness: 60, textSize: 'normal',
    calm: false, highContrast: false, openingSound: true, myProviders: [],
  };
}

export function parsePrefs(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return defaultPrefs();
  }
  if (!data || typeof data !== 'object' || data.version !== PREFS_VERSION) return defaultPrefs();

  const brightness = Number(data.brightness);
  return {
    version: PREFS_VERSION,
    theme: THEMES.includes(data.theme) ? data.theme : 'sistema',
    brightness: Number.isFinite(brightness) ? Math.min(100, Math.max(20, Math.round(brightness))) : 60,
    textSize: TEXT_SIZES.includes(data.textSize) ? data.textSize : 'normal',
    calm: data.calm === true,
    highContrast: data.highContrast === true,
    openingSound: data.openingSound !== false,
    myProviders: Array.isArray(data.myProviders) ? data.myProviders.filter((id) => ALL_PROVIDER_IDS.includes(id)) : [],
  };
}

export function loadPrefs(storage) {
  try {
    return parsePrefs(storage ? storage.getItem(STORAGE_KEY) : null);
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(storage, prefs) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function resolveTheme(prefs, systemPrefersDark) {
  if (prefs.theme !== 'sistema') return prefs.theme;
  return systemPrefersDark ? 'escuro' : 'claro';
}

export function rootAttributes(prefs, resolvedTheme) {
  return {
    'data-theme': resolvedTheme,
    'data-text': prefs.textSize,
    'data-calm': String(prefs.calm),
    'data-contrast': String(prefs.highContrast),
  };
}

export function nightOverlayOpacity(prefs, resolvedTheme) {
  return resolvedTheme === 'noturno' ? (100 - prefs.brightness) / 100 : 0;
}

export const shouldAutoplayTrailer = (prefs) => !prefs.calm;
export const shouldRotateHero = (prefs) => !prefs.calm;
export const shouldPlayOpeningSound = (prefs, resolvedTheme) =>
  prefs.openingSound && !prefs.calm && resolvedTheme !== 'noturno';

export function providersCookieValue(ids) {
  return ids.join('.');
}

export function parseProvidersCookie(value) {
  return (value || '').split('.').map(Number).filter((id) => ALL_PROVIDER_IDS.includes(id));
}

export function writeProvidersCookie(ids) {
  if (typeof document === 'undefined') return;
  document.cookie = `${PROVIDERS_COOKIE}=${providersCookieValue(ids)}; path=/; max-age=31536000; SameSite=Lax`;
}
```

`lib/theme-bootstrap.js`:

```js
// Roda no <head>, antes da primeira pintura, para a tela não piscar em branco.
// Precisa ser autônoma: é convertida em texto com toString(), então não pode usar importações.
export function bootstrapTheme() {
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem('catalogo:prefs')) || {};
  } catch (e) {
    prefs = {};
  }
  if (prefs.version !== 1) prefs = {};
  var themes = ['escuro', 'claro', 'noturno'];
  var sizes = ['normal', 'grande', 'muito-grande'];
  var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var theme = themes.indexOf(prefs.theme) >= 0 ? prefs.theme : systemDark ? 'escuro' : 'claro';
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-text', sizes.indexOf(prefs.textSize) >= 0 ? prefs.textSize : 'normal');
  root.setAttribute('data-calm', String(prefs.calm === true));
  root.setAttribute('data-contrast', String(prefs.highContrast === true));
}

export const THEME_SCRIPT = `(${bootstrapTheme.toString()})();`;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/preferences.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/preferences.js lib/theme-bootstrap.js tests/unit/preferences.test.js
git commit -m "feat: preferências salvas no navegador e script de tema sem piscar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Base visual, provedor de preferências, topo e rodapé

**Files:**
- Create: `components/settings/SettingsProvider.jsx`, `components/BrightnessOverlay.jsx`, `components/Header.jsx`, `components/Footer.jsx`, `tests/helpers/render-with-settings.jsx`, `public/tmdb-logo.svg`
- Modify (substituir todo o conteúdo): `app/globals.css`, `app/layout.jsx`, `app/page.jsx`
- Test: `tests/components/base.test.jsx`

**Interfaces:**
- Consumes: Tarefa 8 inteira, `APP_NAME` (Tarefa 1)
- Produces:
  - `<SettingsProvider>` e `useSettings(): { prefs: Prefs, resolvedTheme, updatePrefs(patch: Partial<Prefs>): void, loaded: boolean }`. `loaded` fica `false` até as preferências salvas serem lidas.
  - `<BrightnessOverlay />`, `<Header />`, `<Footer />`
  - Classes do Tailwind ligadas aos tokens: `bg-bg`, `bg-surface`, `bg-surface-2`, `text-fg`, `text-muted`, `text-accent`, `border-line`, `shadow-glow`; classe `neon-gradient`; variante `calm:`
  - Ajudante de teste `renderWithSettings(ui, prefs?)`

- [ ] **Step 1: Escrever os testes que falham**

`tests/helpers/render-with-settings.jsx`:

```jsx
import { render } from '@testing-library/react';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { STORAGE_KEY } from '@/lib/preferences';

export function renderWithSettings(ui, prefs) {
  if (prefs) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...prefs }));
  return render(<SettingsProvider>{ui}</SettingsProvider>);
}
```

`tests/components/base.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { useSettings } from '@/components/settings/SettingsProvider';
import { BrightnessOverlay } from '@/components/BrightnessOverlay';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { STORAGE_KEY } from '@/lib/preferences';

vi.mock('next/navigation', () => ({ usePathname: () => '/explorar', useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

function Probe() {
  const { resolvedTheme, loaded, updatePrefs } = useSettings();
  return (
    <>
      <p>tema:{resolvedTheme}:{String(loaded)}</p>
      <button onClick={() => updatePrefs({ theme: 'noturno', myProviders: [8] })}>mudar</button>
    </>
  );
}

describe('SettingsProvider', () => {
  it('carrega as preferências salvas e aplica no <html>', async () => {
    renderWithSettings(<Probe />, { theme: 'claro', calm: true, textSize: 'grande' });
    expect(await screen.findByText('tema:claro:true')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-calm', 'true');
    expect(document.documentElement).toHaveAttribute('data-text', 'grande');
  });

  it('salva as mudanças no navegador e no cookie', async () => {
    renderWithSettings(<Probe />);
    await screen.findByText(/:true$/);
    await userEvent.click(screen.getByRole('button', { name: 'mudar' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe('noturno'));
    expect(document.cookie).toContain('catalogo_streamings=8');
    expect(document.documentElement).toHaveAttribute('data-theme', 'noturno');
  });

  it('funciona com o armazenamento bloqueado', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    renderWithSettings(<Probe />);
    expect(await screen.findByText('tema:claro:true')).toBeInTheDocument();
  });
});

describe('BrightnessOverlay', () => {
  it('escurece a tela no Noturno conforme o brilho', async () => {
    renderWithSettings(<BrightnessOverlay />, { theme: 'noturno', brightness: 40 });
    const overlay = await screen.findByTestId('brightness-overlay');
    expect(overlay).toHaveStyle({ opacity: '0.6' });
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('não aparece fora do Noturno', async () => {
    renderWithSettings(<BrightnessOverlay />, { theme: 'escuro', brightness: 40 });
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'escuro'));
    expect(screen.queryByTestId('brightness-overlay')).not.toBeInTheDocument();
  });
});

describe('Header', () => {
  it('marca a página atual', () => {
    renderWithSettings(<Header />);
    expect(screen.getByRole('link', { name: 'Explorar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });
});

describe('Footer', () => {
  it('mostra os créditos obrigatórios do TMDB e do JustWatch', () => {
    renderWithSettings(<Footer />);
    expect(screen.getByText('Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TMDB' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com/br');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/base.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Provedor de preferências e sobreposição de brilho**

`components/settings/SettingsProvider.jsx`:

```jsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  defaultPrefs, loadPrefs, savePrefs, resolveTheme, rootAttributes, writeProvidersCookie,
} from '@/lib/preferences';

const SettingsContext = createContext(null);

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
}

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [systemDark, setSystemDark] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs(safeLocalStorage()));
    setSystemDark(systemPrefersDark());
    setLoaded(true);
  }, []);

  const resolvedTheme = resolveTheme(prefs, systemDark);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(rootAttributes(prefs, resolvedTheme))) root.setAttribute(name, value);
    savePrefs(safeLocalStorage(), prefs);
    writeProvidersCookie(prefs.myProviders);
  }, [prefs, resolvedTheme, loaded]);

  const updatePrefs = useCallback((patch) => setPrefs((current) => ({ ...current, ...patch })), []);
  const value = useMemo(() => ({ prefs, resolvedTheme, updatePrefs, loaded }), [prefs, resolvedTheme, updatePrefs, loaded]);

  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={prefs.calm ? 'always' : 'user'}>{children}</MotionConfig>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return context;
}
```

`components/BrightnessOverlay.jsx`:

```jsx
'use client';

import { useSettings } from '@/components/settings/SettingsProvider';
import { nightOverlayOpacity } from '@/lib/preferences';

// Camada preta por cima de tudo (inclusive vídeos), sem bloquear cliques.
export function BrightnessOverlay() {
  const { prefs, resolvedTheme } = useSettings();
  const opacity = nightOverlayOpacity(prefs, resolvedTheme);
  if (!opacity) return null;
  return (
    <div
      data-testid="brightness-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] bg-black"
      style={{ opacity }}
    />
  );
}
```

- [ ] **Step 4: Topo e rodapé**

`components/Header.jsx`:

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--header-bg)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-8">
        <Link href="/" className="neon-gradient bg-clip-text text-xl font-black text-transparent">
          {APP_NAME}
        </Link>
        <nav aria-label="Principal" className="flex gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="text-muted hover:text-fg aria-[current=page]:font-bold aria-[current=page]:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div data-slot="header-actions" className="ml-auto flex items-center gap-2" />
      </div>
    </header>
  );
}
```

`components/Footer.jsx`:

```jsx
export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-8 text-sm text-muted sm:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <img src="/tmdb-logo.svg" alt="TMDB" width="110" height="14" />
        </a>
        <p>
          Disponibilidade nos streamings fornecida pelo{' '}
          <a className="underline hover:text-fg" href="https://www.justwatch.com/br" target="_blank" rel="noreferrer">
            JustWatch
          </a>
          .
        </p>
      </div>
      <p className="mt-3">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
    </footer>
  );
}
```

Baixar o logo oficial do TMDB:

```bash
curl -L -o public/tmdb-logo.svg "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
head -c 80 public/tmdb-logo.svg
```

Expected: o arquivo começa com `<svg` ou `<?xml`. Se o endereço tiver mudado, baixar o logo "blue_short" em https://www.themoviedb.org/about/logos-attribution e salvar como `public/tmdb-logo.svg`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/components/base.test.jsx`
Expected: PASS.

- [ ] **Step 6: Estilos globais com os tokens de cada modo**

`app/globals.css` (substituir todo o conteúdo):

```css
@import "tailwindcss";

@custom-variant calm (&:where([data-calm="true"], [data-calm="true"] *));

:root,
[data-theme="escuro"] {
  --bg: #0d0820;
  --surface: #1a1033;
  --surface-2: #241646;
  --text: #f4f1fb;
  --muted: #b9b0cf;
  --accent: #8b5cf6;
  --accent-2: #ec4899;
  --border: rgb(255 255 255 / 0.12);
  --glow: 0 0 18px rgb(236 72 153 / 0.55);
  --header-bg: rgb(13 8 32 / 0.7);
}

[data-theme="claro"] {
  --bg: #f6f3fb;
  --surface: #ffffff;
  --surface-2: #ede7f8;
  --text: #1e1433;
  --muted: #5b5170;
  --accent: #7c3aed;
  --accent-2: #db2777;
  --border: rgb(30 20 51 / 0.12);
  --glow: 0 4px 14px rgb(124 58 237 / 0.25);
  --header-bg: rgb(255 255 255 / 0.8);
}

[data-theme="noturno"] {
  --bg: #05030a;
  --surface: #0f0a1a;
  --surface-2: #160f26;
  --text: #a59fb3;
  --muted: #8a8399;
  --accent: #8b7bc0;
  --accent-2: #a0708f;
  --border: rgb(255 255 255 / 0.08);
  --glow: none;
  --header-bg: rgb(5 3 10 / 0.9);
}

[data-calm="true"] {
  --glow: none;
}

[data-contrast="true"][data-theme="claro"] {
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-2: #f0f0f0;
  --text: #000000;
  --muted: #1a1a1a;
  --accent: #5b21b6;
  --accent-2: #9d174d;
  --border: #000000;
}

[data-contrast="true"]:not([data-theme="claro"]) {
  --bg: #000000;
  --surface: #000000;
  --surface-2: #141414;
  --text: #ffffff;
  --muted: #f0f0f0;
  --accent: #c4b5fd;
  --accent-2: #f9a8d4;
  --border: #ffffff;
}

html[data-text="grande"] { font-size: 125%; }
html[data-text="muito-grande"] { font-size: 150%; }

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-fg: var(--text);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-2: var(--accent-2);
  --color-line: var(--border);
  --shadow-glow: var(--glow);
}

body {
  background: var(--bg);
  color: var(--text);
}

:focus-visible {
  outline: 3px solid var(--accent-2);
  outline-offset: 2px;
}

/* @utility (e não uma classe comum) para aceitar variantes como has-checked:neon-gradient */
@utility neon-gradient {
  background-image: linear-gradient(90deg, var(--accent), var(--accent-2));
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

[data-calm="true"] *,
[data-calm="true"] *::before,
[data-calm="true"] *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

- [ ] **Step 7: Layout e Início provisório**

`app/layout.jsx` (substituir todo o conteúdo):

```jsx
import './globals.css';
import { THEME_SCRIPT } from '@/lib/theme-bootstrap';
import { APP_NAME } from '@/lib/brand';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BrightnessOverlay } from '@/components/BrightnessOverlay';

export const metadata = {
  title: APP_NAME,
  description: 'Filmes e séries incluídos nas assinaturas de streaming no Brasil.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-theme="escuro" data-text="normal" data-calm="false" data-contrast="false" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <SettingsProvider>
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
            Pular para o conteúdo
          </a>
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
          <BrightnessOverlay />
        </SettingsProvider>
      </body>
    </html>
  );
}
```

`app/page.jsx` (substituir todo o conteúdo; a Tarefa 14 monta o Início de verdade):

```jsx
export default function HomePage() {
  return <h1 className="p-8 text-3xl font-black">Início</h1>;
}
```

Apagar os arquivos de exemplo que o `create-next-app` deixou em `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`), se existirem.

- [ ] **Step 8: Verificar no navegador**

Run: `npm run dev` e abrir http://localhost:3000.
Expected: fundo azul-arroxeado escuro (ou lavanda se o sistema estiver no modo claro), topo com o nome em gradiente roxo-rosa, rodapé com o logo do TMDB. No console do navegador, rodar `localStorage.setItem('catalogo:prefs', JSON.stringify({version:1, theme:'noturno'}))` e recarregar: a página já abre quase preta, sem piscar claro.

- [ ] **Step 9: Rodar todos os testes e fazer o commit**

Run: `npm test` → Expected: todos passam.

```bash
git add -A
git commit -m "feat: base visual Neon com modos de cor, topo, rodapé e provedor de preferências" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Painel de Configurações

**Files:**
- Create: `components/settings/SettingsPanel.jsx`
- Modify: `components/Header.jsx` (botão ⚙️ que abre o painel)
- Test: `tests/components/settings-panel.test.jsx`

**Interfaces:**
- Consumes: `useSettings` (Tarefa 9), `PROVIDERS` (Tarefa 4), `writeProvidersCookie` (Tarefa 8)
- Produces: `<SettingsPanel open: boolean onClose: () => void />` (diálogo com o título "Configurações")

Ao marcar ou desmarcar uma plataforma em "Meus streamings", o painel grava o cookie na hora e chama `router.refresh()`, para o servidor montar o Início de novo já filtrado.

- [ ] **Step 1: Escrever os testes que falham**

`tests/components/settings-panel.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { STORAGE_KEY } from '@/lib/preferences';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => '/' }));

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

beforeEach(() => refresh.mockClear());

describe('SettingsPanel', () => {
  it('não mostra nada fechado', () => {
    renderWithSettings(<SettingsPanel open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('troca o modo de cor e mostra o brilho só no Noturno', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />, { theme: 'escuro' });
    const dialog = await screen.findByRole('dialog', { name: 'Configurações' });
    expect(screen.queryByRole('slider', { name: /Brilho/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Noturno 🔅' }));
    await waitFor(() => expect(saved().theme).toBe('noturno'));
    expect(screen.getByRole('slider', { name: /Brilho/ })).toHaveValue('60');
    expect(dialog).toBeInTheDocument();
  });

  it('ajusta o brilho do Noturno', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />, { theme: 'noturno' });
    const slider = await screen.findByRole('slider', { name: /Brilho/ });
    fireEvent.change(slider, { target: { value: '50' } });
    await waitFor(() => expect(saved().brightness).toBe(50));
  });

  it('liga as opções de acessibilidade', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Muito grande' }));
    await userEvent.click(screen.getByRole('switch', { name: /Modo sensorial calmo/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Alto contraste/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Som de abertura/ }));
    await waitFor(() => expect(saved()).toMatchObject({ textSize: 'muito-grande', calm: true, highContrast: true, openingSound: false }));
  });

  it('Meus streamings grava o cookie e atualiza a página', async () => {
    renderWithSettings(<SettingsPanel open onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Netflix' }));
    expect(document.cookie).toContain('catalogo_streamings=8');
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(saved().myProviders).toEqual([8]));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }));
    await waitFor(() => expect(saved().myProviders).toEqual([]));
  });

  it('fecha com Esc e com o botão Fechar', async () => {
    const onClose = vi.fn();
    renderWithSettings(<SettingsPanel open onClose={onClose} />);
    const close = await screen.findByRole('button', { name: 'Fechar configurações' });
    expect(close).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/settings-panel.test.jsx`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar o painel**

`components/settings/SettingsPanel.jsx`:

```jsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from './SettingsProvider';
import { PROVIDERS } from '@/lib/providers';
import { writeProvidersCookie } from '@/lib/preferences';

const THEME_OPTIONS = [
  { value: 'escuro', label: 'Escuro' },
  { value: 'claro', label: 'Claro' },
  { value: 'noturno', label: 'Noturno 🔅' },
];

const TEXT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'grande', label: 'Grande' },
  { value: 'muito-grande', label: 'Muito grande' },
];

function Segmented({ name, options, value, onChange }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-lg border border-line px-2 py-2 text-center text-sm has-checked:neon-gradient has-checked:border-transparent has-checked:font-bold has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-accent-2"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

export function SettingsPanel({ open, onClose }) {
  const { prefs, resolvedTheme, updatePrefs } = useSettings();
  const router = useRouter();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function toggleProvider(id) {
    const next = prefs.myProviders.includes(id)
      ? prefs.myProviders.filter((p) => p !== id)
      : [...prefs.myProviders, id];
    writeProvidersCookie(next);
    updatePrefs({ myProviders: next });
    router.refresh();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fundo"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="painel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-titulo"
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-line bg-surface p-6 text-fg shadow-glow"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <h2 id="config-titulo" className="text-xl font-bold">Configurações</h2>
              <button ref={closeRef} onClick={onClose} aria-label="Fechar configurações" className="rounded p-2 hover:bg-surface-2">
                ✕
              </button>
            </div>

            <fieldset className="mt-6">
              <legend className="font-semibold">Aparência</legend>
              <Segmented name="tema" options={THEME_OPTIONS} value={resolvedTheme} onChange={(theme) => updatePrefs({ theme })} />
              {resolvedTheme === 'noturno' && (
                <label className="mt-4 block text-sm">
                  Brilho: {prefs.brightness}%
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={prefs.brightness}
                    onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </label>
              )}
            </fieldset>

            <fieldset className="mt-8">
              <legend className="font-semibold">Acessibilidade</legend>
              <p className="mt-3 text-sm">Tamanho do texto</p>
              <Segmented name="texto" options={TEXT_OPTIONS} value={prefs.textSize} onChange={(textSize) => updatePrefs({ textSize })} />
              <Toggle
                label="Modo sensorial calmo"
                description="Sem sons, vídeos automáticos, brilhos ou animações."
                checked={prefs.calm}
                onChange={(calm) => updatePrefs({ calm })}
              />
              <Toggle label="Alto contraste" checked={prefs.highContrast} onChange={(highContrast) => updatePrefs({ highContrast })} />
              <Toggle
                label="Som de abertura"
                description="Toca ao entrar no site, começando baixinho."
                checked={prefs.openingSound}
                onChange={(openingSound) => updatePrefs({ openingSound })}
              />
            </fieldset>

            <fieldset className="mt-8">
              <legend className="font-semibold">Meus streamings</legend>
              <p className="mt-1 text-sm text-muted">Marque os serviços que você assina. Sem nenhum marcado, mostramos todos.</p>
              <div className="mt-3 space-y-2">
                {PROVIDERS.map((provider) => (
                  <label key={provider.id} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={prefs.myProviders.includes(provider.id)}
                      onChange={() => toggleProvider(provider.id)}
                      className="h-5 w-5 accent-[var(--accent)]"
                    />
                    {provider.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Botão no topo**

Em `components/Header.jsx`:

1. Trocar as importações do início do arquivo por:

```jsx
'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/brand';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
```

2. Na primeira linha de `Header()`, depois de `const pathname = usePathname();`, acrescentar:

```jsx
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
```

3. Substituir `<div data-slot="header-actions" className="ml-auto flex items-center gap-2" />` por:

```jsx
        <div data-slot="header-actions" className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Abrir configurações"
            aria-haspopup="dialog"
            className="rounded-full p-2 text-lg hover:bg-surface-2"
          >
            ⚙️
          </button>
        </div>
        <SettingsPanel open={settingsOpen} onClose={closeSettings} />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/components/settings-panel.test.jsx tests/components/base.test.jsx`
Expected: PASS.

- [ ] **Step 6: Verificar no navegador**

Run: `npm run dev`. Clicar em ⚙️, trocar para Claro, Noturno (mexer no brilho), Muito grande e Alto contraste, e recarregar a página.
Expected: cada mudança aparece na hora e continua depois de recarregar, sem piscar.

- [ ] **Step 7: Commit**

```bash
git add components/settings/SettingsPanel.jsx components/Header.jsx tests/components/settings-panel.test.jsx
git commit -m "feat: painel de Configurações com aparência, acessibilidade e Meus streamings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Tela de entrada e som de abertura

**Files:**
- Create: `lib/opening-sound.js`, `components/EntryScreen.jsx`
- Modify: `app/layout.jsx` (renderizar `<EntryScreen />`)
- Test: `tests/unit/opening-sound.test.js`, `tests/components/entry-screen.test.jsx`

**Interfaces:**
- Consumes: `useSettings` (Tarefa 9), `shouldPlayOpeningSound` (Tarefa 8), `APP_NAME` (Tarefa 1)
- Produces:
  - `OPENING_SOUND = { fadeInSeconds: 3, totalSeconds: 5, peakGain: 0.25, notes: number[] }`
  - `playOpeningSound(AudioContextClass?): AudioContext|null` (som original gerado com a Web Audio API)
  - `ENTRY_SESSION_KEY = 'catalogo:entrou'`, `<EntryScreen />`

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/opening-sound.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { OPENING_SOUND, playOpeningSound } from '@/lib/opening-sound';

function fakeAudioContext() {
  const ramps = [];
  const oscillators = [];
  class FakeContext {
    constructor() {
      this.currentTime = 10;
      this.destination = {};
      this.close = vi.fn();
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: (value, time) => ramps.push(['set', value, time]),
          linearRampToValueAtTime: (value, time) => ramps.push(['ramp', value, time]),
        },
        connect: vi.fn(),
      };
    }
    createOscillator() {
      const osc = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }
  }
  return { FakeContext, ramps, oscillators };
}

describe('playOpeningSound', () => {
  it('começa em silêncio, sobe em 3 s e termina em 5 s', () => {
    const { FakeContext, ramps } = fakeAudioContext();
    playOpeningSound(FakeContext);
    expect(ramps).toEqual([
      ['set', 0, 10],
      ['ramp', OPENING_SOUND.peakGain, 13],
      ['ramp', 0, 15],
    ]);
  });

  it('toca uma nota por frequência e para todas no fim', () => {
    const { FakeContext, oscillators } = fakeAudioContext();
    playOpeningSound(FakeContext);
    expect(oscillators).toHaveLength(OPENING_SOUND.notes.length);
    for (const osc of oscillators) expect(osc.stop).toHaveBeenCalledWith(15);
  });

  it('sem suporte a áudio não faz nada', () => {
    expect(playOpeningSound(undefined)).toBeNull();
  });
});
```

`tests/components/entry-screen.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { EntryScreen, ENTRY_SESSION_KEY } from '@/components/EntryScreen';
import { playOpeningSound } from '@/lib/opening-sound';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/opening-sound', () => ({ playOpeningSound: vi.fn() }));

beforeEach(() => {
  pathname = '/';
  playOpeningSound.mockClear();
});

describe('EntryScreen', () => {
  it('aparece no Início, toca o som e some ao entrar', async () => {
    renderWithSettings(<EntryScreen />, { theme: 'escuro' });
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(playOpeningSound).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(ENTRY_SESSION_KEY)).toBe('1');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument());
  });

  it.each([
    ['Noturno', { theme: 'noturno' }],
    ['Modo sensorial calmo', { theme: 'escuro', calm: true }],
    ['som desligado', { theme: 'escuro', openingSound: false }],
  ])('não toca o som no %s', async (_, prefs) => {
    renderWithSettings(<EntryScreen />, prefs);
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(playOpeningSound).not.toHaveBeenCalled();
  });

  it('não aparece de novo na mesma sessão', async () => {
    sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    renderWithSettings(<EntryScreen />);
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme'));
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('não aparece em links diretos para páginas internas', async () => {
    pathname = '/filme/101';
    renderWithSettings(<EntryScreen />);
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme'));
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/opening-sound.test.js tests/components/entry-screen.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar o som**

`lib/opening-sound.js`:

```js
// Som original: um acorde de Dó maior em arpejo, que nasce do silêncio e some suavemente.
export const OPENING_SOUND = {
  fadeInSeconds: 3,
  totalSeconds: 5,
  peakGain: 0.25,
  notes: [261.63, 329.63, 392.0, 523.25],
};

export function playOpeningSound(
  AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined,
) {
  if (!AudioContextClass) return null;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const { fadeInSeconds, totalSeconds, peakGain, notes } = OPENING_SOUND;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(peakGain, now + fadeInSeconds);
  master.gain.linearRampToValueAtTime(0, now + totalSeconds);
  master.connect(ctx.destination);

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(master);
    osc.start(now + i * 0.6);
    osc.stop(now + totalSeconds);
  });

  setTimeout(() => ctx.close(), (totalSeconds + 0.5) * 1000);
  return ctx;
}
```

- [ ] **Step 4: Implementar a tela de entrada**

`components/EntryScreen.jsx`:

```jsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { shouldPlayOpeningSound } from '@/lib/preferences';
import { playOpeningSound } from '@/lib/opening-sound';
import { APP_NAME } from '@/lib/brand';

export const ENTRY_SESSION_KEY = 'catalogo:entrou';

function alreadyEntered() {
  try {
    return sessionStorage.getItem(ENTRY_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function EntryScreen() {
  const pathname = usePathname();
  const { prefs, resolvedTheme, loaded } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === '/' && !alreadyEntered()) setVisible(true);
  }, [pathname]);

  function enter() {
    // O navegador só deixa tocar som depois de um clique; por isso o som fica aqui.
    if (shouldPlayOpeningSound(prefs, resolvedTheme)) playOpeningSound();
    try {
      sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    } catch {
      // aba anônima com armazenamento bloqueado: a tela volta na próxima visita
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && loaded && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Boas-vindas"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-10 bg-bg"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="neon-gradient bg-clip-text text-6xl font-black text-transparent sm:text-8xl"
          >
            {APP_NAME}
          </motion.p>
          <button
            autoFocus
            onClick={enter}
            className="neon-gradient rounded-full px-12 py-4 text-lg font-bold text-white shadow-glow transition hover:scale-105 calm:hover:scale-100"
          >
            Entrar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Colocar no layout**

Em `app/layout.jsx`, acrescentar a importação `import { EntryScreen } from '@/components/EntryScreen';` e a linha `<EntryScreen />` logo antes de `<BrightnessOverlay />`.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/unit/opening-sound.test.js tests/components/entry-screen.test.jsx`
Expected: PASS.

- [ ] **Step 7: Verificar no navegador**

Run: `npm run dev`, abrir http://localhost:3000 numa aba anônima, clicar em **Entrar**.
Expected: som suave que cresce por 3 s e some em seguida; a tela de entrada desaparece. Recarregar: não aparece de novo. Com o Noturno ligado, abrir outra aba anônima: entra sem som.

- [ ] **Step 8: Commit**

```bash
git add lib/opening-sound.js components/EntryScreen.jsx app/layout.jsx tests/unit/opening-sound.test.js tests/components/entry-screen.test.jsx
git commit -m "feat: tela de entrada com som de abertura suave" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Cartaz, fileira e "Como você quer se sentir hoje?"

**Files:**
- Create: `components/PosterCard.jsx`, `components/Row.jsx`, `components/MoodPicker.jsx`
- Test: `tests/components/poster-row-mood.test.jsx`

**Interfaces:**
- Consumes: `imageUrl` (Tarefa 3), `titleHref` (Tarefa 3), `MOODS` (Tarefa 4)
- Produces:
  - `<PosterCard title: Title fluid?: boolean priority?: boolean />` (`fluid` = ocupa a largura da grade)
  - `<Row title: string href?: string items: Title[] />`
  - `<MoodPicker />`

- [ ] **Step 1: Escrever os testes que falham**

`tests/components/poster-row-mood.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosterCard } from '@/components/PosterCard';
import { Row } from '@/components/Row';
import { MoodPicker } from '@/components/MoodPicker';

const title = (id, extra = {}) => ({
  id, type: 'movie', title: `Filme ${id}`, year: 2020, posterPath: `/p${id}.jpg`, rating: 7.3, ...extra,
});

describe('PosterCard', () => {
  it('liga para a página do título e descreve o cartaz com título e ano', () => {
    render(<PosterCard title={title(1)} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/1');
    expect(screen.getByRole('img', { name: 'Filme 1 (2020)' })).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/p1.jpg');
    expect(screen.getByText('★ 7.3')).toBeInTheDocument();
  });

  it('sem imagem mostra um cartaz neon com o nome', () => {
    render(<PosterCard title={title(2, { type: 'tv', posterPath: null, year: null, rating: null })} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/serie/2');
    expect(screen.getByTestId('poster-fallback')).toHaveTextContent('Filme 2');
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});

describe('Row', () => {
  it('mostra o título, o link Ver tudo e os cartazes', () => {
    render(<Row title="Em alta na Netflix" href="/explorar?plataforma=8" items={[title(1), title(2)]} />);
    expect(screen.getByRole('region', { name: 'Em alta na Netflix' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver tudo: Em alta na Netflix' })).toHaveAttribute('href', '/explorar?plataforma=8');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('as setas do teclado andam entre os cartazes', async () => {
    render(<Row title="Ação" items={[title(1), title(2), title(3)]} />);
    const links = screen.getAllByRole('link', { name: /Filme/ });
    links[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(links[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(links[2]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(links[1]).toHaveFocus();
  });
});

describe('MoodPicker', () => {
  it('mostra os 8 humores ligando para o Explorar', () => {
    render(<MoodPicker />);
    expect(screen.getByRole('heading', { name: 'Como você quer se sentir hoje?' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(8);
    expect(screen.getByRole('link', { name: /Fé e espiritualidade/ })).toHaveAttribute('href', '/explorar?humor=fe');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/poster-row-mood.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Implementar**

`components/PosterCard.jsx`:

```jsx
import Link from 'next/link';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

export function PosterCard({ title, fluid = false, priority = false }) {
  const src = imageUrl(title.posterPath, 'w342');
  const label = title.year ? `${title.title} (${title.year})` : title.title;
  return (
    <Link href={titleHref(title)} className={`group block focus-visible:outline-none ${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 transition duration-300 group-hover:scale-105 group-hover:shadow-glow group-focus-visible:scale-105 group-focus-visible:shadow-glow group-focus-visible:ring-2 group-focus-visible:ring-accent-2 calm:group-hover:scale-100 calm:group-focus-visible:scale-100">
        {src ? (
          <img src={src} alt={label} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
        ) : (
          <div role="img" aria-label={label} data-testid="poster-fallback" className="neon-gradient flex h-full items-center justify-center p-3 text-center font-bold text-white">
            {title.title}
          </div>
        )}
        {title.rating ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 text-xs font-semibold text-white">
            ★ {title.rating.toFixed(1)}
          </span>
        ) : null}
      </div>
      <p aria-hidden="true" className="mt-2 line-clamp-1 text-sm text-fg">{title.title}</p>
    </Link>
  );
}
```

`components/Row.jsx`:

```jsx
'use client';

import { useId, useRef } from 'react';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';

export function Row({ title, href, items }) {
  const listRef = useRef(null);
  const headingId = useId();

  function scrollByPage(direction) {
    const el = listRef.current;
    el?.scrollBy?.({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  function onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const links = [...listRef.current.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement);
    if (index === -1) return;
    e.preventDefault();
    const next = Math.min(links.length - 1, Math.max(0, index + (e.key === 'ArrowRight' ? 1 : -1)));
    links[next].focus();
  }

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <div className="flex items-baseline justify-between px-4 sm:px-8">
        <h2 id={headingId} className="text-lg font-bold sm:text-xl">{title}</h2>
        {href && (
          <Link href={href} aria-label={`Ver tudo: ${title}`} className="text-sm font-semibold text-accent hover:underline">
            Ver tudo
          </Link>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => scrollByPage(-1)}
          aria-label={`Rolar ${title} para a esquerda`}
          tabIndex={-1}
          className="absolute left-0 top-0 z-10 hidden h-full w-10 bg-gradient-to-r from-bg to-transparent text-3xl sm:block"
        >
          ‹
        </button>
        <ul ref={listRef} onKeyDown={onKeyDown} className="flex gap-3 overflow-x-auto scroll-smooth px-4 pb-3 pt-3 [scrollbar-width:none] sm:px-8">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <PosterCard title={item} />
            </li>
          ))}
        </ul>
        <button
          onClick={() => scrollByPage(1)}
          aria-label={`Rolar ${title} para a direita`}
          tabIndex={-1}
          className="absolute right-0 top-0 z-10 hidden h-full w-10 bg-gradient-to-l from-bg to-transparent text-3xl sm:block"
        >
          ›
        </button>
      </div>
    </section>
  );
}
```

`components/MoodPicker.jsx`:

```jsx
import Link from 'next/link';
import { MOODS } from '@/lib/moods';

export function MoodPicker() {
  return (
    <section aria-labelledby="humor-titulo" className="mt-10 px-4 sm:px-8">
      <h2 id="humor-titulo" className="text-lg font-bold sm:text-xl">Como você quer se sentir hoje?</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <li key={mood.slug}>
            <Link
              href={`/explorar?humor=${mood.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 transition hover:border-accent hover:shadow-glow"
            >
              <span aria-hidden="true">{mood.emoji}</span>
              {mood.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/poster-row-mood.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/PosterCard.jsx components/Row.jsx components/MoodPicker.jsx tests/components/poster-row-mood.test.jsx
git commit -m "feat: cartaz, fileira horizontal e seção de humores" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Destaque com trailer e janela de trailer

**Files:**
- Create: `components/TrailerModal.jsx`, `components/TrailerButton.jsx`, `components/Hero.jsx`
- Test: `tests/components/hero.test.jsx`

**Interfaces:**
- Consumes: `useSettings` (Tarefa 9), `shouldAutoplayTrailer`, `shouldRotateHero` (Tarefa 8), `trailerEmbedUrl` (Tarefa 5), `imageUrl`, `titleHref` (Tarefa 3)
- Produces:
  - `<TrailerModal trailerKey: string title: string onClose: () => void />` (toca com som, fecha com Esc)
  - `<TrailerButton trailerKey: string title: string />` (botão "▶ Ver trailer" que abre a janela)
  - `<Hero items: (Title & { trailerKey: string|null })[] />`; `HERO_ROTATE_MS = 15000`

O trailer automático só começa depois de `loaded` ficar `true`. Assim, no Modo sensorial calmo, ele não começa nem por um instante enquanto as preferências carregam.

- [ ] **Step 1: Escrever os testes que falham**

`tests/components/hero.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { Hero, HERO_ROTATE_MS } from '@/components/Hero';
import { SettingsProvider } from '@/components/settings/SettingsProvider';

const items = [
  { id: 1, type: 'movie', title: 'Primeiro', overview: 'Sinopse 1', backdropPath: '/b1.jpg', trailerKey: 'k1' },
  { id: 2, type: 'tv', title: 'Segundo', overview: 'Sinopse 2', backdropPath: '/b2.jpg', trailerKey: null },
];

const flush = () => act(async () => {});

afterEach(() => vi.useRealTimers());

describe('Hero', () => {
  it('mostra o título com o trailer automático e mudo', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
    const video = screen.getByTestId('hero-video');
    expect(video.getAttribute('src')).toContain('/embed/k1');
    expect(video.getAttribute('src')).toContain('mute=1');
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/filme/1');
  });

  it('no Modo sensorial calmo não toca o trailer sozinho', async () => {
    renderWithSettings(<Hero items={items} />, { calm: true });
    await flush();
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▶ Ver trailer' })).toBeInTheDocument();
  });

  it('não começa o trailer antes de as preferências carregarem', () => {
    // renderToString não roda efeitos: é exatamente a primeira pintura, antes de ler o localStorage
    const html = renderToString(<SettingsProvider><Hero items={items} /></SettingsProvider>);
    expect(html).toContain('Primeiro');
    expect(html).not.toContain('hero-video');
  });

  it('troca de destaque a cada 15 segundos', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />);
    await flush();
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS); });
    expect(screen.getByRole('heading', { name: 'Segundo' })).toBeInTheDocument();
  });

  it('não troca de destaque no Modo sensorial calmo', async () => {
    vi.useFakeTimers();
    renderWithSettings(<Hero items={items} />, { calm: true });
    await flush();
    await act(async () => { vi.advanceTimersByTime(HERO_ROTATE_MS * 2); });
    expect(screen.getByRole('heading', { name: 'Primeiro' })).toBeInTheDocument();
  });

  it('o botão de som liga e desliga o áudio do trailer', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    const sound = screen.getByRole('button', { name: 'Ativar som do trailer' });
    await userEvent.click(sound);
    expect(screen.getByRole('button', { name: 'Desativar som do trailer' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('abre o trailer com som e fecha com Esc', async () => {
    renderWithSettings(<Hero items={items} />);
    await flush();
    await userEvent.click(screen.getByRole('button', { name: '▶ Ver trailer' }));
    const dialog = screen.getByRole('dialog', { name: 'Trailer de Primeiro' });
    const iframe = dialog.querySelector('iframe');
    expect(iframe.getAttribute('src')).toContain('autoplay=1');
    expect(iframe.getAttribute('src')).not.toContain('mute=1');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sem itens não mostra nada', () => {
    const { container } = renderWithSettings(<Hero items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/hero.test.jsx`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Janela e botão de trailer**

`components/TrailerModal.jsx`:

```jsx
'use client';

import { useEffect, useRef } from 'react';
import { trailerEmbedUrl } from '@/lib/trailer';

export function TrailerModal({ trailerKey, title, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer de ${title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} onClick={onClose} aria-label="Fechar trailer" className="absolute -top-11 right-0 rounded p-2 text-2xl text-white">
          ✕
        </button>
        <div className="aspect-video w-full">
          <iframe
            title={`Trailer de ${title}`}
            src={trailerEmbedUrl(trailerKey, { autoplay: true })}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
```

`components/TrailerButton.jsx`:

```jsx
'use client';

import { useCallback, useState } from 'react';
import { TrailerModal } from '@/components/TrailerModal';

export function TrailerButton({ trailerKey, title, className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold text-white backdrop-blur hover:bg-white/20 ${className}`}
      >
        ▶ Ver trailer
      </button>
      {open && <TrailerModal trailerKey={trailerKey} title={title} onClose={close} />}
    </>
  );
}
```

- [ ] **Step 4: Destaque**

`components/Hero.jsx`:

```jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { TrailerModal } from '@/components/TrailerModal';
import { shouldAutoplayTrailer, shouldRotateHero } from '@/lib/preferences';
import { trailerEmbedUrl } from '@/lib/trailer';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

export const HERO_ROTATE_MS = 15000;

export function Hero({ items }) {
  const { prefs, loaded } = useSettings();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const iframeRef = useRef(null);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  const current = items[index];
  const autoplay = loaded && shouldAutoplayTrailer(prefs) && Boolean(current?.trailerKey);
  const rotate = loaded && shouldRotateHero(prefs) && items.length > 1 && !hovered && !soundOn && !trailerOpen;

  useEffect(() => {
    if (!rotate) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % items.length), HERO_ROTATE_MS);
    return () => clearTimeout(timer);
  }, [rotate, index, items.length]);

  useEffect(() => setSoundOn(false), [index]);

  function toggleSound() {
    const next = !soundOn;
    // API de mensagens do player do YouTube (o vídeo é carregado com enablejsapi=1).
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: next ? 'unMute' : 'mute', args: [] }),
      '*',
    );
    setSoundOn(next);
  }

  if (!current) return null;
  const backdrop = imageUrl(current.backdropPath, 'w1280');

  return (
    <section
      aria-roledescription="destaque"
      aria-label={`Destaque: ${current.title}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-[#0d0820] text-white"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.type}-${current.id}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {backdrop && <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {autoplay && (
            <iframe
              ref={iframeRef}
              data-testid="hero-video"
              title={`Trailer de ${current.title} (sem som)`}
              src={trailerEmbedUrl(current.trailerKey, { autoplay: true, muted: true, loop: true })}
              allow="autoplay; encrypted-media"
              tabIndex={-1}
              className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0820] via-[#0d0820]/50 to-transparent" />

      <div className="absolute bottom-0 left-0 max-w-2xl p-4 pb-10 sm:p-8 sm:pb-14">
        <h2 className="text-3xl font-black drop-shadow-lg sm:text-5xl">{current.title}</h2>
        {current.overview && <p className="mt-3 line-clamp-3 text-sm text-white/90 sm:text-base">{current.overview}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={titleHref(current)} className="neon-gradient rounded-full px-6 py-2.5 font-bold text-white shadow-glow">
            Ver detalhes
          </Link>
          {current.trailerKey && (
            <button
              onClick={() => setTrailerOpen(true)}
              className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold backdrop-blur hover:bg-white/20"
            >
              ▶ Ver trailer
            </button>
          )}
          {autoplay && (
            <button
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Desativar som do trailer' : 'Ativar som do trailer'}
              className="rounded-full border border-white/40 bg-white/10 px-4 py-2.5 backdrop-blur hover:bg-white/20"
            >
              <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
            </button>
          )}
        </div>
      </div>

      {trailerOpen && <TrailerModal trailerKey={current.trailerKey} title={current.title} onClose={closeTrailer} />}
    </section>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/components/hero.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/TrailerModal.jsx components/TrailerButton.jsx components/Hero.jsx tests/components/hero.test.jsx
git commit -m "feat: destaque com trailer automático mudo e janela de trailer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Página Inicial, erros e "Não encontrado"

**Files:**
- Create: `components/LoadError.jsx`, `app/error.jsx`, `app/not-found.jsx`
- Modify (substituir todo o conteúdo): `app/page.jsx`
- Test: `tests/components/load-error.test.jsx`

**Interfaces:**
- Consumes: `getHomeData` (Tarefa 7), `parseProvidersCookie`, `PROVIDERS_COOKIE` (Tarefa 8), `Hero` (Tarefa 13), `MoodPicker`, `Row` (Tarefa 12)
- Produces: `<LoadError message?: string onRetry?: () => void />` (sem `onRetry`, recarrega os dados da página com `router.refresh()`)

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/load-error.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadError } from '@/components/LoadError';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LoadError', () => {
  it('mostra a mensagem padrão e chama onRetry', async () => {
    const onRetry = vi.fn();
    render(<LoadError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar agora.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sem onRetry recarrega os dados da página', async () => {
    render(<LoadError message="Falhou." />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/load-error.test.jsx`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`components/LoadError.jsx`:

```jsx
'use client';

import { useRouter } from 'next/navigation';

export function LoadError({ message = 'Não foi possível carregar agora.', onRetry }) {
  const router = useRouter();
  return (
    <div role="alert" className="mx-4 my-10 rounded-xl border border-line bg-surface p-6 text-center sm:mx-8">
      <p>{message}</p>
      <button
        onClick={() => (onRetry ? onRetry() : router.refresh())}
        className="neon-gradient mt-4 rounded-full px-6 py-2 font-bold text-white shadow-glow"
      >
        Tentar novamente
      </button>
    </div>
  );
}
```

`app/error.jsx`:

```jsx
'use client';

import { LoadError } from '@/components/LoadError';

export default function ErrorPage({ reset }) {
  return <LoadError message="Não foi possível carregar agora." onRetry={reset} />;
}
```

`app/not-found.jsx`:

```jsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="neon-gradient bg-clip-text text-7xl font-black text-transparent">404</p>
      <h1 className="text-2xl font-bold">Não encontrado</h1>
      <p className="text-muted">Este título não existe ou não está disponível nas assinaturas de streaming no Brasil.</p>
      <Link href="/" className="neon-gradient rounded-full px-6 py-2.5 font-bold text-white shadow-glow">
        Voltar ao Início
      </Link>
    </div>
  );
}
```

`app/page.jsx` (substituir todo o conteúdo):

```jsx
import { cookies } from 'next/headers';
import { getHomeData } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { Hero } from '@/components/Hero';
import { MoodPicker } from '@/components/MoodPicker';
import { Row } from '@/components/Row';
import { LoadError } from '@/components/LoadError';

export default async function HomePage() {
  const cookieStore = await cookies();
  const myProviders = parseProvidersCookie(cookieStore.get(PROVIDERS_COOKIE)?.value);
  const { hero, rows } = await getHomeData(myProviders);

  return (
    <>
      <h1 className="sr-only">Início</h1>
      <Hero items={hero} />
      <MoodPicker />
      {rows.map((row) => (
        <Row key={row.key} title={row.title} href={row.href} items={row.items} />
      ))}
      {rows.length === 0 && <LoadError message="Não foi possível carregar os títulos agora." />}
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/load-error.test.jsx`
Expected: PASS.

- [ ] **Step 5: Verificar com o TMDB real**

Run: `npm run dev` (com o token em `.env.local`) e abrir http://localhost:3000.
Expected: destaque com trailer mudo tocando, botões de humor, fileiras "Em alta na Netflix" etc. e fileiras por gênero com cartazes reais. Abrir http://localhost:3000/rota-inexistente: página "Não encontrado".

- [ ] **Step 6: Commit**

```bash
git add components/LoadError.jsx app/error.jsx app/not-found.jsx app/page.jsx tests/components/load-error.test.jsx
git commit -m "feat: página Inicial com destaque, humores e fileiras" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Explorar com filtros e rolagem infinita

**Files:**
- Create: `app/api/explorar/route.js`, `components/ExploreFilters.jsx`, `components/ExploreGrid.jsx`, `app/explorar/page.jsx`
- Test: `tests/unit/api-explorar.test.js`, `tests/components/explore.test.jsx`

**Interfaces:**
- Consumes: `parseExploreParams`, `toExploreQuery` (Tarefa 6), `discoverPage`, `getGenreLists` (Tarefa 7), `parseProvidersCookie`, `PROVIDERS_COOKIE` (Tarefa 8), `PROVIDERS` (Tarefa 4), `getMood` (Tarefa 4), `PosterCard` (Tarefa 12), `LoadError` (Tarefa 14)
- Produces:
  - `GET /api/explorar?<mesmos parâmetros do Explorar>` → `{ results: Title[], totalPages }`; em erro do TMDB → status 502 com `{ error }`
  - `<ExploreFilters filters: Filters genres: {id,name}[] />` (formulário GET; "Filmes/Séries" são links)
  - `<ExploreGrid filters: Filters initial: { results, totalPages } />`

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/api-explorar.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/explorar/route';
import { mockTmdb } from '../helpers/mock-tmdb';

describe('GET /api/explorar', () => {
  it('devolve a página pedida usando os filtros e o cookie de Meus streamings', async () => {
    const fetchMock = mockTmdb({ '/discover/tv': { total_pages: 4, results: [{ id: 7, name: 'Série 7', popularity: 1 }] } });
    const request = new NextRequest('http://localhost/api/explorar?tipo=serie&pagina=2', {
      headers: { cookie: 'catalogo_streamings=8.119' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalPages).toBe(4);
    expect(body.results[0]).toMatchObject({ id: 7, type: 'tv' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('with_watch_providers')).toBe('8|119');
  });

  it('responde 502 quando o TMDB falha', async () => {
    mockTmdb({ '/discover/movie': 500 });
    const response = await GET(new NextRequest('http://localhost/api/explorar'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Não foi possível carregar agora.' });
  });
});
```

`tests/components/explore.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExploreGrid } from '@/components/ExploreGrid';
import { ExploreFilters } from '@/components/ExploreFilters';
import { parseExploreParams } from '@/lib/explore-params';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('next/form', () => ({ default: ({ children, ...props }) => <form {...props}>{children}</form> }));

let observerCallback;
beforeEach(() => {
  observerCallback = null;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb) { observerCallback = cb; }
    observe() {}
    disconnect() {}
  });
});

const filters = (query = '') => parseExploreParams(new URLSearchParams(query));
const title = (id) => ({ id, type: 'movie', title: `Filme ${id}`, year: 2020, posterPath: null, rating: null });

describe('ExploreGrid', () => {
  it('sem resultados mostra a mensagem e Limpar filtros', () => {
    render(<ExploreGrid filters={filters('tipo=serie&genero=18')} initial={{ results: [], totalPages: 0 }} />);
    expect(screen.getByText('Nenhum título encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/explorar?tipo=serie');
  });

  it('carrega a próxima página ao chegar perto do fim', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [title(2), title(1)], totalPages: 2 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExploreGrid filters={filters('genero=28')} initial={{ results: [title(1)], totalPages: 2 }} />);
    observerCallback([{ isIntersecting: true }]);
    expect(await screen.findByRole('link', { name: /Filme 2/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/explorar?genero=28&pagina=2');
    expect(screen.getAllByRole('link', { name: /Filme 1/ })).toHaveLength(1);
  });

  it('mostra erro com Tentar novamente quando a página seguinte falha', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [title(2)], totalPages: 2 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExploreGrid filters={filters()} initial={{ results: [title(1)], totalPages: 2 }} />);
    observerCallback([{ isIntersecting: true }]);
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: /Filme 2/ })).toBeInTheDocument();
  });
});

describe('ExploreFilters', () => {
  const genres = [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }];

  it('marca os filtros atuais e preserva o tipo e o humor', () => {
    render(<ExploreFilters filters={filters('humor=rir&genero=35&plataforma=8&nota=7')} genres={genres} />);
    expect(screen.getByRole('checkbox', { name: 'Comédia' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ação' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Nota mínima' })).toHaveValue('7');
    expect(document.querySelector('input[name="humor"]')).toHaveValue('rir');
    expect(document.querySelector('input[name="tipo"]')).toHaveValue('filme');
  });

  it('Filmes/Séries trocam o tipo e limpam gêneros e duração', () => {
    render(<ExploreFilters filters={filters('humor=rir&genero=35&duracao=curto')} genres={genres} />);
    expect(screen.getByRole('link', { name: 'Filmes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Séries' })).toHaveAttribute('href', '/explorar?tipo=serie&humor=rir');
  });

  it('esconde a duração para séries', () => {
    render(<ExploreFilters filters={filters('tipo=serie')} genres={genres} />);
    expect(screen.queryByRole('combobox', { name: 'Duração' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/api-explorar.test.js tests/components/explore.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Rota interna**

`app/api/explorar/route.js`:

```js
import { NextResponse } from 'next/server';
import { parseExploreParams } from '@/lib/explore-params';
import { discoverPage } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';

export async function GET(request) {
  const filters = parseExploreParams(request.nextUrl.searchParams);
  const myProviders = parseProvidersCookie(request.cookies.get(PROVIDERS_COOKIE)?.value);
  try {
    return NextResponse.json(await discoverPage(filters, { myProviders }));
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar agora.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Grade com rolagem infinita**

`components/ExploreGrid.jsx`:

```jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { LoadError } from '@/components/LoadError';
import { toExploreQuery } from '@/lib/explore-params';

const keyOf = (t) => `${t.type}-${t.id}`;

function mergeUnique(current, incoming) {
  const seen = new Set(current.map(keyOf));
  return [...current, ...incoming.filter((t) => !seen.has(keyOf(t)))];
}

export function ExploreGrid({ filters, initial }) {
  const [items, setItems] = useState(initial.results);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const sentinelRef = useRef(null);
  const hasMore = page < initial.totalPages;

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    setStatus('loading');
    try {
      const response = await fetch(`/api/explorar?${toExploreQuery({ ...filters, pagina: page + 1 })}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = await response.json();
      setItems((current) => mergeUnique(current, data.results));
      setPage((p) => p + 1);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [filters, page, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || status !== 'idle') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, status]);

  if (!items.length) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg font-semibold">Nenhum título encontrado</p>
        <Link
          href={filters.tipo === 'serie' ? '/explorar?tipo=serie' : '/explorar'}
          className="neon-gradient mt-4 inline-block rounded-full px-6 py-2 font-bold text-white shadow-glow"
        >
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
        {items.map((item) => (
          <li key={keyOf(item)}>
            <PosterCard title={item} fluid />
          </li>
        ))}
      </ul>
      {status === 'loading' && <p role="status" className="py-8 text-center text-muted">Carregando mais títulos…</p>}
      {status === 'error' && <LoadError onRetry={loadMore} />}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-10" />}
    </>
  );
}
```

- [ ] **Step 5: Filtros**

`components/ExploreFilters.jsx`:

```jsx
import Form from 'next/form';
import Link from 'next/link';
import { PROVIDERS } from '@/lib/providers';
import { toExploreQuery } from '@/lib/explore-params';

const LANGUAGES = [
  ['pt', 'Português'], ['en', 'Inglês'], ['es', 'Espanhol'], ['fr', 'Francês'],
  ['it', 'Italiano'], ['de', 'Alemão'], ['ja', 'Japonês'], ['ko', 'Coreano'],
];
const RATINGS = [5, 6, 7, 8, 9];
const fieldClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg';

function TypeLink({ filters, tipo, label }) {
  const active = filters.tipo === tipo;
  const query = toExploreQuery({ ...filters, tipo, generos: [], duracao: null, pagina: 1 });
  return (
    <Link
      href={query ? `/explorar?${query}` : '/explorar'}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full px-5 py-2 text-sm font-bold ${active ? 'neon-gradient text-white shadow-glow' : 'border border-line text-muted hover:text-fg'}`}
    >
      {label}
    </Link>
  );
}

export function ExploreFilters({ filters, genres }) {
  return (
    <div className="mt-6">
      <nav aria-label="Tipo" className="flex gap-2">
        <TypeLink filters={filters} tipo="filme" label="Filmes" />
        <TypeLink filters={filters} tipo="serie" label="Séries" />
      </nav>

      <Form key={toExploreQuery(filters)} action="/explorar" className="mt-6 grid gap-4 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="tipo" value={filters.tipo} />
        {filters.humor && <input type="hidden" name="humor" value={filters.humor} />}

        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="text-sm font-semibold">Plataformas</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {PROVIDERS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="plataforma" value={p.id} defaultChecked={filters.plataformas.includes(p.id)} className="h-4 w-4 accent-[var(--accent)]" />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="sm:col-span-2 lg:col-span-4" open={filters.generos.length > 0}>
          <summary className="cursor-pointer text-sm font-semibold">
            Gêneros{filters.generos.length ? ` (${filters.generos.length})` : ''}
          </summary>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {genres.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="genero" value={g.id} defaultChecked={filters.generos.includes(g.id)} className="h-4 w-4 accent-[var(--accent)]" />
                {g.name}
              </label>
            ))}
          </div>
        </details>

        <label className="flex flex-col gap-1 text-sm">
          Ano de
          <input type="number" name="anoDe" aria-label="Ano de" min="1900" max="2100" defaultValue={filters.anoDe ?? ''} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ano até
          <input type="number" name="anoAte" aria-label="Ano até" min="1900" max="2100" defaultValue={filters.anoAte ?? ''} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nota mínima
          <select name="nota" aria-label="Nota mínima" defaultValue={filters.nota ?? ''} className={fieldClass}>
            <option value="">Qualquer</option>
            {RATINGS.map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        {filters.tipo === 'filme' && (
          <label className="flex flex-col gap-1 text-sm">
            Duração
            <select name="duracao" aria-label="Duração" defaultValue={filters.duracao ?? ''} className={fieldClass}>
              <option value="">Qualquer</option>
              <option value="curto">Até 90 min</option>
              <option value="medio">90 a 120 min</option>
              <option value="longo">Mais de 120 min</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Idioma original
          <select name="idioma" aria-label="Idioma original" defaultValue={filters.idioma ?? ''} className={fieldClass}>
            <option value="">Qualquer</option>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ordenar por
          <select name="ordem" aria-label="Ordenar por" defaultValue={filters.ordem} className={fieldClass}>
            <option value="popularidade">Popularidade</option>
            <option value="nota">Nota</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </label>

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="neon-gradient rounded-full px-6 py-2 font-bold text-white shadow-glow">Aplicar filtros</button>
          <Link href={filters.tipo === 'serie' ? '/explorar?tipo=serie' : '/explorar'} className="text-sm text-muted underline hover:text-fg">
            Limpar filtros
          </Link>
        </div>
      </Form>
    </div>
  );
}
```

- [ ] **Step 6: Página do Explorar**

`app/explorar/page.jsx`:

```jsx
import { cookies } from 'next/headers';
import { parseExploreParams, toExploreQuery } from '@/lib/explore-params';
import { discoverPage, getGenreLists } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { getMood } from '@/lib/moods';
import { ExploreFilters } from '@/components/ExploreFilters';
import { ExploreGrid } from '@/components/ExploreGrid';

export default async function ExplorePage({ searchParams }) {
  const filters = { ...parseExploreParams(await searchParams), pagina: 1 };
  const cookieStore = await cookies();
  const myProviders = parseProvidersCookie(cookieStore.get(PROVIDERS_COOKIE)?.value);
  const [first, genres] = await Promise.all([discoverPage(filters, { myProviders }), getGenreLists()]);
  const mood = filters.humor ? getMood(filters.humor) : null;

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-black sm:text-3xl">{mood ? `${mood.emoji} ${mood.label}` : 'Explorar'}</h1>
      <ExploreFilters filters={filters} genres={genres[filters.tipo]} />
      <ExploreGrid key={toExploreQuery(filters)} filters={filters} initial={first} />
    </div>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/unit/api-explorar.test.js tests/components/explore.test.jsx`
Expected: PASS.

- [ ] **Step 8: Verificar com o TMDB real**

Run: `npm run dev`, abrir http://localhost:3000/explorar, marcar "Netflix" e o gênero "Terror", aplicar e rolar até o fim. Depois clicar em "😌 Relaxar" no Início e em "Séries".
Expected: o endereço guarda os filtros, a grade carrega mais 20 títulos ao rolar, e o título da página mostra o humor escolhido.

- [ ] **Step 9: Commit**

```bash
git add app/api/explorar app/explorar components/ExploreFilters.jsx components/ExploreGrid.jsx tests/unit/api-explorar.test.js tests/components/explore.test.jsx
git commit -m "feat: Explorar com filtros no endereço e rolagem infinita" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Busca

**Files:**
- Create: `app/api/buscar/route.js`, `components/SearchBox.jsx`, `app/busca/page.jsx`
- Modify: `components/Header.jsx` (colocar a busca no topo)
- Test: `tests/unit/api-buscar.test.js`, `tests/components/search-box.test.jsx`

**Interfaces:**
- Consumes: `searchAvailable` (Tarefa 7), `imageUrl`, `titleHref` (Tarefa 3), `PosterCard` (Tarefa 12)
- Produces:
  - `GET /api/buscar?q=texto` → `{ results: Title[] }` (até 8); erro do TMDB → 502
  - `<SearchBox />`
  - Página `/busca?q=texto`: até 3 páginas de resultados do TMDB, só títulos disponíveis em assinatura

- [ ] **Step 1: Escrever os testes que falham**

`tests/unit/api-buscar.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/buscar/route';
import { mockTmdb } from '../helpers/mock-tmdb';

const available = { results: { BR: { flatrate: [{ provider_id: 8 }] } } };

describe('GET /api/buscar', () => {
  it('devolve até 8 resultados disponíveis', async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, media_type: 'movie', title: `Filme ${i + 1}` }));
    const routes = { '/search/multi': { total_pages: 1, results } };
    for (const r of results) routes[`/movie/${r.id}/watch/providers`] = available;
    const fetchMock = mockTmdb(routes);
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=a%C3%A7%C3%A3o'));
    const body = await response.json();
    expect(body.results).toHaveLength(8);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('query')).toBe('ação');
  });

  it('com menos de 2 caracteres responde vazio sem chamar o TMDB', async () => {
    const fetchMock = mockTmdb({});
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=a'));
    expect(await response.json()).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('responde 502 quando o TMDB falha', async () => {
    mockTmdb({ '/search/multi': 500 });
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=matrix'));
    expect(response.status).toBe(502);
  });
});
```

`tests/components/search-box.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/SearchBox';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const results = [{ id: 1, type: 'movie', title: 'Cidade de Deus', year: 2002, posterPath: null }];

beforeEach(() => push.mockClear());

describe('SearchBox', () => {
  it('busca 300 ms depois da última tecla e mostra as sugestões', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results })));
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Buscar filmes e séries' }), 'Cidade de Deus');
    expect(await screen.findByRole('link', { name: 'Cidade de Deus (2002)' })).toHaveAttribute('href', '/filme/1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/buscar?q=Cidade%20de%20Deus');
    expect(screen.getByRole('link', { name: 'Ver todos os resultados' })).toHaveAttribute('href', '/busca?q=Cidade%20de%20Deus');
  });

  it('não busca com menos de 2 caracteres', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'a');
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Enter abre a página completa de resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }))));
    render(<SearchBox />);
    await userEvent.type(screen.getByRole('combobox'), 'ação{Enter}');
    expect(push).toHaveBeenCalledWith('/busca?q=a%C3%A7%C3%A3o');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/api-buscar.test.js tests/components/search-box.test.jsx`
Expected: FAIL, importações não encontradas.

- [ ] **Step 3: Rota interna**

`app/api/buscar/route.js`:

```js
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
```

- [ ] **Step 4: Campo de busca**

`components/SearchBox.jsx`:

```jsx
'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function SearchBox() {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/buscar?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // busca cancelada ou rede fora: mantém as sugestões anteriores
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function submit(e) {
    e.preventDefault();
    if (trimmed.length < MIN_CHARS) return;
    setOpen(false);
    router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
  }

  const listId = `${id}-sugestoes`;
  return (
    <form role="search" onSubmit={submit} className="relative order-last w-full sm:order-none sm:w-64">
      <label htmlFor={`${id}-campo`} className="sr-only">Buscar filmes e séries</label>
      <input
        id={`${id}-campo`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && results.length > 0}
        autoComplete="off"
        placeholder="🔍 Buscar filmes e séries"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="w-full rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-fg placeholder:text-muted"
      />
      {open && results.length > 0 && (
        <ul id={listId} className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-glow sm:w-80">
          {results.map((t) => (
            <li key={`${t.type}-${t.id}`}>
              <Link href={titleHref(t)} onClick={() => setOpen(false)} className="flex items-center gap-3 p-2 hover:bg-surface-2">
                {t.posterPath ? (
                  <img src={imageUrl(t.posterPath, 'w92')} alt="" className="h-12 w-8 rounded object-cover" />
                ) : (
                  <span aria-hidden="true" className="neon-gradient h-12 w-8 rounded" />
                )}
                <span className="text-sm">{t.year ? `${t.title} (${t.year})` : t.title}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/busca?q=${encodeURIComponent(trimmed)}`} onClick={() => setOpen(false)} className="block p-2 text-center text-sm font-semibold text-accent hover:bg-surface-2">
              Ver todos os resultados
            </Link>
          </li>
        </ul>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Busca no topo**

Em `components/Header.jsx`:

1. Acrescentar a importação `import { SearchBox } from '@/components/SearchBox';`.
2. Logo antes de `<div data-slot="header-actions" ...>`, acrescentar `<SearchBox />`.

No celular, o campo ocupa uma segunda linha inteira do topo (`order-last w-full`); a partir de telas médias, fica ao lado dos links.

- [ ] **Step 6: Página de resultados**

`app/busca/page.jsx`:

```jsx
import { searchAvailable } from '@/lib/tmdb/catalog';
import { PosterCard } from '@/components/PosterCard';

const MAX_PAGES = 3;

export default async function SearchPage({ searchParams }) {
  const { q = '' } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q).trim();

  const first = await searchAvailable(query, 1);
  const extraPages = Math.min(first.totalPages, MAX_PAGES) - 1;
  const rest = await Promise.all(Array.from({ length: Math.max(0, extraPages) }, (_, i) => searchAvailable(query, i + 2)));
  const seen = new Set();
  const results = [first, ...rest].flatMap((page) => page.results).filter((t) => {
    const key = `${t.type}-${t.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-black sm:text-3xl">{query ? `Resultados para “${query}”` : 'Buscar'}</h1>
      {results.length ? (
        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {results.map((t) => (
            <li key={`${t.type}-${t.id}`}>
              <PosterCard title={t} fluid />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-muted">
          {query.length < 2 ? 'Digite pelo menos 2 letras para buscar.' : 'Nenhum título disponível em streaming encontrado.'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/unit/api-buscar.test.js tests/components/search-box.test.jsx tests/components/base.test.jsx`
Expected: PASS.

- [ ] **Step 8: Verificar com o TMDB real**

Run: `npm run dev` e digitar "cidade de deus" e depois "ação" no topo.
Expected: sugestões com cartaz pequeno; Enter abre `/busca` com a grade. No celular (ferramentas de desenvolvedor, largura 360 px), o campo fica numa segunda linha e nada transborda para os lados.

- [ ] **Step 9: Commit**

```bash
git add app/api/buscar app/busca components/SearchBox.jsx components/Header.jsx tests/unit/api-buscar.test.js tests/components/search-box.test.jsx
git commit -m "feat: busca com sugestões enquanto digita e página de resultados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Página do filme e da série

**Files:**
- Create: `components/TitlePage.jsx`, `app/filme/[id]/page.jsx`, `app/serie/[id]/page.jsx`
- Test: `tests/components/title-page.test.jsx`

**Interfaces:**
- Consumes: `getTitleDetails` (Tarefa 7), `formatRuntime`, `formatSeasons`, `certificationLabel`, `CERTIFICATION_STYLES` (Tarefa 5), `imageUrl` (Tarefa 3), `TrailerButton` (Tarefa 13), `Row` (Tarefa 12)
- Produces:
  - `<TitleView title: TitleDetails />` (apresentação, testável sem servidor)
  - `TitlePage({ type, id })`: componente de servidor que busca os dados e chama `notFound()` quando `getTitleDetails` devolve `null`

- [ ] **Step 1: Escrever o teste que falha**

`tests/components/title-page.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TitleView } from '@/components/TitlePage';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

const base = {
  id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, overview: 'Uma aventura.',
  posterPath: '/p.jpg', backdropPath: '/b.jpg', rating: 7.8, genres: ['Ação', 'Aventura'],
  runtime: 128, seasons: null, certification: '12', trailerKey: 'abc', watchLink: 'https://tmdb/watch',
  providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
  cast: [{ id: 1, name: 'Atriz Um', character: 'Heroína', profilePath: null }],
  recommendations: [{ id: 102, type: 'movie', title: 'Outra Aventura', year: 2023, posterPath: null }],
};

describe('TitleView', () => {
  it('mostra os dados principais do filme', () => {
    render(<TitleView title={base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeInTheDocument();
    expect(screen.getByText('2h 8min')).toBeInTheDocument();
    expect(screen.getByLabelText('Classificação indicativa: 12 anos')).toHaveTextContent('12');
    expect(screen.getByText('Uma aventura.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▶ Ver trailer' })).toBeInTheDocument();
  });

  it('mostra onde assistir com logo e link', () => {
    render(<TitleView title={base} />);
    const where = screen.getByRole('region', { name: 'Onde assistir' });
    expect(within(where).getByRole('img', { name: 'Netflix' })).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w92/n.png');
    expect(within(where).getByRole('link', { name: 'Ver detalhes de disponibilidade' })).toHaveAttribute('href', 'https://tmdb/watch');
  });

  it('mostra elenco e recomendações', () => {
    render(<TitleView title={base} />);
    expect(screen.getByText('Atriz Um')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Você também pode gostar' })).toBeInTheDocument();
  });

  it('série mostra temporadas e trata classificação ausente e falta de trailer', () => {
    render(<TitleView title={{ ...base, type: 'tv', runtime: null, seasons: 3, certification: null, trailerKey: null, recommendations: [] }} />);
    expect(screen.getByText('3 temporadas')).toBeInTheDocument();
    expect(screen.getByText('Classificação não informada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '▶ Ver trailer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Você também pode gostar' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/components/title-page.test.jsx`
Expected: FAIL, importação não encontrada.

- [ ] **Step 3: Implementar**

`components/TitlePage.jsx`:

```jsx
import { notFound } from 'next/navigation';
import { getTitleDetails } from '@/lib/tmdb/catalog';
import { imageUrl } from '@/lib/images';
import { formatRuntime, formatSeasons, certificationLabel, CERTIFICATION_STYLES } from '@/lib/format';
import { TrailerButton } from '@/components/TrailerButton';
import { Row } from '@/components/Row';

function Certification({ value }) {
  if (!value) return <span className="text-sm text-white/70">Classificação não informada</span>;
  return (
    <span
      aria-label={certificationLabel(value)}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-black ${CERTIFICATION_STYLES[value] ?? 'bg-white/20 text-white'}`}
    >
      {value}
    </span>
  );
}

export function TitleView({ title }) {
  const backdrop = imageUrl(title.backdropPath, 'w1280');
  const poster = imageUrl(title.posterPath, 'w342');
  const duration = title.type === 'movie' ? formatRuntime(title.runtime) : formatSeasons(title.seasons);
  const meta = [title.year, title.genres.join(', '), duration].filter(Boolean);

  return (
    <article>
      <section className="relative overflow-hidden bg-[#0d0820] text-white">
        {backdrop && <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0820] via-[#0d0820]/70 to-transparent" />
        <div className="relative flex flex-col gap-6 px-4 py-10 sm:flex-row sm:px-8 sm:py-16">
          {poster && <img src={poster} alt={`Cartaz de ${title.title}`} className="w-40 self-start rounded-xl shadow-glow sm:w-56" />}
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black sm:text-5xl">{title.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/85">
              <Certification value={title.certification} />
              {meta.map((item) => <span key={item}>{item}</span>)}
              {title.rating ? <span>★ {title.rating.toFixed(1)}</span> : null}
            </div>
            {title.overview && <p className="mt-5 text-base leading-relaxed text-white/90">{title.overview}</p>}
            {title.trailerKey && <TrailerButton trailerKey={title.trailerKey} title={title.title} className="mt-6" />}
          </div>
        </div>
      </section>

      <section aria-labelledby="onde-assistir" className="px-4 pt-10 sm:px-8">
        <h2 id="onde-assistir" className="text-lg font-bold sm:text-xl">Onde assistir</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {title.providers.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              {p.logoPath && <img src={imageUrl(p.logoPath, 'w92')} alt={p.name} className="h-8 w-8 rounded-lg" />}
              <span aria-hidden={Boolean(p.logoPath)}>{p.name}</span>
            </li>
          ))}
        </ul>
        {title.watchLink && (
          <a href={title.watchLink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent underline">
            Ver detalhes de disponibilidade
          </a>
        )}
      </section>

      {title.cast.length > 0 && (
        <section aria-labelledby="elenco" className="px-4 pt-10 sm:px-8">
          <h2 id="elenco" className="text-lg font-bold sm:text-xl">Elenco</h2>
          <ul className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {title.cast.map((person) => (
              <li key={person.id} className="w-24 shrink-0 text-center">
                {person.profilePath ? (
                  <img src={imageUrl(person.profilePath, 'w185')} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="neon-gradient mx-auto block h-24 w-24 rounded-full" />
                )}
                <p className="mt-2 text-sm font-semibold">{person.name}</p>
                {person.character && <p className="text-xs text-muted">{person.character}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {title.recommendations.length > 0 && <Row title="Você também pode gostar" items={title.recommendations} />}
    </article>
  );
}

export async function TitlePage({ type, id }) {
  const title = await getTitleDetails(type, id);
  if (!title) notFound();
  return <TitleView title={title} />;
}
```

`app/filme/[id]/page.jsx`:

```jsx
import { TitlePage } from '@/components/TitlePage';

export default async function MoviePage({ params }) {
  const { id } = await params;
  return <TitlePage type="movie" id={id} />;
}
```

`app/serie/[id]/page.jsx`:

```jsx
import { TitlePage } from '@/components/TitlePage';

export default async function SeriesPage({ params }) {
  const { id } = await params;
  return <TitlePage type="tv" id={id} />;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/components/title-page.test.jsx`
Expected: PASS.

- [ ] **Step 5: Verificar com o TMDB real**

Run: `npm run dev`, abrir um cartaz do Início, depois uma série, e por fim http://localhost:3000/filme/999999999 e http://localhost:3000/filme/abc.
Expected: página com fundo, cartaz, classificação colorida, sinopse, onde assistir, elenco e recomendações. Os dois últimos endereços mostram "Não encontrado".

- [ ] **Step 6: Commit**

```bash
git add components/TitlePage.jsx app/filme app/serie tests/components/title-page.test.jsx
git commit -m "feat: página do filme e da série com onde assistir, elenco e recomendações" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Testes de ponta a ponta e de acessibilidade

**Files:**
- Create: `playwright.config.mjs`, `tests/e2e/mock-tmdb.mjs`, `tests/e2e/catalogo.spec.js`, `tests/fixtures/discover-movie.json`, `tests/fixtures/discover-tv.json`, `tests/fixtures/search-multi.json`, `tests/fixtures/movie-101.json`, `tests/fixtures/tv-201.json`, `tests/fixtures/providers.json`, `tests/fixtures/videos.json`, `tests/fixtures/genres-movie.json`, `tests/fixtures/genres-tv.json`

**Interfaces:**
- Consumes: o site inteiro (Tarefas 1 a 17)
- Produces: `npm run test:e2e`, que sobe um TMDB simulado na porta 4010 e o site (build de produção) na porta 3100

- [ ] **Step 1: Respostas de exemplo do TMDB**

`tests/fixtures/discover-movie.json`:

```json
{
  "page": 1, "total_pages": 1, "total_results": 2,
  "results": [
    { "id": 101, "title": "Aventura Neon", "release_date": "2024-05-10", "overview": "Uma aventura brilhante.", "poster_path": "/p101.jpg", "backdrop_path": "/b101.jpg", "vote_average": 7.8, "popularity": 90, "genre_ids": [28] },
    { "id": 102, "title": "Risos no Escuro", "release_date": "2023-02-01", "overview": "Uma comédia.", "poster_path": null, "backdrop_path": "/b102.jpg", "vote_average": 6.9, "popularity": 80, "genre_ids": [35] }
  ]
}
```

`tests/fixtures/discover-tv.json`:

```json
{
  "page": 1, "total_pages": 1, "total_results": 1,
  "results": [
    { "id": 201, "name": "Série Brilhante", "first_air_date": "2021-03-03", "overview": "Uma série.", "poster_path": "/p201.jpg", "backdrop_path": "/b201.jpg", "vote_average": 8.1, "popularity": 85, "genre_ids": [18] }
  ]
}
```

`tests/fixtures/search-multi.json`:

```json
{
  "page": 1, "total_pages": 1, "total_results": 3,
  "results": [
    { "id": 101, "media_type": "movie", "title": "Aventura Neon", "release_date": "2024-05-10", "poster_path": null, "popularity": 90 },
    { "id": 777, "media_type": "movie", "title": "Aventura Indisponível", "release_date": "2020-01-01", "poster_path": null, "popularity": 10 },
    { "id": 900, "media_type": "person", "name": "Pessoa Famosa" }
  ]
}
```

`tests/fixtures/movie-101.json`:

```json
{
  "id": 101, "title": "Aventura Neon", "release_date": "2024-05-10", "overview": "Uma aventura brilhante.",
  "poster_path": "/p101.jpg", "backdrop_path": "/b101.jpg", "vote_average": 7.8, "popularity": 90, "runtime": 128,
  "genres": [{ "id": 28, "name": "Ação" }, { "id": 12, "name": "Aventura" }],
  "credits": { "cast": [{ "id": 1, "name": "Atriz Um", "character": "Heroína", "profile_path": null }] },
  "videos": { "results": [{ "key": "abc123", "site": "YouTube", "type": "Trailer", "iso_639_1": "pt", "iso_3166_1": "BR", "official": true }] },
  "watch/providers": { "results": { "BR": { "link": "https://www.themoviedb.org/movie/101/watch?locale=BR", "flatrate": [{ "provider_id": 8, "provider_name": "Netflix", "logo_path": "/netflix.png" }] } } },
  "release_dates": { "results": [{ "iso_3166_1": "BR", "release_dates": [{ "certification": "12" }] }] },
  "recommendations": { "results": [{ "id": 102, "media_type": "movie", "title": "Risos no Escuro", "release_date": "2023-02-01", "poster_path": null }] }
}
```

`tests/fixtures/tv-201.json`:

```json
{
  "id": 201, "name": "Série Brilhante", "first_air_date": "2021-03-03", "overview": "Uma série.",
  "poster_path": "/p201.jpg", "backdrop_path": "/b201.jpg", "vote_average": 8.1, "popularity": 85, "number_of_seasons": 2,
  "genres": [{ "id": 18, "name": "Drama" }],
  "credits": { "cast": [] },
  "videos": { "results": [] },
  "watch/providers": { "results": { "BR": { "link": "https://www.themoviedb.org/tv/201/watch?locale=BR", "flatrate": [{ "provider_id": 307, "provider_name": "Globoplay", "logo_path": "/globoplay.png" }] } } },
  "content_ratings": { "results": [{ "iso_3166_1": "BR", "rating": "14" }] },
  "recommendations": { "results": [] }
}
```

`tests/fixtures/providers.json`:

```json
{ "results": { "BR": { "link": "https://www.themoviedb.org/watch", "flatrate": [{ "provider_id": 8, "provider_name": "Netflix", "logo_path": "/netflix.png" }] } } }
```

`tests/fixtures/videos.json`:

```json
{ "results": [{ "key": "abc123", "site": "YouTube", "type": "Trailer", "iso_639_1": "pt", "iso_3166_1": "BR", "official": true }] }
```

`tests/fixtures/genres-movie.json`:

```json
{ "genres": [{ "id": 28, "name": "Ação" }, { "id": 35, "name": "Comédia" }, { "id": 27, "name": "Terror" }] }
```

`tests/fixtures/genres-tv.json`:

```json
{ "genres": [{ "id": 18, "name": "Drama" }, { "id": 35, "name": "Comédia" }] }
```

- [ ] **Step 2: TMDB simulado**

`tests/e2e/mock-tmdb.mjs`:

```js
// TMDB simulado para os testes de ponta a ponta. Uso: node tests/e2e/mock-tmdb.mjs
import http from 'node:http';
import { readFileSync } from 'node:fs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));

const routes = [
  [/^\/3\/discover\/movie$/, () => fixture('discover-movie')],
  [/^\/3\/discover\/tv$/, () => fixture('discover-tv')],
  [/^\/3\/genre\/movie\/list$/, () => fixture('genres-movie')],
  [/^\/3\/genre\/tv\/list$/, () => fixture('genres-tv')],
  [/^\/3\/search\/multi$/, () => fixture('search-multi')],
  [/^\/3\/search\/keyword$/, (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] })],
  [/^\/3\/(movie|tv)\/\d+\/videos$/, () => fixture('videos')],
  [/^\/3\/(movie|tv)\/(\d+)\/watch\/providers$/, (url, match) => (match[2] === '777' ? { results: {} } : fixture('providers'))],
  [/^\/3\/movie\/101$/, () => fixture('movie-101')],
  [/^\/3\/tv\/201$/, () => fixture('tv-201')],
];

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    for (const [pattern, handler] of routes) {
      const match = url.pathname.match(pattern);
      if (match) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(handler(url, match)));
        return;
      }
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status_message: 'não encontrado' }));
  })
  .listen(4010, () => console.log('TMDB simulado em http://localhost:4010'));
```

- [ ] **Step 3: Configuração do Playwright**

`playwright.config.mjs`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node tests/e2e/mock-tmdb.mjs', port: 4010, reuseExistingServer: !process.env.CI },
    {
      command: 'npm run build && npm run start -- -p 3100',
      port: 3100,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: { TMDB_BASE_URL: 'http://localhost:4010/3', TMDB_READ_TOKEN: 'token-e2e' },
    },
  ],
});
```

- [ ] **Step 4: Escrever os testes**

`tests/e2e/catalogo.spec.js`:

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Nada de rede externa: YouTube e imagens do TMDB ficam bloqueados nos testes.
async function blockExternal(page) {
  await page.route(/youtube-nocookie\.com|image\.tmdb\.org/, (route) => route.abort());
}

async function skipEntry(page, prefs) {
  await page.addInitScript((saved) => {
    sessionStorage.setItem('catalogo:entrou', '1');
    if (saved && !localStorage.getItem('catalogo:prefs')) localStorage.setItem('catalogo:prefs', JSON.stringify(saved));
  }, prefs ?? null);
}

test.describe('tela de entrada', () => {
  test('aparece no Início e some ao clicar em Entrar', async ({ page }) => {
    await blockExternal(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Como você quer se sentir hoje?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeHidden();
  });
});

test.describe('catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternal(page);
  });

  test('Início mostra destaque, humores e fileiras', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Destaque: Aventura Neon' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Relaxar/ })).toHaveAttribute('href', '/explorar?humor=relaxar');
    await expect(page.getByRole('heading', { name: 'Em alta na Netflix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Terror' })).toBeVisible();
  });

  test('busca mostra só títulos disponíveis e Enter abre os resultados', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('combobox', { name: 'Buscar filmes e séries' }).fill('Aventura');
    await expect(page.getByRole('search').getByRole('link', { name: 'Aventura Neon (2024)', exact: true })).toBeVisible();
    await expect(page.getByText('Aventura Indisponível')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Buscar filmes e séries' }).press('Enter');
    await expect(page).toHaveURL(/\/busca\?q=Aventura$/);
    await expect(page.getByRole('heading', { name: 'Resultados para “Aventura”' })).toBeVisible();
  });

  test('página do filme mostra detalhes, onde assistir e recomendações', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/filme/101');
    await expect(page.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeVisible();
    await expect(page.getByText('2h 8min')).toBeVisible();
    await expect(page.getByLabel('Classificação indicativa: 12 anos')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Onde assistir' }).getByRole('img', { name: 'Netflix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Você também pode gostar' })).toBeVisible();
  });

  test('página da série mostra temporadas', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/serie/201');
    await expect(page.getByText('2 temporadas')).toBeVisible();
    await expect(page.getByLabel('Classificação indicativa: 14 anos')).toBeVisible();
  });

  test('título inexistente mostra Não encontrado', async ({ page }) => {
    await skipEntry(page);
    const response = await page.goto('/filme/999');
    expect(response.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Não encontrado' })).toBeVisible();
  });

  test('Explorar troca para séries pelo endereço', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('link', { name: 'Séries' }).click();
    await expect(page).toHaveURL(/tipo=serie/);
    await expect(page.getByRole('link', { name: /Série Brilhante/ })).toBeVisible();
  });

  test('o modo de cor escolhido continua depois de recarregar', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/explorar');
    await page.getByRole('button', { name: 'Abrir configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).getByText('Claro', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'claro');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'claro');
  });

  test('Meus streamings filtra as fileiras do Início', async ({ page }) => {
    await skipEntry(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir configurações' }).click();
    await page.getByRole('checkbox', { name: 'Netflix' }).check();
    await page.getByRole('button', { name: 'Fechar configurações' }).click();
    await expect(page.getByRole('heading', { name: 'Em alta na Globoplay' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Em alta na Netflix' })).toBeVisible();
  });
});

test.describe('acessibilidade (WCAG 2.1 AA)', () => {
  for (const theme of ['escuro', 'claro']) {
    for (const path of ['/', '/explorar', '/filme/101']) {
      test(`${path} no modo ${theme}`, async ({ page }) => {
        await blockExternal(page);
        await skipEntry(page, { version: 1, theme });
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('iframe')
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
      });
    }
  }
});
```

- [ ] **Step 5: Rodar**

Run: `npm run test:e2e`
Expected: PASS em todos (a primeira execução demora por causa do build). Se o axe apontar violações (por exemplo contraste de alguma cor), ajustar o token correspondente em `app/globals.css` ou o rótulo indicado, e rodar de novo até passar. Não remover regras do axe para fazer o teste passar.

- [ ] **Step 6: Verificação final**

Run: `npm test` → Expected: todos os testes de unidade e de componentes passam.
Run: `npm run lint` → Expected: sem erros (avisos sobre `<img>` são aceitáveis: usamos `<img>` de propósito, porque o TMDB já entrega as imagens no tamanho certo).
Run: `npm run build` → Expected: build concluído.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.mjs tests/e2e tests/fixtures
git commit -m "test: testes de ponta a ponta e de acessibilidade com TMDB simulado" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cobertura da especificação

| Seção da especificação | Tarefa |
|---|---|
| 3. Regras fixas | 2 (cliente), 9 (créditos no rodapé) |
| 4. Tecnologia | 1 |
| 5. Identidade visual e modos | 8, 9, 10 |
| 6.1 Tela de entrada | 11 |
| 6.2 Topo | 9, 10, 16 |
| 6.3 Início | 7, 12, 13, 14 |
| 6.4 Explorar | 6, 7, 15 |
| 6.5 Busca | 7, 16 |
| 6.6 Página do título | 5, 7, 17 |
| 6.7 Configurações | 10 |
| 6.8 Rodapé | 9 |
| 7.3 Cache | 2, 7 |
| 7.4 Plataformas e humores | 4, 7 |
| 7.5 Trailer | 5, 13 |
| 7.6 Comportamento por modo | 8, 11, 13 |
| 8. Tratamento de erros | 2, 7, 12, 13, 14, 15, 16, 17 |
| 9. Acessibilidade | 9, 10, 12, 18 |
| 10. Testes | todas; 18 para ponta a ponta e axe |
| 11. Configuração local | 1 |

**Ajustes em relação à especificação:**
- No celular, a busca ocupa uma segunda linha do topo em vez de um menu, porque só há dois links.
- As palavras-chave dos humores são guardadas por nome e convertidas em IDs pela API (com cache de 7 dias), em vez de IDs copiados à mão.
- A página `/busca` mostra até 3 páginas de resultados do TMDB (60 títulos antes do filtro de disponibilidade), e não a lista inteira.
