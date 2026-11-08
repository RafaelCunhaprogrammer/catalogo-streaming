# Etapa D – Personalização: especificação de design

**Data:** 2026-11-08
**Status:** aguardando revisão
**Ramo:** `etapa-d-personalizacao`
**Protótipo aprovado:** https://claude.ai/artifact/2hFdr3aR1CwZSdHQEG7RQe (três telas: avatares, "Quem está assistindo?" e capa do perfil)

## 1. Contexto e objetivo

Até aqui, cada perfil aparece como a inicial do nome sobre a cor escolhida (`ProfileAvatar`, provisório desde a B1). A Etapa D dá identidade a cada perfil, com a cara do Pará: um **avatar ilustrado** e uma **capa** com a imagem do filme ou série favorito.

**Sucesso:** a família reconhece cada perfil pelo desenho, na tela "Quem está assistindo?" e no topo do site, e a Minha lista abre com a imagem do favorito de quem está assistindo.

## 2. Escopo

A etapa tem duas partes, como a B:

### D1 – Avatares e capa (este documento, completo)
- 12 avatares próprios em dois conjuntos: **Adulto** (frutas e símbolos do Pará) e **Kids** (bichos da Amazônia).
- Escolha do avatar ao criar e ao editar o perfil.
- Avatar em todos os lugares onde hoje aparece a inicial.
- **Capa do perfil** no alto da Minha lista: imagem de um favorito ou "Usar página padrão", com a cor de destaque tirada da imagem.
- Conta de demonstração com tudo liberado.

### D2 – Foto própria (resumo em §11; plano à parte)
- Foto enviada pela pessoa, só em perfis adultos, guardada num serviço de arquivos.

Fica para a D2 porque depende de um serviço novo (Vercel Blob), que o dono do projeto precisa criar no painel da Vercel.

### Fora da D
- Avatares de personagens de filmes ou séries (os direitos são dos estúdios).
- Avatares animados.
- Capa em outras páginas além da Minha lista.

## 3. Decisões tomadas na conversa de design

| Tema | Decisão |
|---|---|
| Conjuntos | Adulto: Açaí, Cupuaçu, Pupunha, Jambu, Castanha, Ver-o-Peso. Kids: Boto, Preguiça, Arara, Peixe-boi, Tracajá, Onça (aprovados em 08/11) |
| Quem escolhe o quê | Qualquer perfil escolhe qualquer avatar; o perfil Kids vê o conjunto Kids primeiro |
| Fundo do avatar | A cor do perfil (a escolha de cor continua) |
| Onde fica a capa | No alto da Minha lista |
| Demonstração | Tudo liberado: avatares em todos os perfis e capa. A foto própria (D2) também, só nos adultos (decisão de 08/11) |
| Foto própria | Só perfis adultos (foto de criança é dado sensível pela LGPD); fica para a D2 |

## 4. Dados

### 4.1 Colunas novas em `profiles`

| Coluna | Tipo | Observação |
|---|---|---|
| `avatar` | text | *slug* de §5.1, ou `null` (mostra a inicial, como hoje) |
| `cover` | jsonb | capa escolhida (4.2), ou `null` (página padrão) |

Entram por migração do Drizzle (`drizzle/0003_…sql`). A RLS da tabela já está ligada e continua valendo para as colunas novas.

### 4.2 Capa (`cover`)

`{ type, id, title, backdropPath, accent }`

- `type` e `id`: o título no TMDB (`'movie'` ou `'tv'`).
- `title` e `backdropPath`: copiados da marcação do favorito (`profile_titles.snapshot`) na hora da escolha. A capa não depende do TMDB para aparecer.
- `accent`: `{ dark, light }`, duas cores `#rrggbb` tiradas da imagem (§5.3), ou `null` se a extração falhar.
- A capa **continua** se o título deixar de ser favorito depois. Ela só muda quando a pessoa escolhe outra ou "Usar página padrão".

## 5. Regras

### 5.1 Avatares

`lib/avatars.js` define a lista, nesta ordem:

| Slug | Nome | Conjunto |
|---|---|---|
| `acai` | Açaí | adulto |
| `cupuacu` | Cupuaçu | adulto |
| `pupunha` | Pupunha | adulto |
| `jambu` | Jambu | adulto |
| `castanha` | Castanha | adulto |
| `ver-o-peso` | Ver-o-Peso | adulto |
| `boto` | Boto | kids |
| `preguica` | Preguiça | kids |
| `arara` | Arara | kids |
| `peixe-boi` | Peixe-boi | kids |
| `tracaja` | Tracajá | kids |
| `onca` | Onça | kids |

