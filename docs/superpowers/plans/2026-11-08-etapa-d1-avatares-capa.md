# Etapa D1 – Avatares e capa do perfil: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada perfil escolhe um dos 12 avatares regionais (no lugar da inicial) e uma capa com a imagem de um favorito no alto da Minha lista, com a cor de destaque tirada da imagem.

**Architecture:** Duas colunas novas em `profiles` (`avatar` text, `cover` jsonb). Os desenhos são SVG em `components/profiles/avatars.jsx`, e a lista e as regras ficam em `lib/avatars.js`. A capa é montada no servidor a partir da marcação de favorito (`profile_titles.snapshot`). A cor vem de `lib/cover-accent.js` (`sharp` + contraste WCAG). A ação `saveCoverAction` usa o perfil ativo da sessão.

**Tech Stack:** Next.js 16 (App Router; ler `node_modules/next/dist/docs/` antes de usar APIs novas), React 19, Drizzle ORM + PostgreSQL (PGlite em dev/testes, Supabase em produção), `sharp`, Tailwind 4, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-08-etapa-d-personalizacao-design.md`
**Protótipo aprovado:** https://claude.ai/artifact/2hFdr3aR1CwZSdHQEG7RQe

## Global Constraints

- Ramo: `etapa-d-personalizacao`, criado a partir do `main`. Um commit por tarefa, mensagem em português no estilo `feat: …` / `test: …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos da interface exatamente como na spec: "Avatar", "Só a inicial", "Frutas e símbolos do Pará", "Bichos da Amazônia", "Escolha um dos avatares.", "Editar capa", "Capa do perfil", "O que aparece no alto da Minha lista", "Filme ou série favorito", "Usar página padrão", "Favorite um filme ou série para usá-lo como capa.", "Não foi possível salvar. Tente de novo.".
- Slugs de avatar: exatamente os de spec §5.1, nesta ordem.
- Toda ação usa o perfil ativo (`getViewer()`). Nenhuma recebe id de perfil do navegador (exceto a edição de perfil já existente, que confere o dono).
- A cor da capa só aparece em enfeites (sublinhado, borda, ponto); nunca em texto. Nos temas `noturno` e alto contraste, ela é ignorada.
- Modo sensorial calmo (`calm:`): nada animado; capa mais escura.
- Rodar `npx vitest run <arquivos da tarefa>` e `npx eslint <arquivos>` antes de cada commit.

## Review Focus

1. **Perfis criados antes da D** (`avatar: null`, `cover: null`): tudo continua igual a hoje (inicial e página padrão). → testes nas Tarefas 3 e 7.
2. **Capa de Kids acima da faixa** (a faixa mudou depois da escolha): a página usa a padrão, e a imagem não é enviada ao navegador. → teste na Tarefa 7.
3. **Capa forjada pelo navegador** (título que não é favorito do perfil, ou favorito sem imagem): a ação recusa. → teste na Tarefa 6.
4. **TMDB lento ou fora do ar ao salvar a capa:** salva em até ~4 s, com `accent: null`. → teste na Tarefa 5.
5. **Contraste:** a cor ajustada tem pelo menos 3:1 com o fundo do tema, para qualquer cor de entrada (preto, branco, cinza médio, saturada). → teste na Tarefa 5.

---

### Task 1: Banco — colunas `avatar` e `cover`

**Files:**
- Modify: `lib/db/schema.js`
- Create: `drizzle/0003_*.sql` (gerado por `npm run db:generate`)
- Test: `tests/unit/db.test.js` (casos novos)

**Interfaces:**
- Produces: em `profiles`, `avatar: text('avatar')` (nulo) e `cover: jsonb('cover')` (nulo).

- [ ] **Step 1: Teste que falha** — perfil novo tem `avatar` e `cover` nulos; gravar `avatar: 'acai'` e `cover: { type: 'movie', id: 1, title: 'X', backdropPath: '/x.jpg', accent: null }` e ler de volta igual.
- [ ] **Step 2:** `npx vitest run tests/unit/db.test.js` → FALHA.
- [ ] **Step 3:** Schema; `npm run db:generate`; conferir que o SQL só faz `ALTER TABLE "profiles" ADD COLUMN` nas duas colunas.
- [ ] **Step 4:** Rodar `tests/unit/db.test.js tests/unit/profiles.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: colunas de avatar e capa no perfil`.

