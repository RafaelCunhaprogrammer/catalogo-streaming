# Etapa B1 – Contas e Perfis: especificação de design

**Data:** 2026-10-17
**Status:** aguardando revisão
**Ramo:** `etapa-b-contas` (a partir de `etapa-a-catalogo`)

## 1. Contexto e objetivo

O Pai d'Égua (Etapa A) é um catálogo aberto dos filmes e séries incluídos nas assinaturas de streaming no Brasil. A Etapa B dá a cada família a sua conta, com perfis e controle dos pais. Ela foi dividida em duas partes:

- **B1 – Contas e Perfis (esta especificação):** cadastro e login, sessão longa, "Quem está assistindo?", vários perfis, perfil Kids com cadeado e PIN dos pais, preferências salvas no perfil.
- **B2 – Listas e Indicações (especificação futura):** FAVORITOS, "Estou assistindo / Já assisti / Continuar assistindo", gêneros favoritos e indicações personalizadas.

**Sucesso significa:**
- uma família cria a conta uma vez e o site abre já logado por semanas;
- cada pessoa tem o seu perfil, com as suas preferências;
- uma criança no perfil Kids não consegue ver conteúdo acima da faixa liberada sem um adulto digitar o PIN, nem sair do perfil para driblar o bloqueio;
- visitantes e recrutadores conseguem experimentar tudo em um clique, pela conta de demonstração.

**Continua valendo da Etapa A:** sem conteúdo adulto para ninguém, sem cobrança real (a assinatura simulada é a Etapa C) e todas as regras de acessibilidade.

## 2. Escopo

### Dentro da B1
- Cadastro, login e "Esqueci minha senha" com e-mail e senha.
- Sessão de 30 dias que se renova com o uso.
- Visitante sem login vê só o Início, em modo vitrine.
- Tela "Quem está assistindo?", com o som de abertura ao escolher o perfil.
- Até 5 perfis por conta: criar, renomear, mudar tipo e faixa, excluir.
- Perfil Kids com faixa de idade, cadeado 🔒, PIN dos pais e saída protegida.
- Preferências (aparência, acessibilidade, "Meus streamings") salvas no perfil.
- Página "Minha conta": trocar senha, trocar PIN, excluir conta.
- Conta de demonstração ("Experimentar sem cadastro").

### Fora da B1
- "Entrar com Google" (pode ser acrescentado depois, sem refazer nada).
- Tudo da B2 (favoritos, listas, indicações).
- Assinatura e planos (Etapa C) e avatares regionais (Etapa D).

## 3. Tecnologia

- **Better Auth**, dentro do próprio projeto Next.js, com login por e-mail e senha.
- **PostgreSQL no Neon** (plano gratuito), acessado com **Drizzle ORM**; migrações com **Drizzle Kit**.
- **Resend** para o e-mail de "Esqueci minha senha". Sem `RESEND_API_KEY`, o link é impresso no terminal (desenvolvimento).
- **PGlite** (PostgreSQL rodando dentro do teste) nos testes de banco.
- As versões exatas e as APIs do Better Auth e do Next 16 (proteção de rotas, server actions) são conferidas na documentação instalada no momento do plano de implementação.

## 4. Regras de acesso

| Quem | O que pode ver |
|---|---|
| **Visitante (sem login)** | A abertura e o **Início em modo vitrine**, só com títulos de classificação **até 14 anos**. Configurações e acessibilidade continuam disponíveis. Qualquer outro destino leva à tela de entrada |
| **Perfil adulto** | Todo o catálogo da Etapa A |
| **Perfil Kids** | O catálogo inteiro aparece na busca e nas listas, mas títulos acima da faixa do perfil ficam com 🔒; o destaque e as fileiras do Início, Filmes e Séries mostram só títulos dentro da faixa |

**Destinos que exigem login:** Filmes, Séries, Categorias, Explorar, Busca, páginas de filme e série, as rotas internas `/api/explorar` e `/api/buscar`, "Quem está assistindo?", "Gerenciar perfis" e "Minha conta". Ao tentar acessar sem login, o visitante vai para `/entrar?voltar=<destino>` com a mensagem **"Entre ou crie sua conta para continuar"** e, depois de entrar, volta ao destino.

**Quem decide é o servidor.** As regras de acesso são aplicadas nas páginas e rotas do servidor, nunca só na tela.

