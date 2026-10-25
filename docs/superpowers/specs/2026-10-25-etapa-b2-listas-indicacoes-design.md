# Etapa B2 – Listas e Indicações: especificação de design

**Data:** 2026-10-25
**Status:** aguardando revisão
**Ramo:** `etapa-b-contas` (continua a B1)

## 1. Contexto e objetivo

A B1 deu a cada família uma conta com perfis, Kids e PIN dos pais. A B2 faz o site lembrar de cada perfil: o que ele favoritou, o que está assistindo (e onde parou) e o que já viu, e usa isso, junto com os gêneros favoritos, para indicar títulos.

Os serviços de streaming não informam onde a pessoa parou; por isso todas as marcações são manuais (decisão registrada em `docs/ideias-para-depois.md`).

**Sucesso:** marcar um título leva um toque, na página dele ou no cartaz, e o resultado aparece na hora no Início ("Continuar assistindo", "Indicados para você") e na página Minha lista.

## 2. Escopo

### Dentro da B2
- Favoritar títulos (♥) na página do título e nos cartazes.
- Situação do título: *Assistindo* ou *Já assisti*.
- Séries em *Assistindo*: temporada e episódio, com "+1 episódio".
- Página **Minha lista** (`/minha-lista`) com abas Favoritos · Assistindo · Já assisti.
- Fileiras no Início: **Continuar assistindo** e **Indicados para você**.
- Gêneros favoritos do perfil: passo opcional ao criar o perfil, edição em Gerenciar perfis e convite no Início.
- Marcações da conta de demonstração recriadas todo dia, com exemplos.

### Fora da B2
- Fotos de perfil e avatares (Etapa D).
- Notificações ("saiu episódio novo") fora do próprio site.
- Notas ou resenhas dos títulos.
- Saber automaticamente onde a pessoa parou na plataforma.

## 3. Decisões tomadas na conversa de design

| Tema | Decisão |
|---|---|
| Onde ficam as listas | Página única **Minha lista**, no menu principal, com abas |
| Onde marcar | Botões completos na página do título; ♥ rápido no cartaz |
| Indicações | Mistura: parecidos com títulos marcados + mais bem avaliados dos gêneros favoritos |
| Gêneros favoritos | Passo opcional ao criar o perfil, edição em Gerenciar perfis e convite no Início |
| Progresso de séries | Temporada e episódio, com "+1 episódio" e a pergunta "Marcar como Já assisti?" no fim da série |
| Guardar marcações | Tabela única `profile_titles` com uma cópia leve do título |

## 4. Dados

### 4.1 Tabela nova `profile_titles`

Uma linha por par perfil + título. Chave primária: (`profile_id`, `media_type`, `tmdb_id`).

| Coluna | Tipo | Observação |
|---|---|---|
| `profile_id` | text | referência a `profiles.id`, `on delete cascade` |
| `media_type` | text | `'movie'` ou `'tv'` |
| `tmdb_id` | integer | |
| `favorite` | boolean | padrão `false` |
| `favorite_at` | timestamp | quando virou favorito (ordenação) |
| `status` | text | `'nenhum'`, `'assistindo'` ou `'assistido'`; padrão `'nenhum'` |
| `status_at` | timestamp | quando a situação mudou (ordenação) |
| `season`, `episode` | integer | só séries em *Assistindo*; `null` nos demais |
| `snapshot` | jsonb | cópia leve do título (4.2) |
| `updated_at` | timestamp | última mudança qualquer |

Índices: (`profile_id`, `status`, `status_at`) e (`profile_id`, `favorite`, `favorite_at`).

A tabela entra por **migração do Drizzle** (`drizzle/0001_…sql`), como as outras.

### 4.2 Cópia do título (`snapshot`)

`{ title, posterPath, backdropPath, year, genreIds, certification, seasons }`

- `certification`: classificação indicativa brasileira (`L`, `10`, `12`, `14`, `16`, `18` ou `null`), usada no cadeado do Kids.
- `seasons` (só séries): `[{ number, episodes }]` sem a temporada 0 (especiais). Permite o "+1 episódio" sem chamar o TMDB.
- A cópia é gravada na primeira marcação e **renovada sempre que alguém abre a página daquele título** (se o perfil o tiver marcado).