### Task 2: Lista de avatares e validação

**Files:**
- Create: `lib/avatars.js`
- Modify: `lib/profiles.js` (`validateProfileInput`, `createProfile`, `updateProfile`)
- Test: `tests/unit/avatars.test.js`, `tests/unit/profiles.test.js` (casos novos)

**Interfaces:**
- Produces:
  - `AVATARS: { slug, label, set: 'adulto' | 'kids' }[]` (spec §5.1)
  - `AVATAR_GROUPS = [{ set: 'adulto', label: 'Frutas e símbolos do Pará' }, { set: 'kids', label: 'Bichos da Amazônia' }]`
  - `isAvatar(slug) → boolean`
  - `defaultAvatar(kind) → 'acai' | 'boto'`
  - `avatarGroupsFor(kind) → [{ set, label, avatars }]` (Kids: grupo `kids` primeiro)
  - `validateProfileInput` aceita `avatar`: `''`/ausente → `null`; slug válido → slug; outro → `errors.avatar = 'Escolha um dos avatares.'`.

- [ ] **Step 1: Testes que falham** — 12 slugs na ordem da spec; `isAvatar('boto')`, `!isAvatar('mickey')`; `defaultAvatar('kids') === 'boto'`; `avatarGroupsFor('kids')[0].set === 'kids'`; validação com `avatar: 'onca'` → ok; `avatar: ''` → `null`; `avatar: 'x'` → erro; `updateProfile` grava o avatar.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `tests/unit/avatars.test.js tests/unit/profiles.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: lista de avatares regionais e validação`.

### Task 3: Desenhos e `ProfileAvatar`

**Files:**
- Create: `components/profiles/avatars.jsx`
- Modify: `components/profiles/ProfileAvatar.jsx`, `app/layout.jsx` (passa `avatar` no perfil do `UserMenu`)
- Test: `tests/components/profile-avatar.test.jsx`

**Interfaces:**
- Consumes: `AVATARS` (Task 2).
- Produces: `AvatarArt({ slug, simple = false })` → `<svg viewBox="0 0 120 120" aria-hidden="true">` com o desenho do protótipo (copiar os elementos SVG de `project/Main.dc.html` do protótipo, convertendo atributos para JSX: `stroke-width` → `strokeWidth` etc.); `simple` só muda o Açaí. `ProfileAvatar({ profile, size: 'lg' | 'md' | 'sm' })`: com `profile.avatar` válido, desenho sobre `profile.color`; senão, a inicial (como hoje). `md` = 96 px (`h-24 w-24`), cantos `rounded-2xl`.

- [ ] **Step 1: Testes que falham** — com `avatar: 'boto'`, renderiza um `svg` e não a inicial; com `avatar: null` ou `'x'`, mostra a inicial; `size="sm"` com `acai` usa a versão simples (atributo `data-simple="true"` no svg); etiqueta "Kids" só no `lg`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar os 12 desenhos e o `ProfileAvatar`.
- [ ] **Step 4:** Rodar o teste e os que já usam o avatar: `tests/components/profile*.test.jsx tests/components/user-menu*.test.jsx` → PASSA.
- [ ] **Step 5:** Commit `feat: desenhos dos avatares regionais`.

### Task 4: Escolha do avatar no formulário do perfil

**Files:**
- Create: `components/profiles/AvatarPicker.jsx`
- Modify: `components/profiles/ProfileForm.jsx`, `lib/actions/conta.js` (`profileInput` lê `avatar`)
- Test: `tests/components/avatar-picker.test.jsx`, `tests/components/profile-form.test.jsx` (casos novos)

**Interfaces:**
- Consumes: `avatarGroupsFor`, `defaultAvatar`, `AvatarArt`.
- Produces: `AvatarPicker({ kind, color, value, onChange, name = 'avatar' })`: `fieldset` "Avatar" com um `fieldset` por grupo (legenda = rótulo do grupo), rádios com `aria-label` = nome do avatar e a opção "Só a inicial" (`value=""`). A opção marcada tem anel grosso e ✓. Em `ProfileForm`, o campo fica entre "Nome" e "Cor". Na criação, o valor inicial é `defaultAvatar(kind)` e acompanha a troca de tipo enquanto a pessoa não escolher outro. A prévia usa a cor marcada.