### 4.1 Classificação indicativa

- Ordem: **L < 10 < 12 < 14 < 16 < 18**.
- A classificação de cada título vem do TMDB (`release_dates` para filmes, `content_ratings` para séries, região BR), com o cache de 24 horas que já existe.
- **Título sem classificação no TMDB:** tratado como **bloqueado** no Kids e **fora** da vitrine de visitantes.
- Um título está liberado para uma faixa quando a sua classificação é menor ou igual à faixa.

## 5. Telas e fluxos

### 5.1 Ordem ao abrir o site
1. Abertura (vídeo), como na Etapa A.
2. Visitante: Início em modo vitrine.
3. Com login, sem perfil ativo nesta visita: **"Quem está assistindo?"**. Se a conta tiver um único perfil, ele é ativado direto, sem a tela.
4. Com perfil ativo: Início.

O perfil ativo vale **até o navegador ser fechado** (cookie de sessão). A cada nova visita, a tela de perfis aparece de novo.

### 5.2 Entrar (`/entrar`)
- Campos: e-mail e senha. Links: **Esqueci minha senha** e **Criar conta**.
- Botão **"Experimentar sem cadastro"**, com o aviso "Conta de demonstração · PIN de teste: 1234".
- Depois de entrar: `voltar` (se houver) ou o fluxo da seção 5.1.

### 5.3 Criar conta (`/criar-conta`)
- Campos: nome (1 a 40 caracteres), e-mail e senha (mínimo de 8 caracteres) com confirmação.
- Ao criar: login automático, criação do **primeiro perfil** (adulto, com o nome da pessoa e as preferências que já estavam no navegador) e ida para o Início.

### 5.4 Esqueci minha senha (`/esqueci-senha` e `/redefinir-senha`)
- A pessoa informa o e-mail. A resposta é sempre "Se houver uma conta com este e-mail, enviamos um link".
- O link vale **1 hora** e só pode ser usado uma vez. Ele abre `/redefinir-senha`, com a nova senha e a confirmação.
- Ao redefinir a senha, as outras sessões da conta são encerradas.

### 5.5 "Quem está assistindo?" (`/perfis`)
- Cartões grandes com avatar provisório (inicial do nome sobre uma cor) e o nome. Perfis Kids têm o selo "Kids".
- Ao escolher um perfil: ele vira o perfil ativo, **toca o som de abertura** (o mesmo de `lib/opening-sound.js`; não toca no Modo calmo nem com o som desligado nas preferências **do perfil escolhido**) e o Início abre.
- Botão **Gerenciar perfis**.

### 5.6 Gerenciar perfis (`/perfis/gerenciar`)
- **Adicionar perfil** (até 5): nome (1 a 20 caracteres), cor (8 opções da paleta do site) e tipo.
  - Tipo **Kids** pede a faixa: Livre, 10, 12 ou 14 anos.
  - Se a conta ainda não tem PIN, criar um perfil Kids pede para **criar o PIN** antes (4 números, digitado duas vezes).
- **Editar:** nome, cor, tipo e faixa.
- **Excluir:** pede confirmação; desabilitado quando é o único perfil.
- **Com um perfil Kids ativo,** abrir "Gerenciar perfis" pede o PIN.

### 5.7 Menu do avatar (no topo)
- Mostra o avatar e o nome do perfil ativo. Itens: **Trocar perfil**, **Gerenciar perfis**, **Minha conta** e **Sair**.
- **No Kids,** Trocar perfil, Gerenciar perfis, Minha conta e Sair pedem o PIN.
- Para visitantes, o lugar do avatar mostra o botão **Entrar**.

### 5.8 Cadeado e PIN no Kids
- Cartazes de títulos acima da faixa recebem um **🔒** (ícone `Lock` da Lucide) e o rótulo acessível "Bloqueado para este perfil".
- Clicar num título bloqueado abre a janela **"Este título precisa de um adulto"**, com o campo de PIN.
  - Com o PIN certo, o título é **liberado até o navegador ser fechado** e a página dele abre.
  - Com o PIN errado: "PIN incorreto. Restam N tentativas."
- Abrir pelo endereço a página de um título bloqueado mostra o cadeado e o pedido de PIN **no lugar do conteúdo** (sem sinopse, trailer nem imagem de fundo).
- Liberar um título não libera nenhum outro.