### 4.3 Colunas novas em `profiles`

| Coluna | Tipo | Observação |
|---|---|---|
| `favorite_genres` | jsonb | lista de *slugs* (5.1); padrão `[]` |
| `genres_prompt_done` | boolean | `true` depois de escolher ou dispensar o convite; padrão `false` |

## 5. Regras

### 5.1 Gêneros

A lista de escolha amplia `GENRE_ROWS` (`lib/genres.js`) com:

| Slug | Rótulo | Filme | Série |
|---|---|---|---|
| `suspense` | Suspense | 53 | — |
| `crime` | Crime | 80 | 80 |
| `documentario` | Documentário | 99 | 99 |
| `fantasia` | Fantasia | 14 | 10765 |
| `misterio` | Mistério | 9648 | 9648 |
| `aventura` | Aventura | 12 | 10759 |

No Kids, só aparecem: Animação, Infantil, Aventura e Fantasia.

### 5.2 Marcações

1. **Favorito** e **situação** são independentes (um título pode ser favorito e já assistido).
2. *Assistindo* e *Já assisti* são exclusivos; marcar um tira o outro. Clicar de novo no marcado volta a `nenhum`.
3. **Série** que entra em *Assistindo* começa em T1 E1 (ou na primeira temporada que existir).
4. **+1 episódio:** avança um episódio. No último episódio de uma temporada, vai para o primeiro da seguinte. No último da série, o site pergunta **"Marcar como Já assisti?"**; se a pessoa recusar, fica onde está.
5. **Filme** em *Assistindo* aparece no "Continuar assistindo", sem temporada e episódio.
6. Uma linha com `favorite = false` e `status = 'nenhum'` é **apagada**.
7. **Limite:** 500 títulos marcados por perfil.
8. Marcar *Já assisti* limpa `season` e `episode`.

### 5.3 Kids

- Pode marcar qualquer título dentro da sua faixa.
- Título com cadeado: o ♥ e os botões pedem o PIN dos pais antes, como abrir o título.
- Nas listas e fileiras, um título acima da faixa **continua com cadeado** (usa `snapshot.certification` e as liberações da sessão, como na B1).

### 5.4 Conta de demonstração

Na recriação diária, as marcações dos perfis da demonstração são apagadas junto com os perfis (o `cascade` cuida disso). Depois, o perfil **Pai** recebe:
- um filme favorito;
- uma série em *Assistindo*, em T1 E3;
- os gêneros Ação, Comédia e Ficção científica.

Os títulos são os primeiros da tendência da semana no TMDB que estejam em algum streaming no Brasil. Se o TMDB falhar, a demonstração é criada sem exemplos; isso não impede a entrada.

### 5.5 Segurança

- Todas as ações usam o **perfil ativo da sessão**, conferido no servidor como na B1. Nenhuma ação recebe o id de perfil vindo do navegador.
- `media_type` só aceita `movie`/`tv`; `tmdb_id`, temporada e episódio são inteiros positivos validados.
- A cópia do título é montada **no servidor** a partir do TMDB, nunca enviada pelo navegador.

## 6. Telas

### 6.1 Página do filme ou série

Logo abaixo de "Assistir na …", uma fileira de botões:

`[♡ Favoritar] [◔ Assistindo] [✓ Já assisti]`

- Marcado: ♥ cheio e a palavra muda ("Favorito"), fundo em destaque. Não depende só da cor.
- `aria-pressed` em cada botão, com o nome do título no rótulo acessível.

Série em *Assistindo* mostra também **"Onde você parou"**: Temporada [lista] · Episódio [lista com número e nome] · [+1 episódio]. Os nomes dos episódios vêm do TMDB quando a temporada é escolhida. Sem dados de temporadas, o bloco fica escondido.

### 6.2 ♥ no cartaz

- Botão **ao lado** do link do cartaz, sobreposto só no visual (um botão dentro de um link quebra teclado e leitor de tela).
- No computador: aparece ao passar o mouse ou focar; sempre visível se o título for favorito.
- Em tela de toque (`@media (hover: none)`): sempre visível, pequeno, no canto.
- Rótulo acessível: "Favoritar *Nome do título*" / "Remover *Nome do título* dos favoritos".
- Visitante sem login não vê o ♥.

