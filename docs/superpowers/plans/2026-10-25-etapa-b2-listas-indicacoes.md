# Etapa B2 – Listas e Indicações: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada perfil favorita títulos, marca "Assistindo" (com temporada e episódio) e "Já assisti", vê tudo em Minha lista e no Início ("Continuar assistindo", "Indicados para você"), e escolhe gêneros favoritos.

**Architecture:** Uma tabela `profile_titles` (uma linha por perfil + título, com cópia leve do título) e duas colunas novas em `profiles`. Regras puras em `lib/lists/rules.js`, banco em `lib/lists/store.js`, ações do servidor em `lib/actions/listas.js`. No cliente, um `ListsProvider` (montado no layout) guarda as marcações do perfil ativo para os ♥ e botões; as fileiras pessoais do Início são componentes do servidor em `Suspense`.

**Tech Stack:** Next.js (App Router, ver `node_modules/next/dist/docs/` antes de usar APIs novas), React, Drizzle ORM + PostgreSQL (PGlite em dev/testes), Tailwind 4, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-25-etapa-b2-listas-indicacoes-design.md`

## Global Constraints

- Ramo: `etapa-b-contas`. Um commit por tarefa, mensagem em português no estilo `feat: …` / `test: …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos da interface em português do Brasil, exatamente como na spec (ex.: "Não foi possível salvar. Tente de novo.", "Removido · Desfazer", "Do que você gosta?").
- Toda ação usa o perfil ativo da sessão (`getViewer()`); nenhuma recebe id de perfil do navegador.
- `media_type` ∈ {`movie`, `tv`}; `status` ∈ {`nenhum`, `assistindo`, `assistido`}; limite de **500** marcações por perfil.
- Chave de título no cliente e nos cookies de liberação: `` `${type}-${id}` `` (mesma da B1).
- Cache do TMDB: fileiras/indicações `CACHE.rows` (6 h); detalhes, disponibilidade e temporadas `CACHE.details` (24 h).
- Modo sensorial calmo (`calm:`) desliga animações novas; nada novo depende só de cor.
- Rodar `npx vitest run <arquivos>` da tarefa e `npx eslint <arquivos>` antes de cada commit.

## Review Focus

1. **Cliques repetidos no ♥ ou nos botões** enquanto a gravação anterior não terminou: o estado final tem de bater com o último clique, sem "piscar" nem gravar duas vezes. → teste na Tarefa 5.
2. **Remover da lista um título que saiu do streaming** (o TMDB devolve `null` nos detalhes): a remoção funciona sem precisar do TMDB. → teste na Tarefa 4.
3. **Perfil trocado ou excluído em outra aba** entre abrir a página e clicar: a ação devolve `{ ok: false, error: 'perfil' }` e o cliente manda para "Quem está assistindo?". → teste na Tarefa 4.
4. **Série sem temporadas, ou só com a temporada 0 (especiais):** "Onde você parou" fica escondido e *Assistindo* funciona com `season`/`episode` nulos. → testes nas Tarefas 2 e 6.
5. **Título sem cartaz nem imagem de fundo** na cópia: o cartão do "Continuar assistindo" mostra o fundo neon com o nome, sem imagem quebrada. → teste na Tarefa 8.

---

### Task 1: Banco — tabela `profile_titles`, colunas de gêneros e lista de gêneros

**Files:**
- Modify: `lib/db/schema.js`, `lib/genres.js`, `vitest.config.mjs`
- Create: `drizzle/0001_*.sql` (gerado por `npm run db:generate`)
- Test: `tests/unit/lists-db.test.js`, `tests/unit/genres.test.js`

**Interfaces:**
- Produces: tabela Drizzle `profileTitles` (colunas da spec §4.1, nomes JS em camelCase: `profileId, mediaType, tmdbId, favorite, favoriteAt, status, statusAt, season, episode, snapshot, updatedAt`; PK composta; índices da §4.1). Em `profiles`: `favoriteGenres` (jsonb, default `[]`), `genresPromptDone` (boolean, default `false`).
- Produces: `FAVORITE_GENRES` (array `{ slug, label, movie, tv }` = `GENRE_ROWS` + os 6 da spec §5.1, nesta ordem), `KIDS_FAVORITE_GENRES = ['animacao', 'infantil', 'aventura', 'fantasia']`, `favoriteGenreOptions(kids: boolean) → FAVORITE_GENRES filtrada`, `cleanGenreSlugs(slugs: unknown) → string[]` (só slugs válidos, sem repetidos, na ordem de `FAVORITE_GENRES`).

