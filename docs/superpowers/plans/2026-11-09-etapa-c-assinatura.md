# Etapa C – Assinatura (pagamento simulado): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Contas novas entram num teste grátis de 6 h; depois, só quem "assina" (pagamento 100% simulado no site, Pix ou cartão de teste) vê o catálogo além da vitrine. A demonstração está sempre ativa.

**Architecture:** Tabelas `subscriptions` (uma por conta) e `payments`. Regras puras em `lib/subscription/rules.js` e preços em `lib/plans.js`; banco em `lib/subscription/store.js`; ações em `lib/actions/assinatura.js`. O teste começa num gancho de criação de usuário do better-auth; contas antigas ganham o teste no primeiro acesso. Um guarda `requireAccess` substitui `requireProfile` nas páginas de conteúdo. Páginas `/assinar` e `/assinar/pagamento`, faixa do teste no topo e bloco "Assinatura" em `/conta`.

**Tech Stack:** Next.js 16 (ler `node_modules/next/dist/docs/` antes de rotas, `redirect`, Server Actions), React 19, Drizzle + PostgreSQL (PGlite nos testes; Supabase em produção, migração aplicada no build da Vercel), better-auth, Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-09-etapa-c-assinatura-design.md`

## Global Constraints

- Ramo `etapa-c-assinatura`. Um commit por tarefa, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nenhum dinheiro real, nenhum serviço externo.** O número completo do cartão, a validade e o CVV nunca saem do navegador. O servidor recebe só `{ plan, method, testCard, brand, last4 }`, em que `testCard` é `'aprovado'` ou `'recusado'` (calculado no navegador por `cardTestResult`); qualquer outro valor é recusado. Como tudo é simulação, isso basta: o preço e o período vêm sempre do servidor.
- Preços em centavos, só em `lib/plans.js`: mensal 1990 (1 mês), trimestral 5370 (3), semestral 9540 (6), anual 16680 (12, "Mais vantajoso"). O navegador manda só o plano.
- Teste: **6 horas**. Textos exatos da spec: "Ambiente de demonstração: nenhum valor é cobrado.", "Já paguei (simulação)", "Pagamento recusado pelo banco (simulação). Tente outro cartão.", "Use um dos cartões de teste mostrados abaixo.", "Seu teste grátis acabou. Escolha um plano para continuar assistindo.", "Peça para um adulto assinar.", "Cancelar assinatura", "Sua assinatura termina em DD/MM.", "Mais vantajoso", "Começar a assistir", "Teste grátis: faltam X h Y min · Assinar".
- Cartões de teste: `4242 4242 4242 4242` aprovado; `4000 0000 0000 0002` recusado; outro → "Use um dos cartões de teste mostrados abaixo."
- Assinar e cancelar exigem área de adulto (PIN no Kids). Demonstração: sempre ativa; sem "Cancelar"; pagamento simulado não muda nada nela.
- Novas tabelas com RLS ligada, sem políticas (migração SQL como `drizzle/0002_rls_todas_as_tabelas.sql`; o teste de banco existente confere RLS em todas).
- Rodar só os arquivos de teste da tarefa (`--no-file-parallelism` nos de banco) e `npx eslint` nos alterados. Nunca a suíte inteira.

## Review Focus

1. O navegador tenta pagar o plano anual com o preço do mensal, ou aprovar um cartão recusado → o servidor decide pelo plano e por `testCard` válido; nada além disso.
2. Conta sem acesso abre `/filme/1`, `/explorar`, `/busca`, `/minha-lista`, `/api/explorar`, `/api/buscar` → vai para `/assinar?motivo=expirou` (páginas) ou 403 (APIs); vitrine do Início, `/assinar`, `/conta`, `/perfis` continuam.
3. Conta antiga sem linha em `subscriptions` → ganha 6 h, não é trancada.
4. Pagar antes de vencer soma ao período restante; cancelar mantém até `period_end`.
5. Kids sem PIN não assina nem cancela.

---

### Task 1: Banco — `subscriptions` e `payments`

**Files:** Modify `lib/db/schema.js`; Create migração gerada (`npm run db:generate`) e uma migração SQL de RLS para as duas tabelas (seguir o padrão de `0002`; conferir `drizzle/meta/_journal.json`); Test `tests/unit/db.test.js`.

**Produces:** `subscriptions { userId (PK, FK user cascade), status, plan, trialEndsAt, periodEnd, updatedAt }`, `payments { id, userId (FK cascade), plan, amountCents, method, cardLast4, status, createdAt }`.
- [ ] Testes que falham: inserir e ler as duas; excluir o usuário apaga as duas; o teste de RLS existente continua passando com as tabelas novas.
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: tabelas de assinatura e pagamentos`.