### 6.3 Início (com perfil ativo)

Logo depois do destaque, nesta ordem:
1. **Continuar assistindo:** cartões largos (imagem de fundo, nome, "Parei no T2 E5", botão ▶ da plataforma e "+1 episódio" nas séries). Mais recentes primeiro, até 20. Sem itens, a fileira não aparece.
   - Série cuja última temporada no TMDB é maior que a da cópia, e que estava no último episódio guardado, mostra **"Novos episódios"**.
   - Sem plataforma no Brasil, o ▶ vira "Ver onde assistir" e leva à página do título.
2. **Indicados para você** (6.5 e seção 7).
3. **"Do que você gosta?"**: convite com os gêneros em botões que ligam e desligam, e "Salvar" / "Agora não". Só aparece se `genres_prompt_done = false`.

### 6.4 Minha lista (`/minha-lista`)

- Item **MINHA LISTA** no menu principal e no menu ☰ do celular; exige perfil ativo (visitante vai para `/entrar?voltar=/minha-lista`).
- Abas **Favoritos · Assistindo · Já assisti**, com a contagem. A aba ativa fica no endereço (`?aba=favoritos`).
- Filtro **Todos · Filmes · Séries** e ordem **Mais recentes · A–Z**.
- Grade de cartazes com o ♥ e um botão "Remover desta lista".
- Remover mostra o aviso **"Removido · Desfazer"** por 6 segundos.
- Lista vazia: mensagem e caminho (ex.: "Você ainda não tem favoritos. Toque no ♡ em qualquer título." + botão para Explorar).
- Volta a buscar os dados ao reabrir a aba (`visibilitychange`), por causa de outras abas abertas.

### 6.5 Gêneros favoritos

- **Criar perfil:** depois de salvar o perfil novo, passo opcional **"Do que você gosta?"** com os botões de gênero (5.1), "Pular" e "Concluir". Os dois marcam `genres_prompt_done = true`.
- **Gerenciar perfis / Editar perfil:** os mesmos botões dentro do formulário do perfil.
- No Kids, editar os gêneros pede o PIN, como o resto da edição.

### 6.6 Comportamento comum dos botões

- **Atualização otimista:** a mudança aparece na hora; se o servidor recusar, volta ao estado anterior e mostra "Não foi possível salvar. Tente de novo."
- Cada mudança é anunciada numa região `aria-live` (ex.: "*Duna* adicionado aos favoritos").
- Modo sensorial calmo: sem animação no ♥ nem nos avisos.

## 7. Indicações

`getRecommendations(profile, viewer)`:

1. **Sementes:** até 5 títulos marcados mais recentemente (favoritos ou *Já assisti*). Para cada um, `/{tipo}/{id}/recommendations` do TMDB.
2. **Gêneros:** até 3 gêneros favoritos, sorteados por dia (data de Belém + id do perfil como semente, para não mudar a cada recarga). Para cada um, `discover` com `sort_by=vote_average.desc`, `vote_average.gte=7`, `vote_count.gte=200` e os streamings do Brasil (ou "Meus streamings"). Gênero sem equivalente em séries busca só filmes.
3. **Mistura:** intercala as duas fontes e tira repetidos.
4. **Filtros:** tira o que o perfil já marcou → confere a disponibilidade no Brasil (`filterAvailable`, com "Meus streamings" se houver) → aplica a faixa e os gêneros do Kids.
5. Pede 40 candidatos para sobrarem até 20.
6. Sem sementes e sem gêneros: a fileira não aparece (o convite da seção 6.3 aparece no lugar).

Cache: respostas do TMDB com `revalidate` de 6 h (como as fileiras) e disponibilidade com 24 h (como hoje). A fileira é montada por perfil a cada visita, a partir dessas respostas em cache.

## 8. Desempenho

- As fileiras gerais do Início continuam iguais para todos e com cache.
- "Continuar assistindo" e "Indicados" ficam em `Suspense` separados, com esqueleto, e não atrasam o resto da página.
- "Continuar assistindo" vem de uma consulta ao banco; o TMDB só é chamado para o link da plataforma e para conferir temporadas novas (cache de 24 h).
- Minha lista vem só do banco.
- Conferências de disponibilidade: no máximo 8 ao mesmo tempo (`settledWithLimit`, já existente).