- [ ] **Step 1: Testes que falham** — criar adulto: "Açaí" marcado; trocar o tipo para Kids: "Boto" marcado e grupo "Bichos da Amazônia" primeiro; depois de escolher "Onça", trocar o tipo não muda a escolha; editar perfil com `avatar: null`: "Só a inicial" marcada; o `FormData` enviado tem `avatar`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar os dois testes + `tests/unit/conta-*.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: escolha do avatar ao criar e editar o perfil`.

### Task 5: Cor de destaque da capa

**Files:**
- Create: `lib/cover-accent.js`
- Modify: `lib/images.js` (base das imagens lida de `process.env.TMDB_IMAGE_BASE_URL`, padrão `https://image.tmdb.org/t/p`, para o TMDB simulado nos testes)
- Test: `tests/unit/cover-accent.test.js`

**Interfaces:**
- Produces:
  - `contrastRatio(hexA, hexB) → number` (WCAG 2.x)
  - `adjustForBackground(hex, bgHex, min = 3) → hex` (clareia ou escurece em HSL até `>= min`; mantém o matiz)
  - `accentPair(hex) → { dark, light }` (fundos `#0d0820` e `#ffffff`)
  - `extractAccent(backdropPath, { fetchImpl = fetch, timeoutMs = 4000 } = {}) → Promise<{ dark, light } | null>`: baixa `w300`, `sharp(buffer).resize(1, 1).raw()` dá a cor média → `accentPair`. Qualquer erro ou tempo esgotado → `null`.

- [ ] **Step 1: Testes que falham** — `contrastRatio('#000000','#ffffff')` ≈ 21; para `#000000`, `#ffffff`, `#808080`, `#0b2a2e`, `#ff0000`: `contrastRatio(accentPair(c).dark, '#0d0820') >= 3` e `contrastRatio(accentPair(c).light, '#ffffff') >= 3`; `extractAccent` com `fetchImpl` que devolve um PNG 4×4 vermelho gerado com `sharp` → `dark` avermelhado; com `fetchImpl` que rejeita → `null`; com `fetchImpl` que nunca responde e `timeoutMs: 50` → `null` (Review Focus 4 e 5).
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `tests/unit/cover-accent.test.js` + testes que usam `imageUrl` → PASSA.
- [ ] **Step 5:** Commit `feat: cor de destaque tirada da imagem da capa`.

### Task 6: Regras e ação da capa

**Files:**
- Create: `lib/cover.js`
- Modify: `lib/actions/conta.js` (`saveCoverAction`), `lib/profiles.js` (`saveCover(db, userId, profileId, cover | null)`)
- Test: `tests/unit/cover.test.js`, `tests/unit/cover-action.test.js`

**Interfaces:**
- Consumes: `listMarks`, `getMark`, `ratingAllowed`, `extractAccent`.
- Produces:
  - `coverOptions(marks, { maxRating }) → [{ type, id, title, backdropPath }]`: favoritos com `snapshot.backdropPath`; no Kids, só `ratingAllowed(snapshot.certification, maxRating)`; mais recentes primeiro.
  - `visibleCover(cover, { maxRating }, certification) → cover | null` (spec §5.2.5).
  - `saveCoverAction(target: { type, id } | null) → { ok: true } | { ok: false, error: 'perfil' | 'capa' | 'salvar' }`: sem perfil ativo → `'perfil'`; `null` → grava `cover: null`; senão, a marcação precisa existir, ser favorita, ter imagem e (Kids) caber na faixa → senão `'capa'`; monta `{ type, id, title, backdropPath, accent: await extractAccent(...) }`; `revalidatePath('/minha-lista')`.

- [ ] **Step 1: Testes que falham** — `coverOptions` ignora não favoritos e favoritos sem imagem e, no Kids faixa 10, um favorito 14; ação com um título não favorito → `'capa'` (Review Focus 3); com `{ type: 'pessoa', id: 1 }` → `'capa'`; com favorito válido grava `cover` com `accent` do `extractAccent` simulado; `null` → `cover: null`; sem perfil → `'perfil'`.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar os dois testes → PASSA.
- [ ] **Step 5:** Commit `feat: escolher a capa do perfil entre os favoritos`.

### Task 7: Capa na Minha lista

**Files:**
- Create: `components/lists/CoverHeader.jsx`, `components/lists/CoverEditor.jsx`
- Modify: `app/minha-lista/page.jsx`
- Test: `tests/components/cover-header.test.jsx`, `tests/components/cover-editor.test.jsx`

