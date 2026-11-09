# Etapa C – Assinatura (pagamento simulado): especificação de design

**Data:** 2026-11-09
**Status:** aguardando revisão
**Ramo:** `etapa-c-assinatura`

## 1. Objetivo

Mostrar no portfólio o fluxo de assinatura de um streaming: planos, teste grátis, pagamento e acesso só para quem assina. **Nenhum dinheiro de verdade é cobrado.** O pagamento é uma simulação dentro do próprio site (decisão de 09/11/2026), sem Stripe nem Mercado Pago, sem conta externa e sem chaves.

**Sucesso:** quem cria uma conta já entra no teste grátis, vê quanto tempo falta, escolhe um plano, "paga" com Pix ou cartão de mentira, e o acesso continua. Visitantes e a demonstração continuam funcionando como hoje.

## 2. Escopo

### Dentro
- Página **Planos** (`/assinar`) com os quatro planos.
- **Teste grátis de 6 horas**, que começa ao criar a conta.
- **Pagamento simulado** (`/assinar/pagamento?plano=…`) com Pix e cartão.
- **Acesso:** a conta sem assinatura nem teste vê só a vitrine e as páginas de conta (§5.3).
- **Minha conta:** situação da assinatura, histórico de pagamentos simulados e "Cancelar assinatura".
- **Demonstração:** sempre com assinatura ativa.

### Fora
- Cobrança real, nota fiscal, cupons e trocar de plano no meio do período (a troca vale a partir do fim do período atual).
- Renovação automática: no fim do período, a assinatura expira e pede para renovar (§5.2).

## 3. Planos (valores fictícios, só para a demonstração)

| Plano | Preço | Equivale a | Destaque |
|---|---|---|---|
| Mensal | R$ 19,90 | R$ 19,90/mês | |
| Trimestral | R$ 53,70 | R$ 17,90/mês | |
| Semestral | R$ 95,40 | R$ 15,90/mês | |
| **Anual** | **R$ 166,80** | **R$ 13,90/mês** | **"Mais vantajoso"** (economiza 30%) |

Os valores ficam em centavos em `lib/plans.js`. O navegador nunca diz o preço, só o plano.

## 4. Dados

### 4.1 `subscriptions` (uma por conta)

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | text, PK | referência a `user.id`, `on delete cascade` |
| `status` | text | `'teste'`, `'ativa'`, `'cancelada'` (ativa até o fim do período) |
| `plan` | text | `mensal` \| `trimestral` \| `semestral` \| `anual`, ou `null` no teste |
| `trial_ends_at` | timestamp | criação da conta + 6 h |
| `period_end` | timestamp | fim do período pago, ou `null` |
| `updated_at` | timestamp | |

### 4.2 `payments` (histórico simulado)

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | text, PK | |
| `user_id` | text | `on delete cascade` |
| `plan` | text | |
| `amount_cents` | integer | vem de `lib/plans.js` |
| `method` | text | `'pix'` \| `'cartao'` |
| `card_last4` | text | só os 4 últimos dígitos, ou `null` |
| `status` | text | `'aprovado'` \| `'recusado'` |
| `created_at` | timestamp | |

As duas tabelas com RLS ligada e sem políticas, como as outras.

## 5. Regras

### 5.1 Situação da conta (`accessState(subscription, now)`)
- **teste:** `now < trial_ends_at` e sem período pago → acesso total, faixa "Teste grátis: faltam X h".
- **ativa:** `now < period_end` (status `ativa` ou `cancelada`) → acesso total.
- **sem acesso:** nenhum dos casos acima.
- Contas criadas **antes** da Etapa C (sem linha em `subscriptions`): ganham um teste novo de 6 horas no primeiro acesso, para ninguém ser trancado de surpresa.

### 5.2 Pagamento
1. O plano vem da página, e o preço vem de `lib/plans.js`.
2. **Pix:** mostra um QR Code de mentira, com a marcação "simulação", e o botão "Já paguei (simulação)". O pagamento é aprovado.
3. **Cartão:** campos de número, validade, CVV e nome, só no navegador. O servidor recebe **apenas** a bandeira, os 4 últimos dígitos e o resultado. Cartões de teste aceitos:
   - `4242 4242 4242 4242` → aprovado
   - `4000 0000 0000 0002` → recusado ("Pagamento recusado pelo banco (simulação). Tente outro cartão.")
   - qualquer outro número → "Use um dos cartões de teste mostrados abaixo."
4. Aprovado: `status = 'ativa'`, `plan`, e `period_end = max(now, period_end atual) + duração do plano`. Assim, pagar antes de vencer soma ao tempo que já havia.
5. Cada tentativa vira uma linha em `payments`.
6. Toda a tela de pagamento mostra a faixa: "Ambiente de demonstração: nenhum valor é cobrado."

### 5.3 Acesso
- **Visitante (sem conta):** como hoje, só a vitrine do Início.
- **Conta sem acesso:** o Início continua (vitrine), e `/assinar`, `/conta` e `/perfis` funcionam. As outras páginas mandam para `/assinar?motivo=expirou`, com "Seu teste grátis acabou. Escolha um plano para continuar assistindo."
- **Perfil Kids:** assinar e cancelar pedem o PIN dos pais (área de adulto). A criança vê "Peça para um adulto assinar."
- **Demonstração:** sempre `ativa` (recriada todo dia com `period_end` = amanhã). O botão de cancelar não aparece, e o pagamento pode ser testado, mas não muda nada.

### 5.4 Cancelar
"Cancelar assinatura" pede confirmação. O status vira `cancelada`, e o acesso continua até `period_end`, com o aviso "Sua assinatura termina em DD/MM."

## 6. Telas

- **Planos (`/assinar`):** quatro cartões, o Anual em destaque. Cada um tem o botão "Assinar" e uma linha "Teste grátis de 6 horas ao criar a conta" para visitantes.
- **Pagamento:** resumo do plano à esquerda e, à direita, as abas Pix e Cartão. Depois de aprovado: "Assinatura ativa até DD/MM/AAAA" e o botão "Começar a assistir".
- **Faixa do teste:** fina, sob o topo, com "Teste grátis: faltam 5 h 12 min · Assinar". Fica oculta no Modo calmo? Não: é informação, então fica, mas sem animação.
- **Minha conta:** novo bloco "Assinatura", com a situação, o plano, até quando vale, os pagamentos simulados e o botão "Cancelar assinatura".
- **Menu:** item "Planos" para quem está no teste ou sem acesso.

## 7. Acessibilidade

- Planos em lista. O cartão em destaque diz "Mais vantajoso" em texto, não só pela cor.
- As abas Pix e Cartão seguem o padrão de abas com setas, como na Minha lista.
- Os campos do cartão têm `autocomplete="cc-number"` e outros, com rótulos visíveis e mensagens de erro ligadas ao campo.
- O tempo restante do teste aparece em texto, sem contagem regressiva que se mexe.

## 8. Testes

- **Unidade:** `accessState` (teste, ativa, cancelada dentro do período, expirada, conta antiga); soma de períodos; preços e validação do plano; as regras dos cartões de teste.
- **Banco:** teste criado junto com a conta; pagamento aprovado e recusado gravados; cancelamento; demonstração sempre ativa.
- **Componentes:** página de planos (destaque, preços), pagamento (abas, cartão recusado, número desconhecido), faixa do teste e bloco da Minha conta.
- **Ponta a ponta com axe:** criar conta → ver a faixa do teste → simular o fim do teste → ser levado a `/assinar` → pagar com Pix → voltar a navegar → cancelar na Minha conta.