### Task 2: Planos e regras puras

**Files:** Create `lib/plans.js`, `lib/subscription/rules.js`; Test `tests/unit/subscription-rules.test.js`.

**Produces:**
- `PLANS` (ordem: mensal, trimestral, semestral, anual) `{ id, label, months, priceCents, perMonthCents, featured }`; `getPlan(id) → plan | null`; `formatBRL(cents) → 'R$ 19,90'`.
- `TRIAL_HOURS = 6`; `trialEnd(createdAt)`.
- `accessState(sub, now) → { kind: 'teste' | 'ativa' | 'sem-acesso', until: Date | null, canceled: boolean }` (spec §5.1; `sub` nulo → `'sem-acesso'` — quem cria a linha é o store).
- `nextPeriodEnd(currentEnd, now, months)` = `max(now, currentEnd)` + `months` meses (calendário).
- `cardTestResult(digits) → 'aprovado' | 'recusado' | 'invalido'` (só dígitos; usado no navegador).
- `remainingText(until, now) → 'faltam 5 h 12 min'`.
- [ ] Testes que falham, um por regra (inclui virada de mês em `nextPeriodEnd`: 31/01 + 1 mês = 28/02 ou 29/02 em ano bissexto — decidir "último dia do mês" e testar).
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: planos e regras da assinatura`.

### Task 3: Gravação — teste, pagamento, cancelamento e demonstração

**Files:** Create `lib/subscription/store.js`; Modify `lib/auth/create-auth.js` (`databaseHooks.user.create.after` cria o teste), `lib/demo.js` (`resetDemo` deixa a demonstração `ativa` com `periodEnd` = amanhã); Test `tests/unit/subscription-store.test.js`, `tests/unit/demo.test.js`.

**Produces:** `getSubscription(db, userId)`; `ensureSubscription(db, userId, now)` (cria teste de 6 h se não houver linha — contas antigas); `startTrial(db, userId, now)`; `recordPayment(db, userId, { plan, method, cardLast4, approved }, now) → { ok, periodEnd }` (aprovado: `status 'ativa'`, `plan`, `periodEnd = nextPeriodEnd(...)`; sempre grava em `payments` com `amountCents` de `getPlan`); `cancelSubscription(db, userId, now)`; `listPayments(db, userId)`.
- [ ] Testes que falham: cadastro (pelo better-auth de teste, `tests/helpers/test-auth.js`) cria teste de 6 h; conta sem linha ganha teste no `ensureSubscription`; pagamento aprovado soma ao período; recusado só registra; cancelar mantém `periodEnd`; demonstração ativa depois do reset.
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: teste grátis, pagamentos e cancelamento no banco`.

### Task 4: Acesso — guarda nas páginas e nas APIs

**Files:** Modify `lib/auth/viewer.js` (ou criar `lib/subscription/access.js`) para expor `getAccess()` (usa `ensureSubscription` + `accessState`; demonstração sempre `ativa`), `lib/auth/guards.js` (`requireAccess(returnTo)` = `requireProfile` + redireciona para `/assinar?motivo=expirou`), as páginas `app/(vitrine)/filmes`, `app/(vitrine)/series`, `app/busca`, `app/explorar`, `app/filme/[id]`, `app/serie/[id]`, `app/minha-lista` (trocar `requireProfile` por `requireAccess`), `app/api/buscar`, `app/api/explorar` (403 sem acesso para quem está logado; visitante continua como hoje), Início para conta sem acesso = vitrine de visitante; Test `tests/unit/guards.test.js` (ou novo `tests/unit/access.test.js`), testes das APIs.