## 9. Organização do código

| Arquivo | Responsabilidade |
|---|---|
| `lib/db/schema.js` | tabela `profile_titles` e colunas novas de `profiles` |
| `lib/lists/rules.js` | regras puras: próxima situação, +1 episódio, linha vazia, limite |
| `lib/lists/store.js` | leitura e gravação no banco (por perfil) |
| `lib/lists/snapshot.js` | monta a cópia do título a partir dos detalhes do TMDB |
| `lib/actions/listas.js` | ações do servidor: favoritar, mudar situação, mudar episódio, salvar gêneros |
| `lib/recommendations.js` | indicações (seção 7) |
| `lib/genres.js` | lista ampliada de gêneros e lista do Kids |
| `components/lists/TitleActions.jsx` | botões da página do título e "Onde você parou" |
| `components/lists/FavoriteButton.jsx` | ♥ do cartaz |
| `components/lists/ContinueRow.jsx` | fileira "Continuar assistindo" |
| `components/lists/MyListView.jsx` | página Minha lista |
| `components/lists/GenrePicker.jsx` | botões de gênero (criar perfil, editar, convite) |
| `components/lists/UndoToast.jsx` | aviso "Removido · Desfazer" |
| `app/minha-lista/page.jsx` | rota da Minha lista |

O estado das marcações chega aos cartazes por um provedor no cliente (`ListsProvider`), carregado uma vez por página com os ids marcados do perfil, para cada ♥ não precisar consultar o servidor.

## 10. Erros e situações-limite

| Situação | Comportamento |
|---|---|
| TMDB fora do ar | Fileiras pessoais somem em silêncio; Minha lista funciona (vem do banco) |
| Falha ao salvar | Estado anterior volta e aparece "Não foi possível salvar. Tente de novo." |
| Limite de 500 | "Sua lista chegou ao limite de 500 títulos. Remova alguns para adicionar novos." |
| Perfil excluído em outro aparelho | Volta a "Quem está assistindo?" (regra da B1) |
| Série sem temporadas no TMDB | "Onde você parou" escondido; *Assistindo* funciona |
| Temporada guardada que não existe mais | Ajusta para a última temporada existente |
| Título que saiu do streaming | Continua nas listas; ▶ vira "Ver onde assistir" |
| Duas abas | Vale a última gravação; Minha lista recarrega ao voltar para a aba |
| Kids e título com cadeado | Pede o PIN antes de marcar; nas listas, continua com cadeado |

## 11. Acessibilidade

- Botões com `aria-pressed` e rótulos com o nome do título (sem "Favoritar, Favoritar, Favoritar…").
- Mudanças anunciadas em `aria-live="polite"`.
- Abas da Minha lista com o padrão de abas (`role="tablist"`, setas do teclado).
- ♥ do cartaz alcançável por Tab, com foco visível.
- Contraste conferido nos três temas e no alto contraste.
- Verificação com axe nos testes de ponta a ponta, como na B1.

## 12. Testes

- **Unidade:** regras de 5.2 (situações exclusivas, +1 episódio com virada de temporada e fim da série, apagar linha vazia, limite de 500); montagem da cópia; mistura e filtros das indicações; sorteio diário dos gêneros.
- **Banco (Postgres de teste):** gravação por perfil, cascade ao excluir o perfil, recriação da demonstração com exemplos. Tempo limite folgado (60 s) nos testes de banco, que estouraram o tempo com o computador ocupado.
- **Componentes:** botões da página do título, ♥ do cartaz (fora do link, rótulo, estado), Minha lista (abas, filtros, vazia, desfazer), passo "Do que você gosta?".
- **Ponta a ponta com axe:** entrar pela demonstração → favoritar pelo cartaz → marcar uma série como *Assistindo* → +1 episódio → ver no "Continuar assistindo" → ver na Minha lista → remover e desfazer → no Kids, favoritar um título liberado.

## 13. Fora de escopo, para depois

- Avisar "saiu episódio novo" fora do site.
- Ordenar a Minha lista à mão (arrastar).
- Compartilhar a lista com outros perfis.