- [ ] **Step 1: Testes que falham**
  - `lists-db.test.js` (`// @vitest-environment node`, usa `createTestDb`): inserir um perfil e uma linha em `profileTitles`; excluir o perfil apaga a linha (cascade); inserir a mesma (perfil, tipo, id) duas vezes falha; perfil novo tem `favoriteGenres` `[]` e `genresPromptDone` `false`.
  - `genres.test.js`: `FAVORITE_GENRES.map(g => g.slug)` termina em `['suspense','crime','documentario','fantasia','misterio','aventura']`; `suspense.tv === null`; `fantasia.tv === 10765`; `favoriteGenreOptions(true).map(g=>g.slug)` = `['infantil','animacao','fantasia','aventura']` (a ordem de `FAVORITE_GENRES`); `cleanGenreSlugs(['drama','x','drama',3])` = `['drama']`.
- [ ] **Step 2:** `npx vitest run tests/unit/lists-db.test.js tests/unit/genres.test.js` → FALHA.
- [ ] **Step 3:** Schema e gêneros; `npm run db:generate` (confere que o SQL cria a tabela, a FK com `on delete cascade`, os índices e as colunas). Em `vitest.config.mjs`, `testTimeout: 60000` (spec §12).
- [ ] **Step 4:** Rodar os dois testes + `tests/unit/db.test.js tests/unit/profiles.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: tabela de marcações por perfil e gêneros favoritos`.

### Task 2: Regras puras das marcações

**Files:**
- Create: `lib/lists/rules.js`
- Test: `tests/unit/lists-rules.test.js`

**Interfaces:**
- Produces:
  - `STATUSES = ['nenhum','assistindo','assistido']`, `MAX_MARKS = 500`, `EMPTY_MARK = { favorite: false, status: 'nenhum', season: null, episode: null }`
  - `titleKey(type, id) → string` (`'tv-201'`)
  - `parseTarget(type, id) → { type, id } | null` (tipo válido e id inteiro positivo)
  - `nextStatus(current, clicked) → status` (mesmo → `'nenhum'`)
  - `applyChange(mark | null, change, { type, seasons }) → mark` — `change` tem qualquer um de `favorite`, `status`, `season`, `episode`. Regras: §5.2 itens 2, 3, 8; série que entra em *Assistindo* sem posição vai para `seasons[0].number`, episódio 1 (ou `null`/`null` se `seasons` vazio); temporada inexistente é ajustada para a última existente e o episódio para no máximo o total dela; filme nunca tem temporada/episódio.
  - `nextEpisode({ season, episode }, seasons) → { season, episode, finished }` — §5.2 item 4; `finished: true` só no último episódio da última temporada (posição não muda).
  - `isEmptyMark(mark) → boolean`
  - `seasonsWithoutSpecials(rawSeasons) → [{ number, episodes }]` (tira `season_number` 0 e temporadas com 0 episódios)