- [ ] Testes que falham: conta em teste e ativa passam; sem acesso → redirect com `motivo=expirou`; APIs 403; conta sem linha ganha teste e passa; demonstração passa.
- [ ] Rodar → FALHA. Implementar (ler a doc de `redirect` do Next 16). Rodar → PASSA. Commit `feat: catálogo só para quem assina ou está no teste`.

### Task 5: Planos e pagamento simulado

**Files:** Create `app/assinar/page.jsx`, `app/assinar/pagamento/page.jsx`, `components/subscription/PlanCards.jsx`, `components/subscription/CheckoutForm.jsx`, `lib/actions/assinatura.js` (`payAction({ plan, method, testCard, brand, last4 })`, `cancelAction()`); Test `tests/components/plans.test.jsx`, `tests/components/checkout.test.jsx`, `tests/unit/assinatura-actions.test.js`.

- Planos: lista com os 4, Anual em destaque com o texto "Mais vantajoso"; visitante vê "Teste grátis de 6 horas ao criar a conta" e o botão leva a `/criar-conta`.
- Pagamento: faixa da demonstração; abas Pix/Cartão (padrão de abas com setas da Minha lista); Pix com QR de mentira (SVG) e "Já paguei (simulação)"; Cartão com campos rotulados (`autocomplete` cc-*), validação no navegador por `cardTestResult`; aprovado → "Assinatura ativa até DD/MM/AAAA" e "Começar a assistir".
- Ação: exige área de adulto; plano válido; `method` ∈ {pix, cartao}; `testCard` ∈ {aprovado, recusado} só no cartão; `last4` 4 dígitos; demonstração → `{ ok: true, demo: true }` sem gravar.
- [ ] Testes que falham: componentes (destaque, preços formatados, abas, recusado, número desconhecido, sucesso) e ação (preço vem do servidor; `testCard` inválido recusado; Kids sem PIN recusado; demonstração não grava).
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: planos e pagamento simulado`.

### Task 6: Faixa do teste, menu e Minha conta

**Files:** Create `components/subscription/TrialBanner.jsx`, `components/subscription/SubscriptionPanel.jsx`; Modify `app/layout.jsx` (faixa quando `teste`), menu (item "Planos" para teste/sem acesso — achar o componente de navegação), `app/conta/page.jsx` (bloco "Assinatura": situação, plano, validade, pagamentos, "Cancelar assinatura" com confirmação; sem cancelar na demonstração); Test `tests/components/trial-banner.test.jsx`, `tests/components/subscription-panel.test.jsx`.
- [ ] Testes que falham: faixa com "Teste grátis: faltam …" e link "Assinar"; sem animação; painel mostra pagamentos e cancela com confirmação; demonstração sem botão.
- [ ] Rodar → FALHA. Implementar. Rodar → PASSA. Commit `feat: faixa do teste e assinatura na Minha conta`.

### Task 7: Ponta a ponta e documentação

**Files:** Create `tests/e2e/assinatura.spec.js`; Modify `docs/progresso.md` (Etapa C pronta), `README.md` (linha da assinatura simulada).
- [ ] Teste com axe: criar conta nova → faixa do teste → forçar fim do teste (rota/ação só de teste? Não: atualizar `trial_ends_at` no banco PGlite do e2e por um script `node` antes de navegar, como os outros scripts de `tests/e2e/`) → abrir `/explorar` leva a `/assinar?motivo=expirou` → pagar com Pix → `/explorar` abre → cancelar na Minha conta → aviso "Sua assinatura termina em …".
- [ ] `npm run test:e2e -- tests/e2e/assinatura.spec.js` → PASSA (e os outros specs continuam passando: a demonstração é ativa). Commit `test: ponta a ponta da assinatura e progresso da Etapa C`.
