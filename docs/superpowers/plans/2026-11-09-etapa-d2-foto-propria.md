# Etapa D2 – Foto própria: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Perfis adultos usam uma foto (256 × 256, recortada no navegador) como avatar, guardada no Vercel Blob privado e servida só para a conta dona.

**Architecture:** Coluna `profiles.photo_key` + avatar especial `'foto'`. Armazenamento com duas implementações (`@vercel/blob` privado quando há `BLOB_READ_WRITE_TOKEN`; pasta `.data/fotos/` sem ele). Regras em `lib/photos/service.js`, chamadas pelas ações de perfil, pela exclusão de perfil/conta e pela recriação da demonstração. Rota `GET /api/foto/[id]` confere a sessão. No cliente, uma fileira "Sua foto" com recorte no `AvatarPicker`.

**Tech Stack:** Next.js 16 (ler `node_modules/next/dist/docs/` antes de rotas e Server Actions com arquivos), React 19, Drizzle + PostgreSQL (PGlite nos testes), `sharp`, `@vercel/blob`, Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-09-etapa-d2-foto-propria-design.md`

## Global Constraints

- Ramo `etapa-d2-foto-propria`. Um commit por tarefa, em português (`feat: …`/`test: …`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos exatos: "Sua foto", "Escolher foto", "Zoom", "Usar esta foto", "Enviando foto…", "Não foi possível usar essa imagem. Tente outra foto.", "Não foi possível salvar. Tente de novo.".
- Foto: WebP, JPEG ou PNG (pelos primeiros bytes), até **200 KB**, exatamente **256 × 256**. Chave `fotos/<profileId>/<aleatório>.<ext>`.
- Só perfil **adulto** e da conta da sessão; no Kids, área de adulto (PIN), como editar perfil. Nunca aceitar id de perfil sem conferir o dono.
- Apagar arquivo que falha: registrar com `console.error('Foto não apagada:', key)` e seguir.
- Nada de endereço público: o Blob é privado; a foto só sai pela rota da §5 da spec.
- Antes de cada commit: `npx vitest run <arquivos da tarefa>` e `npx eslint <arquivos>`. Nunca rodar a suíte inteira em paralelo com outra (o computador é lento: rode arquivos de teste da tarefa).

## Review Focus

1. Conta A tenta ler ou trocar a foto de um perfil da conta B (rota e ações) → 404 / erro, nada muda.
2. Arquivo com extensão `.jpg` mas conteúdo de outro tipo, 201 KB, ou 300 × 300 → recusado.
3. Trocar foto: a antiga só é apagada depois que a nova foi gravada e o banco aponta para ela.
4. Perfil vira Kids, é excluído, a conta é excluída ou a demonstração é recriada → arquivos apagados.

---

### Task 1: Banco e validação do avatar `'foto'`

**Files:** Modify `lib/db/schema.js`, `lib/profiles.js`; Create `drizzle/0004_*.sql` (`npm run db:generate`); Test `tests/unit/db.test.js`, `tests/unit/profiles.test.js`.

**Interfaces — Produces:** `profiles.photoKey` (`text('photo_key')`, nulo). `validateProfileInput` aceita `avatar: 'foto'` só quando `kind === 'adulto'` (Kids com `'foto'` → `errors.avatar = 'Escolha um dos avatares.'`). `PHOTO_AVATAR = 'foto'` exportado de `lib/avatars.js`.

- [ ] Testes que falham: coluna nula por padrão e gravável; `'foto'` aceito no adulto, recusado no Kids.
- [ ] Rodar → FALHA. Implementar; gerar a migração (só `ADD COLUMN "photo_key" text`). Rodar → PASSA.
- [ ] Commit `feat: coluna da foto do perfil`.

### Task 2: Armazenamento e conferência do arquivo

**Files:** Create `lib/photos/storage.js`, `lib/photos/validate.js`; `npm install @vercel/blob` (versão estável atual, ler a doc do pacote para `put`/`get`/`del` com acesso privado); Test `tests/unit/photos-storage.test.js`, `tests/unit/photos-validate.test.js`.

**Interfaces — Produces:**
- `getPhotoStorage({ env = process.env, dir = '.data/fotos' } = {}) → { put(key, buffer, contentType), get(key) → { body: Buffer, contentType } | null, del(key) }`. Com `env.BLOB_READ_WRITE_TOKEN`: Vercel Blob privado (`addRandomSuffix: false`, `contentType`). Sem: pasta local (cria pastas; `get` de chave inexistente → `null`; `del` de inexistente não lança).
- `checkPhoto(buffer) → { ok: true, ext, contentType } | { ok: false }`: tipo pelos primeiros bytes (WebP `RIFF....WEBP`, JPEG `FF D8 FF`, PNG `89 50 4E 47`), tamanho ≤ 200 × 1024, dimensões 256 × 256 via `sharp(buffer).metadata()`.
- `newPhotoKey(profileId, ext) → 'fotos/<profileId>/<16 hex aleatórios>.<ext>'`.

- [ ] Testes que falham: armazenamento local (put/get/del, get inexistente → null) em pasta temporária; `checkPhoto` com WebP/JPEG/PNG 256×256 gerados pelo `sharp` → ok; PNG 300×300, arquivo de 201 KB, texto com nome `.jpg` → `{ ok: false }`; `newPhotoKey` no formato. A implementação Blob não é testada contra a rede (só que é escolhida quando há token: simular o módulo `@vercel/blob`).
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: armazenamento e conferência das fotos`.

### Task 3: Regras da foto