### 5.9 Minha conta (`/conta`)
- **Trocar senha:** senha atual e nova senha com confirmação.
- **Trocar PIN:** pede a senha da conta e o novo PIN duas vezes.
- **Excluir conta:** pede a senha e a confirmação digitando "EXCLUIR". Apaga a conta, os perfis e o PIN.
- Na conta de demonstração, essas três ações ficam desabilitadas, com o aviso "Indisponível na conta de demonstração".

### 5.10 Conta de demonstração
- Criada por um script (`npm run demo:seed`): e-mail `demo@paidegua.app`, PIN `1234` e três perfis: **"Pai"** (adulto), **"Mãe"** (adulto) e **"Pequeno"** (Kids, faixa 10).
- "Experimentar sem cadastro" entra nela sem digitar senha.
- **Reset diário:** ao entrar na conta de demonstração, se o último reset não foi hoje (fuso de Belém, UTC−3), os perfis, as preferências e o PIN voltam ao estado original.

## 6. Dados

### 6.1 Tabelas do Better Auth
`user`, `session`, `account` (com a senha protegida pelo algoritmo do Better Auth) e `verification` (links de redefinição). Geradas pela ferramenta do Better Auth e versionadas como migração do Drizzle.

### 6.2 `profiles`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto (id aleatório) | chave |
| `user_id` | texto | referência a `user.id`, apaga junto com a conta |
| `name` | texto | 1 a 20 caracteres |
| `color` | texto | uma das 8 cores da paleta |
| `kind` | texto | `adulto` ou `kids` |
| `max_rating` | texto ou nulo | `L`, `10`, `12` ou `14` quando `kids`; nulo quando `adulto` |
| `prefs` | JSON | as mesmas preferências da Etapa A (`theme`, `brightness`, `textSize`, `calm`, `highContrast`, `openingSound`, `myProviders`), validadas por `parsePrefs` |
| `created_at` | data e hora | ordem de exibição |

Limite de 5 perfis por conta, conferido no servidor.

### 6.3 `parental_pins`
| Coluna | Tipo | Regra |
|---|---|---|
| `user_id` | texto | chave; referência a `user.id`, apaga junto |
| `pin_hash` | texto | PIN protegido com `scrypt` (módulo `crypto` do Node), com sal |
| `failed_attempts` | inteiro | zera ao acertar |
| `locked_until` | data e hora ou nulo | preenchido na 5ª tentativa errada (agora + 5 minutos) |
| `updated_at` | data e hora | |

### 6.4 `demo_state`
Uma única linha com `last_reset` (data), usada no reset diário.

## 7. Sessão e cookies

| Cookie | Conteúdo | Duração |
|---|---|---|
| Sessão do Better Auth | identifica a sessão | **30 dias**, renovados a cada dia de uso; `HttpOnly`, `Secure` em produção, `SameSite=Lax` |
| `paidegua_perfil` | id do perfil ativo, assinado | até fechar o navegador |
| `paidegua_liberados` | títulos liberados pelo PIN (`movie-123`, `tv-456`), assinado | até fechar o navegador |
| `catalogo_streamings` | "Meus streamings" (já existe) | continua igual, espelhando o perfil ativo |

O servidor sempre confere que o perfil do cookie pertence à conta da sessão; se não pertencer (ou tiver sido excluído), o cookie é apagado e a pessoa volta a "Quem está assistindo?".

## 8. Preferências

- **Visitante:** continuam no navegador (`localStorage`), como na Etapa A.
- **Com perfil ativo:** o `SettingsProvider` passa a ler as preferências do perfil (enviadas pelo servidor na página) e a gravar cada mudança no perfil, por uma ação do servidor, agrupando mudanças seguidas (no máximo uma gravação a cada 500 ms). O `localStorage` passa a ser só um espelho, para o script do `<head>` aplicar o tema sem piscar.
- **Primeiro perfil:** recebe as preferências que estavam no navegador.
- **Novos perfis:** começam com as preferências padrão.

## 9. Mudanças na Etapa A

- **Início para visitantes:** destaque e fileiras filtrados para classificação até 14 anos (seção 4.1).
- **Topo:** botão **Entrar** (visitante) ou menu do avatar (com login), no lugar ao lado de Configurações.
- **Cartazes e página do título:** suporte ao cadeado do Kids.
- **Abertura:** com login e sem perfil ativo, ao terminar segue para "Quem está assistindo?" em vez do Início.
- **Testes de ponta a ponta da Etapa A:** passam a entrar com uma conta de teste antes de navegar pelas páginas internas.