- [ ] **Step 1: Testes que falham** — um `it` por regra, com estes casos exatos:
  - `nextStatus('assistindo','assistindo') === 'nenhum'`; `nextStatus('assistindo','assistido') === 'assistido'`.
  - favorito + `assistido` convivem; `applyChange({...,status:'assistindo',season:2,episode:5}, {status:'assistido'}, {type:'tv', seasons})` → `season`/`episode` `null`.
  - com `seasons = [{number:1,episodes:8},{number:2,episodes:6}]`: entrar em assistindo → T1 E1; `nextEpisode({season:1,episode:8})` → T2 E1; `nextEpisode({season:2,episode:6})` → `{ season:2, episode:6, finished:true }`.
  - `applyChange(…, {season:5, episode:3}, …)` → T2 E3; `{season:2, episode:99}` → T2 E6.
  - série com `seasons: []` entra em assistindo com `season:null, episode:null` (Review Focus 4).
  - `seasonsWithoutSpecials([{season_number:0,episode_count:3},{season_number:1,episode_count:8}])` → `[{number:1,episodes:8}]`.
  - `parseTarget('tv','201')` → `{type:'tv',id:201}`; `parseTarget('pessoa',1)`, `parseTarget('movie',-3)`, `parseTarget('movie','1e3')` → `null`.
  - `isEmptyMark(EMPTY_MARK) === true`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: regras de favorito, situação e episódio`.

### Task 3: Cópia do título e gravação no banco

**Files:**
- Create: `lib/lists/snapshot.js`, `lib/lists/store.js`
- Modify: `lib/tmdb/catalog.js` (`getTitleDetails` ganha `seasonList`), `lib/profiles.js` (gêneros)
- Test: `tests/unit/lists-store.test.js`, `tests/unit/catalog.test.js` (caso novo)

**Interfaces:**
- Consumes: Task 1 (`profileTitles`, colunas de gêneros, `cleanGenreSlugs`), Task 2 (`applyChange`, `isEmptyMark`, `MAX_MARKS`, `EMPTY_MARK`, `seasonsWithoutSpecials`).
- Produces:
  - `getTitleDetails(...)` passa a incluir `seasonList: [{ number, episodes }]` (séries; `[]` para filmes), via `seasonsWithoutSpecials(raw.seasons ?? [])`.
  - `buildSnapshot(details) → { title, posterPath, backdropPath, year, genreIds, certification, seasons }` (`seasons` = `details.seasonList`).
  - `getMark(db, profileId, type, id) → { favorite, status, season, episode, snapshot } | null`
  - `saveMark(db, profileId, type, id, change, snapshot?) → { ok: true, mark } | { ok: false, error: 'limite' | 'sem-dados' }` — aplica `applyChange` sobre a linha atual (usando `snapshot ?? linha.snapshot` para as temporadas); apaga a linha se ficar vazia; ao criar linha nova sem `snapshot` devolve `'sem-dados'`; ao criar a 501ª devolve `'limite'`; atualiza `favoriteAt`/`statusAt` só quando o respectivo campo muda; `updatedAt` sempre.
  - `refreshSnapshot(db, profileId, type, id, snapshot) → void` (só se a linha existir)
  - `listMarks(db, profileId) → row[]` (todas, para o provedor e a Minha lista)
  - `continueWatching(db, profileId, limit = 20) → row[]` (status `assistindo`, `statusAt` desc)
  - `recentSeeds(db, profileId, limit = 5) → [{ type, id }]` (favoritos ou `assistido`, pelo mais recente entre `favoriteAt`/`statusAt`)
  - `markIndex(rows) → { [titleKey]: { favorite, status, season, episode } }`
  - Em `lib/profiles.js`: `saveFavoriteGenres(db, userId, profileId, slugs) → string[] | null` (limpa com `cleanGenreSlugs`, marca `genresPromptDone = true`) e `dismissGenresPrompt(db, userId, profileId) → boolean`.

- [ ] **Step 1: Testes que falham** (`lists-store.test.js`, node, `createTestDb`, perfil criado com `createProfile`):
  - favoritar cria a linha com a cópia; desfavoritar sem situação apaga a linha.
  - a cópia não muda em `saveMark` sem `snapshot`; `refreshSnapshot` troca o cartaz.
  - remover (favorite:false) de um título já marcado funciona **sem** `snapshot` (Review Focus 2); criar sem `snapshot` → `'sem-dados'`.
  - com 500 linhas, a 501ª → `'limite'`; mudar uma das 500 continua funcionando.
  - `continueWatching` ordena pelo mais recente; outro perfil não vê as linhas deste.
  - `recentSeeds` devolve no máximo 5.
  - `saveFavoriteGenres(db, userId, outroPerfilDeOutraConta, …)` → `null`.
  - `catalog.test.js`: com o TMDB simulado devolvendo `seasons` com a temporada 0, `getTitleDetails('tv', …).seasonList` não a inclui.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `lists-store`, `catalog`, `profiles` → PASSA.
- [ ] **Step 5:** Commit `feat: gravação das marcações com cópia do título`.

### Task 4: Ações do servidor

**Files:**
- Create: `lib/actions/listas.js` (`'use server'`)
- Test: `tests/unit/listas-actions.test.js`

**Interfaces:**
- Consumes: Task 3 (store, `buildSnapshot`, `getTitleDetails`), `getViewer`, `getDb`, `ratingAllowed` (`lib/tmdb/ratings.js`), `titleKey`.
- Produces (todas devolvem `{ ok: false, error }` com `error` ∈ `'perfil' | 'pin' | 'limite' | 'invalido' | 'erro'`):
  - `markTitleAction(type, id, change) → { ok: true, mark }` — `change` só com chaves `favorite` (boolean), `status` (de `STATUSES`), `season`/`episode` (inteiros ≥ 1); qualquer outra coisa → `'invalido'`. Busca `getTitleDetails` só quando a linha ainda não existe ou quando a mudança precisa das temporadas e a cópia não as tem.
  - `nextEpisodeAction(id) → { ok: true, mark, finished }` (série)
  - `seasonEpisodesAction(id, season) → { ok: true, episodes: [{ number, name }] }` (`/tv/{id}/season/{n}`, cache 24 h)
  - `saveGenresAction(slugs) → { ok: true, genres }`; `dismissGenresPromptAction() → { ok: true }`
- Regras de acesso: sem usuário ou sem perfil ativo → `'perfil'`; Kids com título acima da faixa (`certification` da cópia ou dos detalhes) e fora de `viewer.unlocked` → `'pin'`; em Kids, gêneros fora de `KIDS_FAVORITE_GENRES` são descartados. Ao fim de cada gravação, `revalidatePath('/minha-lista')` e `revalidatePath('/')`.

- [ ] **Step 1: Testes que falham** (`vi.mock` de `@/lib/auth/viewer`, `@/lib/db` com `createTestDb`, `@/lib/tmdb/catalog`, `next/cache`):
  - visitante → `'perfil'`; viewer com `needsProfile` → `'perfil'` (Review Focus 3).
  - `markTitleAction('movie', 101, { favorite: true })` grava e devolve `mark.favorite === true`.
  - `change` com `profileId` ou `status: 'visto'` → `'invalido'`.
  - Kids `maxRating: '10'` + título `'14'` → `'pin'`; o mesmo título em `unlocked` → ok.
  - remover favorito de título já marcado com `getTitleDetails` devolvendo `null` → ok (Review Focus 2).
  - `nextEpisodeAction` no último episódio → `finished: true`.
  - no Kids, `saveGenresAction(['acao','animacao'])` → `genres: ['animacao']`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: ações para favoritar, marcar situação, episódio e gêneros`.