**Interfaces:**
- Consumes: `ProfileAvatar` (`md`), `coverOptions`, `visibleCover`, `saveCoverAction`, `useDialogFocus`, `imageSet`.
- Produces:
  - `CoverHeader({ profile, cover, counts: { favoritos, assistindo, assistidos }, options })`: faixa de spec §6.3; `style` com `--cover-accent-dark` e `--cover-accent-light` quando há `accent`, usados pelas classes da aba ativa e da borda (fora de `noturno` e alto contraste); imagem com `alt=""`; botão "Editar capa".
  - `CoverEditor({ open, onClose, cover, options })`: diálogo de spec §6.4; "Salvar" chama `saveCoverAction` e `router.refresh()`; `'perfil'` → `router.push('/perfis')`; outros erros → "Não foi possível salvar. Tente de novo." em `role="alert"`.
  - A página monta `counts` a partir das marcações e passa `visibleCover(...)`. No Kids, a capa acima da faixa vira `null` antes de chegar ao cliente (Review Focus 2).

- [ ] **Step 1: Testes que falham** — sem capa: sem `img` e com a faixa padrão; com capa: `img` com `alt=""`, contagens no texto, variáveis de cor no `style`; no modo calmo (`data-calm`), classe do degradê forte; editor sem opções: rádio "Filme ou série favorito" desligado e o aviso; escolher outro favorito e salvar chama a ação com `{ type, id }`; "Usar página padrão" chama com `null`; erro mostra o alerta; Esc fecha e devolve o foco ao botão.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar (ler `node_modules/next/dist/docs/` sobre `router.refresh` e `next/image` antes).
- [ ] **Step 4:** Rodar os dois testes + `tests/components/my-list*.test.jsx` → PASSA.
- [ ] **Step 5:** Commit `feat: capa do perfil no alto da Minha lista`.

### Task 8: Demonstração com avatares e capa

**Files:**
- Modify: `lib/demo.js` (`DEMO_PROFILES` com `avatar`; capa do Pai após os exemplos)
- Test: `tests/unit/demo.test.js` (casos novos)

**Interfaces:**
- Consumes: `saveCover`, `extractAccent` (com o mesmo limite de tempo dos exemplos).
- Produces: Pai `acai`, Mãe `ver-o-peso`, Pequeno `boto`; com exemplos, o Pai recebe a capa do filme favorito (spec §5.4).

- [ ] **Step 1: Testes que falham** — avatares dos três perfis; com `examples` simulado, o Pai tem `cover.id` igual ao do filme de exemplo; sem exemplos, `cover` nulo; recriação do dia seguinte desfaz um avatar trocado por visitante.
- [ ] **Step 2:** Rodar → FALHA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `tests/unit/demo.test.js` → PASSA.
- [ ] **Step 5:** Commit `feat: demonstração com avatares e capa`.

### Task 9: Ponta a ponta, documentação e rodada completa

**Files:**
- Create: `tests/e2e/personalizacao.spec.js`
- Modify: `tests/e2e/mock-tmdb.mjs` (rota de imagem `/t/p/w300/*` devolvendo um PNG pequeno), `playwright.config.mjs` (`TMDB_IMAGE_BASE_URL` apontando para o TMDB simulado só no servidor de teste), `docs/progresso.md`, `README.md`

**Interfaces:**
- Consumes: tudo acima; `prepare`, `signInDemo` de `tests/e2e/helpers.js`.

- [ ] **Step 1: Teste de ponta a ponta** — percurso de spec §10, com `AxeBuilder` sem violações em "Quem está assistindo?", no formulário do perfil e na Minha lista com o editor aberto.
- [ ] **Step 2:** `npm run test:e2e -- tests/e2e/personalizacao.spec.js` → PASSA.
- [ ] **Step 3:** Rodada completa: `npx vitest run`, `npm run test:e2e` e `npx eslint .` → tudo passa; anotar os totais.
- [ ] **Step 4:** `docs/progresso.md` (D1 pronta, totais) e README (Etapa D em andamento, linha sobre avatares e capa, imagem nova de "Quem está assistindo?" em `docs/imagens/perfis.webp`).
- [ ] **Step 5:** Commit `test: ponta a ponta da personalização e progresso da D1`.
- [ ] **Step 6:** Revisão de código do ramo inteiro (superpowers:requesting-code-review) antes de juntar ao `main`.