1. Ao **criar** um perfil, o avatar já vem marcado: o primeiro do conjunto do tipo (Açaí no adulto, Boto no Kids). A pessoa pode trocar ou escolher "Só a inicial" (`null`).
2. Ao **editar**, vale o avatar salvo. Perfis criados antes da D continuam com `null` até alguém escolher um.
3. Um *slug* fora da lista é recusado pelo servidor ("Escolha um dos avatares.").
4. Os desenhos são SVG próprios, desenhados no código (`components/profiles/avatars.jsx`), iguais aos do protótipo. Não há arquivos de imagem nem chamadas de rede.
5. No tamanho pequeno (topo do site, 36 px), o Açaí usa a versão simplificada do protótipo. Os outros usam o mesmo desenho.

### 5.2 Capa

1. Só é possível escolher **favoritos do próprio perfil** que tenham imagem de fundo (`snapshot.backdropPath`).
2. **Kids:** só favoritos dentro da faixa de classificação (`ratingAllowed`), sem contar as liberações temporárias do PIN.
3. A escolha vale para o perfil ativo da sessão. O navegador envia só `{ type, id }` ou "padrão" e nunca diz de quem é o perfil.
4. A capa é **do perfil**, como a aparência. Escolher a capa **não pede PIN**, nem no Kids, porque só mostra títulos que o perfil já pode ver.
5. Se, na hora de mostrar, a capa de um perfil Kids estiver acima da faixa (a faixa mudou depois), a página usa a padrão.

### 5.3 Cor de destaque da capa

- No servidor, ao salvar a capa, o site baixa a imagem pequena do TMDB (`w300`), calcula a cor média com o `sharp` (já instalado com o Next) e a ajusta:
  - `dark`: clareada até ter contraste de pelo menos **3:1** com `#0d0820` (fundo do tema Escuro);
  - `light`: escurecida até ter pelo menos **3:1** com `#ffffff` (fundo do tema Claro).
- A cor só aparece em enfeites: o sublinhado da aba ativa, a borda da opção marcada e o ponto de cor. Nunca em texto, por isso a meta é 3:1 (WCAG 1.4.11).
- Nos temas **Noturno** e **Alto contraste**, a cor da capa é ignorada e vale a do tema.
- Se a imagem não baixar em 4 s ou o cálculo falhar, `accent` fica `null` e a capa usa a cor do tema. A escolha é salva mesmo assim.

### 5.4 Conta de demonstração

Na recriação diária:
- **Pai**: Açaí; **Mãe**: Ver-o-Peso; **Pequeno** (Kids): Boto;
- **Pai** ganha como capa o filme favorito de exemplo, se os exemplos carregarem.

Visitantes podem trocar avatares e capas, e a recriação do dia seguinte desfaz tudo (o mesmo vale para as fotos na D2).

### 5.5 Segurança

- `avatar` e `cover` são validados no servidor. A capa é montada a partir do banco, nunca do que o navegador envia.
- A imagem da capa vem só de `image.tmdb.org`, pelo mesmo `next/image` do resto do site.
- Editar o avatar continua sendo editar o perfil: no Kids, pede o PIN, como hoje.

## 6. Telas

### 6.1 Avatar (`ProfileAvatar`)
- Mostra o desenho sobre a cor do perfil. Com `avatar: null`, mostra a inicial, como hoje.
- Tamanhos: `lg` ("Quem está assistindo?"), `md` (Gerenciar perfis e capa) e `sm` (topo do site e transição de perfil).
- A etiqueta "Kids" continua no tamanho grande.

### 6.2 Escolha do avatar (formulário do perfil)
- Novo campo **"Avatar"** entre "Nome" e "Cor", com dois grupos: "Frutas e símbolos do Pará" e "Bichos da Amazônia" (o grupo Kids vem primeiro quando o tipo marcado é Kids).
- Cada opção é um botão de rádio com o nome ("Açaí", "Boto"…), desenho em 64 px e anel de seleção. Há também a opção "Só a inicial".
- A prévia usa a cor marcada no campo "Cor".

### 6.3 Capa na Minha lista
- Faixa de 360 px de altura (240 px no celular) no alto da página, com a imagem do favorito e um degradê até o fundo da página.
- Sobre a faixa: avatar `md`, o nome do perfil e a contagem "12 favoritos · 3 assistindo · 41 já assistidos".
- Sem capa: a mesma faixa sem imagem, na cor de superfície do tema.
- Botão **"Editar capa"** (ícone de lápis e texto) no canto da faixa. Ele abre o painel de §6.4.
- **Modo sensorial calmo:** a imagem fica mais escura (o degradê fica mais forte). Não há animação nenhuma.