### Task 5: `ListsProvider` e ♥ nos cartazes

**Files:**
- Create: `components/lists/ListsProvider.jsx`, `components/lists/FavoriteButton.jsx`, `components/lists/useMarkAction.js`
- Modify: `app/layout.jsx`, `components/PosterCard.jsx`, `components/kids/LockedPosterCard.jsx`
- Test: `tests/components/favorite-button.test.jsx`

**Interfaces:**
- Consumes: Task 4 (`markTitleAction`), Task 3 (`listMarks`, `markIndex`), `PinDialog` (purpose `'titulo'`, `titleKey`).
- Produces:
  - `<ListsProvider initialMarks={markIndex(...)}>` (layout: só com perfil ativo; sem perfil, não monta).
  - `useLists() → { enabled, getMark(type, id), setLocalMark(type, id, mark), announce(text) } ` — `enabled` falso fora do provedor; `announce` escreve numa região `aria-live="polite"` única do provedor.
  - `useMarkAction(title) → { mark, pending, run(change, { message }) , pinDialog }` — atualização otimista, desfaz em erro com o aviso "Não foi possível salvar. Tente de novo.", trata `'pin'` abrindo `PinDialog` e repetindo após o PIN, `'perfil'` → `router.push('/perfis')`, `'limite'` → aviso da spec §10. Enquanto `pending`, novos `run` ficam na fila e só o último é enviado (Review Focus 1).
  - `<FavoriteButton title={{ id, type, title }} variant="card" | "page" />`
- `PosterCard` passa a ser `<div className="group/card relative …largura…">` com o `<Link>` e o `<FavoriteButton variant="card">` **irmãos**; visível com `group-hover/card` e `focus-visible`, sempre visível se favorito ou em `@media (hover: none)`.