## 10. Segurança

- Senhas protegidas pelo Better Auth; PIN protegido com `scrypt` e sal; nunca guardados como texto.
- Limite de tentativas de login (recurso do Better Auth) e bloqueio do PIN por 5 minutos após 5 erros seguidos.
- Proteção contra envio de formulários por outros sites (origem conferida pelo Better Auth e `SameSite=Lax`).
- Todos os dados de formulário validados no servidor.
- Mensagens que não revelam se um e-mail tem conta.
- Nenhuma consulta ao banco usa dados de um perfil sem conferir o dono.

## 11. Erros e situações-limite

| Situação | Comportamento |
|---|---|
| E-mail ou senha errados | "E-mail ou senha incorretos" |
| Muitas tentativas de login | "Muitas tentativas. Tente de novo em alguns minutos." |
| E-mail já cadastrado | "Já existe uma conta com este e-mail", com link para "Esqueci minha senha" |
| Redefinição com e-mail inexistente | Mesma mensagem de sucesso |
| Link de redefinição vencido ou usado | "Este link expirou", com botão para pedir outro |
| Sessão expirada | Vai para `/entrar?voltar=<destino>` |
| PIN errado | "PIN incorreto. Restam N tentativas." |
| PIN bloqueado | "Muitas tentativas. Tente de novo em M minutos." |
| 6º perfil | Botão "Adicionar perfil" oculto e aviso "Limite de 5 perfis" |
| Excluir o único perfil | Botão desabilitado, com explicação |
| Perfil ativo excluído em outro aparelho | Cookie apagado e volta a "Quem está assistindo?" |
| Banco fora do ar | Vitrine do visitante continua; telas de conta mostram "Não foi possível acessar sua conta agora" com **Tentar novamente** |
| Falha ao enviar e-mail | "Não foi possível enviar o e-mail agora. Tente de novo." |
| Título sem classificação | Bloqueado no Kids e fora da vitrine |

## 12. Acessibilidade

- Todas as telas novas seguem WCAG 2.1 AA, como a Etapa A, e entram na verificação automática (axe).
- Campos com rótulo visível, mensagens de erro ligadas ao campo (`aria-describedby`) e anunciadas (`role="alert"`).
- Campo de PIN com teclado numérico no celular (`inputmode="numeric"`), sem esconder os números de quem usa leitor de tela sem aviso.
- Janela do PIN com foco preso e devolvido ao fechar (mesmo `useDialogFocus` da Etapa A).
- O cadeado tem rótulo acessível; não depende só da cor.

## 13. Testes

Desenvolvimento orientado por testes. Os testes nunca chamam o TMDB real nem o banco Neon.

1. **Regras puras:** comparação de classificações; o que visitante, adulto e Kids (cada faixa) podem ver; limite de perfis; bloqueio do PIN; validação dos formulários; assinatura dos cookies.
2. **Banco e servidor (PGlite):** cadastro, login e renovação da sessão; perfis (criar, editar, excluir; ninguém acessa perfil alheio); PIN protegido e conferido; preferências gravadas no perfil; reset diário da demonstração.
3. **Componentes:** Entrar, Criar conta, Esqueci minha senha, "Quem está assistindo?", Gerenciar perfis, janela do PIN, cadeado nos cartazes, menu do avatar.
4. **Ponta a ponta (Playwright, TMDB simulado e banco de teste):** visitante vê a vitrine e é levado a entrar; criar conta e perfis; criar Kids com PIN; título bloqueado só abre com o PIN; sair do Kids pede o PIN; "Experimentar sem cadastro"; verificação de acessibilidade nas telas novas.

## 14. Configuração

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | endereço do banco no Neon (a pessoa cria a conta gratuita, com passo a passo) |
| `BETTER_AUTH_SECRET` | chave secreta da autenticação e da assinatura dos cookies |
| `BETTER_AUTH_URL` | endereço do site (`http://localhost:3000` no desenvolvimento) |
| `RESEND_API_KEY` | opcional; sem ela, o link de redefinição sai no terminal |
| `EMAIL_FROM` | remetente dos e-mails, quando o Resend estiver configurado |

Todas ficam em `.env.local` (fora do git) e são documentadas em `.env.example`.