### 6.4 Painel "Capa do perfil"
- Um diálogo (o mesmo padrão de foco de `useDialogFocus`) com o grupo de rádio "O que aparece no alto da Minha lista":
  - **Filme ou série favorito** e uma lista para escolher entre os favoritos com imagem;
  - **Usar página padrão**.
- Sem favoritos com imagem, a primeira opção fica desligada, com o aviso "Favorite um filme ou série para usá-lo como capa."
- **Salvar** aplica na hora (a página recarrega os dados). Erro: "Não foi possível salvar. Tente de novo."

## 7. Organização do código

| Arquivo | Papel |
|---|---|
| `lib/avatars.js` | lista de §5.1, `isAvatar(slug)`, `defaultAvatar(kind)`, `avatarsFor(kind)` (ordem dos grupos) |
| `components/profiles/avatars.jsx` | `AvatarArt({ slug, size })`: os 12 SVG |
| `components/profiles/ProfileAvatar.jsx` | passa a usar `AvatarArt`; tamanho `md` novo |
| `components/profiles/AvatarPicker.jsx` | grupo de rádio da §6.2 |
| `lib/profiles.js` | `validateProfileInput` aceita `avatar` |
| `lib/cover.js` | `coverOptions(marks, viewer)`, `buildCover(mark)`, regras de §5.2 |
| `lib/cover-accent.js` | contraste WCAG, ajuste de cor e `extractAccent(backdropPath)` (§5.3) |
| `lib/actions/conta.js` | `saveCoverAction({ type, id } \| null)` |
| `components/lists/CoverHeader.jsx`, `CoverEditor.jsx` | §6.3 e §6.4 |
| `lib/demo.js` | avatares e capa de §5.4 |

O layout já passa o perfil para o `UserMenu`. Ele passa a incluir `avatar`.

## 8. Erros e situações-limite

| Situação | Comportamento |
|---|---|
| Perfil antigo sem avatar | Mostra a inicial |
| Capa de um título que deixou de ser favorito | Continua até a pessoa trocar (§4.2) |
| Favorito sem imagem de fundo | Não aparece na lista de capas |
| Kids com capa acima da faixa | Página padrão (§5.2.5) |
| TMDB fora do ar ao salvar a capa | Salva sem cor própria (§5.3) |
| Perfil trocado em outra aba antes de salvar | `{ ok: false, error: 'perfil' }` e ida para "Quem está assistindo?", como nas listas |

## 9. Acessibilidade

- Os avatares são enfeite (`aria-hidden`) quando o nome está ao lado. Na escolha, cada rádio tem o nome do avatar como rótulo.
- O anel de seleção não depende só de cor: a opção marcada fica com borda grossa e o sinal ✓.
- A imagem da capa é enfeite (`alt=""`). O nome do título aparece no painel de edição.
- O painel de capa prende o foco, fecha com Esc e devolve o foco ao botão "Editar capa".
- Contraste: a cor da capa é ajustada (§5.3), e os textos sobre a imagem ficam sobre o degradê escuro, com 4,5:1 garantido.

## 10. Testes

- **Unidade:** lista e validação dos avatares; regras da capa (só favoritos com imagem, faixa do Kids); contraste e ajuste de cor (casos com cor escura, clara e cinza); `extractAccent` com uma imagem gerada pelo `sharp` e com falha de rede.
- **Banco:** salvar o avatar e a capa; recriação da demonstração com os avatares e a capa do Pai.
- **Componentes:** `ProfileAvatar` com e sem avatar; `AvatarPicker` (padrão por tipo, ordem dos grupos, "Só a inicial"); `CoverHeader` com e sem capa e no modo calmo; `CoverEditor` (sem favoritos, salvar, erro).
- **Ponta a ponta com axe:** entrar pela demonstração → ver os avatares em "Quem está assistindo?" → editar a Mãe, trocar para Jambu e ver no topo → Minha lista do Pai: trocar a capa para outro favorito → "Usar página padrão".

## 11. D2 – Foto própria (resumo, para o plano seguinte)

- Opção "Foto própria" no campo Avatar, só em perfis adultos (inclusive na demonstração).
- No navegador: recorte quadrado e redução para 256 px antes de enviar (JPEG ou WebP, até 200 KB).
- Guardada no **Vercel Blob**, com o endereço em `profiles.photo_url`. A foto antiga é apagada ao trocar a foto, ao voltar para um desenho e ao excluir o perfil ou a conta.
- Demonstração: a recriação diária apaga as fotos.
- Antes do plano da D2, o dono do projeto cria o armazenamento Blob na Vercel (o token entra como variável de ambiente).