- [ ] **Step 1: Testes que falham**
  - sem provedor, o cartaz não tem botão ♥.
  - com provedor, o ♥ **não** está dentro do link (`link.contains(button) === false`) e tem o nome "Favoritar Duna"; ao clicar, `aria-pressed="true"`, nome "Remover Duna dos favoritos" e a região viva diz "Duna adicionado aos favoritos".
  - ação devolvendo `{ ok:false, error:'erro' }` → volta a `aria-pressed="false"` e aparece "Não foi possível salvar. Tente de novo.".
  - três cliques rápidos com a ação lenta → estado final favorito e a ação chamada no máximo 2 vezes, a última com `{ favorite: true }` (Review Focus 1).
  - `'pin'` → abre o diálogo "Área de adultos"/PIN; após o PIN, repete a ação.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar; no layout, carregar `listMarks` do perfil ativo e envolver o conteúdo com o provedor.
- [ ] **Step 4:** Rodar este teste + `poster-row-mood`, `kids`, `explore` → PASSA.
- [ ] **Step 5:** Commit `feat: favoritar pelo cartaz`.

### Task 6: Botões na página do título e "Onde você parou"

**Files:**
- Create: `components/lists/TitleActions.jsx`
- Modify: `components/TitlePage.jsx`
- Test: `tests/components/title-actions.test.jsx`

**Interfaces:**
- Consumes: Task 5 (`useMarkAction`, `FavoriteButton variant="page"`), Task 4 (`nextEpisodeAction`, `seasonEpisodesAction`), Task 3 (`refreshSnapshot`, `buildSnapshot`).
- Produces: `<TitleActions title={{ id, type, title }} seasons={seasonList} />`, colocado logo abaixo do bloco "Onde assistir" de `TitleView`. `TitlePage` chama `refreshSnapshot` quando há perfil ativo (sem bloquear a página; erro ignorado).

- [ ] **Step 1: Testes que falham**
  - filme: três botões "Favoritar *X*", "Assistindo", "Já assisti", com `aria-pressed`; marcar *Já assisti* desmarca *Assistindo*; clicar de novo no marcado desmarca.
  - série em *Assistindo* mostra "Onde você parou" com Temporada e Episódio; os episódios vêm de `seasonEpisodesAction` ("5 – Nome").
  - "+1 episódio" chama `nextEpisodeAction`; com `finished: true` aparece a pergunta "Marcar como Já assisti?" com Sim / Agora não.
  - série com `seasons=[]` em *Assistindo*: sem "Onde você parou" (Review Focus 4).
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar este teste + `title-page` → PASSA.
- [ ] **Step 5:** Commit `feat: botões de lista e onde você parou na página do título`.

### Task 7: Página Minha lista e item no menu

**Files:**
- Create: `app/minha-lista/page.jsx`, `components/lists/MyListView.jsx`, `components/lists/UndoToast.jsx`
- Modify: `components/NavMenus.jsx` (`NAV` ganha `{ href: '/minha-lista', label: 'Minha lista' }` como 5º item, renderizado depois de Explorar no desktop e no ☰)
- Test: `tests/components/my-list.test.jsx`, `tests/components/header-nav.test.jsx` (item novo)

**Interfaces:**
- Consumes: Task 3 (`listMarks`), Task 4 (`markTitleAction`), Task 5 (`useLists`, `PosterCard`), `requireProfile('/minha-lista')`, `ratingAllowed` + `viewer.unlocked` para `locked`.
- Produces: página com `metadata.title = 'Minha lista'`; `MyListView({ items, initialTab })`, `items` = `[{ id, type, title, posterPath, year, favorite, status, favoriteAt, statusAt, locked }]`; `UndoToast({ message, onUndo, onClose, seconds = 6 })`.