**Files:** Create `lib/photos/service.js`; Modify `lib/profiles.js` (`updateProfile`, `deleteProfile`), `lib/demo.js` (`resetDemo`), `lib/auth/create-auth.js` (`user.deleteUser.beforeDelete`); Test `tests/unit/photos-service.test.js`, `tests/unit/demo.test.js`.

**Interfaces — Consumes:** Task 1–2. **Produces:**
- `setProfilePhoto(db, storage, userId, profileId, buffer) → { ok: true, photoKey } | { ok: false, error: 'imagem' | 'perfil' }`: perfil da conta e adulto; `checkPhoto`; grava o novo arquivo, depois o banco (`avatar: 'foto'`, `photoKey`), depois apaga o antigo.
- `removeProfilePhoto(db, storage, userId, profileId)`: apaga o arquivo e zera `photoKey` (o avatar fica como o chamador decidir).
- `deletePhotosOf(storage, profiles)`: apaga os arquivos dos perfis dados (usado antes de excluir perfil, conta e na demonstração).
- `updateProfile`: se o avatar salvo deixa de ser `'foto'` ou o tipo vira Kids (aí o avatar vira `defaultAvatar('kids')`), apaga a foto. Recebe `storage` por parâmetro opcional (padrão `getPhotoStorage()`).

- [ ] Testes que falham (armazenamento local em pasta temporária): enviar → arquivo existe e banco aponta; trocar → antigo apagado só depois do novo (simule falha no `put` e confira que o antigo continua e o banco não mudou); voltar para `'acai'` → arquivo some; virar Kids → arquivo some e avatar `'boto'`; perfil de outra conta → `'perfil'`, nada muda; imagem inválida → `'imagem'`; `deleteProfile` e `resetDemo` apagam os arquivos; `del` que lança não impede a exclusão.
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: regras da foto do perfil`.

### Task 4: Rota da foto e avatar com foto

**Files:** Create `app/api/foto/[id]/route.js`; Modify `components/profiles/ProfileAvatar.jsx`, `app/layout.jsx` (perfil do menu leva `id` e `photoKey`); Test `tests/unit/api-foto.test.js`, `tests/components/profile-avatar.test.jsx`.

**Interfaces — Produces:** `GET /api/foto/<profileId>` → 200 com a imagem e `Cache-Control: private, max-age=3600` quando o perfil é da conta da sessão e tem `photoKey`; senão 404. `photoUrl(profile) → '/api/foto/<id>?v=<nome do arquivo sem extensão>' | null`. `ProfileAvatar`: `avatar === 'foto'` e `photoKey` → `<img src={photoUrl} alt="" class="h-full w-full object-cover">`; sem `photoKey` → inicial.

- [ ] Testes que falham: rota com sessão dona → 200 e bytes; outra conta, sem sessão, perfil sem foto → 404. `ProfileAvatar` com foto mostra `img` com `alt=""` e o endereço com `?v=`.
- [ ] Rodar → FALHA. Implementar (ler a doc de Route Handlers do Next 16: `params` é Promise). Rodar → PASSA. Commit `feat: rota privada da foto e avatar com foto`.

### Task 5: Escolher e recortar a foto

**Files:** Create `components/profiles/PhotoCropper.jsx`; Modify `components/profiles/AvatarPicker.jsx` (fileira "Sua foto", só `kind === 'adulto'`), `components/profiles/ProfileForm.jsx`, `lib/actions/conta.js` (`createProfileAction`/`updateProfileAction` leem o arquivo `photo` do FormData e chamam `setProfilePhoto`); Test `tests/components/photo-cropper.test.jsx`, `tests/components/avatar-picker.test.jsx`, `tests/unit/conta-genres.test.js`.

**Interfaces — Produces:** `PhotoCropper({ file, onDone(blob), onCancel })`: mostra a imagem num quadro quadrado; "Zoom" (`<input type="range">`), botões de seta para mover, "Usar esta foto" → `canvas` 256 × 256 → `toBlob('image/webp', 0.85)` (cai para JPEG se vier nulo) → `onDone`. No `ProfileForm`, a foto recortada vai como campo `photo` do FormData e o avatar como `'foto'`; o botão mostra "Enviando foto…" enquanto envia. Erro `'imagem'` → "Não foi possível usar essa imagem. Tente outra foto.".

- [ ] Testes que falham: fileira "Sua foto" no adulto e ausente no Kids; escolher arquivo abre o recorte; "Usar esta foto" chama `onDone` com um blob (simule `HTMLCanvasElement.prototype.toBlob` e `getContext`); a ação com `photo` válido grava a foto, com `photo` inválido devolve o erro da imagem.
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: escolher e recortar a foto do perfil`.

### Task 6: Ponta a ponta e documentação

**Files:** Modify `tests/e2e/personalizacao.spec.js` (novo teste), `tests/fixtures/` (uma foto 256×256 de exemplo, gerada com `sharp` e salva como `foto-teste.png`), `docs/progresso.md` (D2 feita), `.gitignore` (confere que `.data/` já está ignorada).

- [ ] Teste: demonstração, Pai, Gerenciar perfis → Editar → "Escolher foto" (`setInputFiles`) → "Usar esta foto" → Salvar → o menu do topo mostra `img` vinda de `/api/foto/`; voltar para Açaí → a pasta `.data/fotos/<id do Pai>/` fica vazia; axe sem violações com o recorte aberto.
- [ ] `npm run test:e2e -- tests/e2e/personalizacao.spec.js` → PASSA. Commit `test: ponta a ponta da foto própria e progresso da D2`.