- [ ] **Step 1: Testes que falham**
  - abas `role="tab"` "Favoritos (2)", "Assistindo (1)", "Já assisti (0)"; setas do teclado trocam de aba; a aba vai para `?aba=` (`router.replace`).
  - filtro Todos/Filmes/Séries e ordem Mais recentes/A–Z.
  - aba vazia: "Você ainda não tem favoritos. Toque no ♡ em qualquer título." e link para `/explorar`.
  - "Remover desta lista" tira o item e mostra "Removido · Desfazer"; Desfazer chama `markTitleAction` com os valores anteriores e o item volta.
  - item `locked` aparece como cartaz com cadeado.
  - no topo, o link "Minha lista" aponta para `/minha-lista`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar (recarregar com `router.refresh()` no `visibilitychange` para `visible`).
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: página Minha lista`.

### Task 8: Fileira "Continuar assistindo"

**Files:**
- Create: `components/lists/ContinueRow.jsx` (servidor) e `components/lists/ContinueCard.jsx` (cliente)
- Modify: `components/HomeView.jsx`
- Test: `tests/components/continue-row.test.jsx`

**Interfaces:**
- Consumes: Task 3 (`continueWatching`), `getTitleDetails` (providers, `watchLink`, `seasonList`), `watchUrl`, Task 4 (`nextEpisodeAction`), Task 5 (`useMarkAction`).
- Produces: `ContinueRow({ viewer })` em `Suspense` logo depois do destaque, só no Início (`type` indefinido) e com perfil ativo; não renderiza nada sem itens. `ContinueCard({ item })`, `item = { id, type, title, backdropPath, season, episode, provider: { name, href } | null, newEpisodes: boolean, locked }`.
- "Novos episódios": `seasonList` do TMDB tem temporada maior que a última da cópia **e** a posição guardada é o último episódio da cópia.

- [ ] **Step 1: Testes que falham** (`ContinueCard` e a função pura `toContinueItem(row, details)` exportada de `ContinueRow.jsx`):
  - cartão de série: "Parei no T2 E5", botão "Assistir *X* na Netflix" com o link da plataforma, botão "+1 episódio".
  - sem plataforma: link "Ver onde assistir" para `/serie/201`.
  - `toContinueItem` com temporada nova → `newEpisodes: true` e o cartão mostra "Novos episódios".
  - `backdropPath: null` → fundo neon com o nome, sem `<img>` (Review Focus 5).
  - filme: sem "Parei no" e sem "+1 episódio".
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar (detalhes com `settledWithLimit`, máx. 8; falha num título → cartão sem plataforma).
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: fileira Continuar assistindo no Início`.

### Task 9: "Indicados para você"

**Files:**
- Create: `lib/recommendations.js`
- Modify: `components/HomeView.jsx`
- Test: `tests/unit/recommendations.test.js`

**Interfaces:**
- Consumes: Task 3 (`recentSeeds`, `listMarks`), `FAVORITE_GENRES`, `filterAvailable`, `annotateRatings`/`filterByRating`, `isKidsTitle`, `kidsGenreParam`, `belemDate` (`lib/demo.js`), `tmdbFetch`, `normalizeTitle`, `CACHE`.
- Produces:
  - `pickDailyGenres(slugs, profileId, date, n = 3) → string[]` (determinístico por `profileId + date`)
  - `interleave(...lists) → title[]` (alterna, sem repetir `titleKey`)
  - `getRecommendations({ profile, myProviders, viewer, now = new Date() }) → title[]` (até 20; §7 da spec, com 40 candidatos)
  - Em `HomeView`: `RecommendationsSection` em `Suspense` com o título "Indicados para você", depois do "Continuar assistindo"; sem resultado não aparece.

- [ ] **Step 1: Testes que falham**
  - `pickDailyGenres` igual para o mesmo perfil e dia, diferente entre dias (com 6 gêneros), no máximo 3.
  - `interleave([a,b],[c,a])` → `[a,c,b]`.
  - `getRecommendations` (TMDB simulado com `vi.mock` de `tmdbFetch`/`filterAvailable`): tira títulos já marcados; usa `vote_average.gte: 7` e `vote_count.gte: 200` no `discover`; gênero `suspense` não busca séries; Kids só devolve `isKidsTitle` dentro da faixa; sem sementes e sem gêneros → `[]` sem chamar o TMDB.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: fileira Indicados para você`.

### Task 10: Gêneros favoritos — criar perfil, editar e convite

**Files:**
- Create: `components/lists/GenrePicker.jsx`, `components/lists/GenresInvite.jsx`
- Modify: `components/profiles/ProfileForm.jsx`, `components/profiles/ProfileManager.jsx`, `lib/actions/conta.js` (`updateProfileAction` também salva `genres` do formulário), `components/HomeView.jsx`
- Test: `tests/components/genres.test.jsx`, `tests/components/profiles.test.jsx` (casos novos)

**Interfaces:**
- Consumes: Task 1 (`favoriteGenreOptions`), Task 4 (`saveGenresAction`, `dismissGenresPromptAction`), Task 3 (`saveFavoriteGenres`).
- Produces: `GenrePicker({ kids, value, onChange, name? })` — botões `aria-pressed`, com `name` gera `<input type="hidden">` por gênero para formulários; `GenresInvite()` no Início quando `profile.genresPromptDone === false` (no lugar dos Indicados se estes estiverem vazios, senão logo abaixo deles).

- [ ] **Step 1: Testes que falham**
  - `GenrePicker` adulto mostra 14 gêneros; Kids mostra Infantil, Animação, Fantasia e Aventura.
  - depois de criar um perfil em Gerenciar perfis aparece "Do que você gosta?"; "Concluir" chama `saveGenresAction` com os escolhidos; "Pular" chama `dismissGenresPromptAction`.
  - editar perfil mostra os gêneros atuais marcados e envia `genres` no formulário.
  - convite do Início: "Salvar" chama `saveGenresAction`; "Agora não" chama `dismissGenresPromptAction` e o convite some.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASSA.
- [ ] **Step 5:** Commit `feat: gêneros favoritos do perfil`.

### Task 11: Exemplos na conta de demonstração

**Files:**
- Create: `lib/lists/demo-examples.js`
- Modify: `lib/demo.js` (`resetDemo`/`resetDemoIfNeeded`/`ensureDemoAccount` aceitam `{ examples }`), `lib/actions/conta.js` (passa `examples: loadDemoExamples`)
- Test: `tests/unit/demo.test.js` (casos novos)

**Interfaces:**
- Consumes: Task 3 (`saveMark`, `buildSnapshot`, `saveFavoriteGenres`), `getTitleDetails`, `tmdbFetch`.
- Produces: `loadDemoExamples() → { movie: details | null, tv: details | null }` (primeiros da tendência da semana com plataforma no Brasil); `resetDemo(db, userId, now, { examples } = {})` — após criar os perfis, se `examples` existir, chama-o e grava no **Pai**: filme favorito, série em *Assistindo* T1 E3, gêneros `['acao','comedia','ficcao']`. Erro em `examples` é ignorado.

- [ ] **Step 1: Testes que falham**
  - com `examples` simulado: Pai tem 1 favorito, 1 série em T1 E3 e os 3 gêneros; Mãe e Pequeno sem marcações.
  - `examples` que lança erro: demonstração criada normalmente, sem marcações.
  - reset do dia seguinte apaga marcações feitas por visitantes.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `tests/unit/demo.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: demonstração já vem com listas de exemplo`.

### Task 12: Ponta a ponta, documentação e rodada completa

**Files:**
- Create: `tests/e2e/listas.spec.js`, `tests/fixtures/tv-201-season-1.json`
- Modify: `tests/e2e/mock-tmdb.mjs` (rotas `/3/(movie|tv)/\d+/recommendations` → `discover-*`, `/3/tv/201/season/\d+` → fixture nova), `tests/fixtures/tv-201.json` (`seasons`: 0 com 2 episódios, 1 com 8, 2 com 6), `docs/progresso.md` (B2 marcada como pronta)

**Interfaces:**
- Consumes: tudo acima; helpers `prepare`, `signInDemo` de `tests/e2e/helpers.js`.

- [ ] **Step 1: Teste de ponta a ponta** — percurso da spec §12, com `AxeBuilder` sem violações na Minha lista e na página da série: favoritar pelo cartaz no Início → abrir `/serie/201`, marcar *Assistindo*, "+1 episódio" (vê "T1 E2") → no Início, "Continuar assistindo" mostra "Parei no T1 E2" → Minha lista: Favoritos (1), remover e Desfazer → trocar para o Kids (PIN 1234), abrir um título liberado e favoritar.
- [ ] **Step 2:** `npm run test:e2e -- tests/e2e/listas.spec.js` → PASSA.
- [ ] **Step 3:** Rodada completa: `npx vitest run` e `npm run test:e2e` e `npx eslint` → tudo passa; anotar os totais.
- [ ] **Step 4:** Atualizar `docs/progresso.md` (B2 com os itens feitos e os totais de testes).
- [ ] **Step 5:** Commit `test: ponta a ponta das listas e progresso da B2`.
