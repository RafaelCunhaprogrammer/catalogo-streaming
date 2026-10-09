# Etapa A – Catálogo de streaming: especificação de design

**Data:** 2026-10-08
**Status:** aprovada em 2026-10-08

## 1. Contexto e objetivo

Um site que mostra os filmes e séries **incluídos nos planos de assinatura** dos serviços de streaming no **Brasil**, usando a API do TMDB (os dados de "onde assistir" vêm do JustWatch, via TMDB).

- **Para quem:** projeto de aprendizado e portfólio, e ferramenta de uso pessoal e familiar para decidir o que assistir.
- **Sucesso significa:** o site é bonito e fluido o bastante para prender a atenção, é útil no dia a dia (encontrar rápido algo para assistir nas plataformas que a pessoa tem) e é confortável para todos, inclusive em quarto escuro, com crianças por perto e para pessoas com sensibilidade sensorial ou baixa visão.
- **Uso não comercial:** a API gratuita do TMDB não permite cobrança. As Etapas B, C e D (contas, assinatura simulada, personalização) estão registradas em `docs/ideias-para-depois.md` e terão especificações próprias.

## 2. Escopo

### Dentro da Etapa A
- Tela de entrada com som de abertura.
- Início com destaque em vídeo, "Como você quer se sentir hoje?", fileiras por plataforma e por gênero.
- Explorar com filtros, busca, página do título com recomendações.
- Filmes **e** séries.
- Modos Escuro, Claro e Noturno, painel de Acessibilidade e "Meus streamings", tudo salvo no navegador.

### Fora da Etapa A
Login, banco de dados, perfis, Kids, favoritos, "Continuar assistindo", assinatura e personalização de perfil.

## 3. Regras fixas (valem para todo o site)

1. **Região Brasil e idioma pt-BR** em todas as chamadas ao TMDB.
2. **Só títulos incluídos em assinatura** (tipo de disponibilidade `flatrate`). Aluguel, compra e gratuitos com anúncios não aparecem.
3. **Conteúdo adulto sempre bloqueado** (`include_adult=false`), sem opção para desativar. Títulos comuns com classificação 18 anos continuam aparecendo.
4. **Créditos ao TMDB e ao JustWatch** no rodapé de todas as páginas, conforme os termos de uso.

As regras 1 a 3 são aplicadas em um único módulo (`lib/tmdb.js`), e nenhuma outra parte do código chama o TMDB diretamente.

## 4. Tecnologia

- **Next.js** (App Router) com **JavaScript**: front-end e back-end no mesmo projeto.
- **Tailwind CSS** para estilo e **Framer Motion** para animações.
- **Vitest** e **React Testing Library** para testes de unidade e de componentes; **Playwright** com **axe** para testes de ponta a ponta e de acessibilidade.
- Node.js 22. Publicação futura na Vercel (fora do escopo desta especificação).

## 5. Identidade visual

**Estilo Neon vibrante:** roxo (`#8b5cf6`) e rosa (`#ec4899`) como cores de destaque, gradientes, brilhos suaves nos elementos em foco e efeito de vidro fosco no topo e nos painéis. As cores são definidas como variáveis CSS (tokens), e cada modo redefine só os tokens.

| Modo | Fundo | Comportamento |
|---|---|---|
| **Escuro** (padrão) | Azul-arroxeado muito escuro | Neon completo |
| **Claro** | Lavanda claro | Destaque com trailer continua escuro; demais áreas claras |
| **Noturno 🔅** | Quase preto | Brilhos neon desligados, brilho ajustável, som de abertura desligado |

- **Primeiro acesso:** segue a preferência de cor do sistema (`prefers-color-scheme`). Escuro e Noturno do sistema → Escuro; claro → Claro.
- **Brilho no Noturno:** controle deslizante de 20% a 100%, padrão 60%. É implementado como uma camada preta semitransparente sobre a página inteira (`pointer-events: none`), que escurece também o vídeo do YouTube.
- **Sem piscar ao abrir:** um script curto no `<head>` lê as preferências salvas e aplica o tema antes da primeira pintura.

## 6. Telas

### 6.1 Tela de entrada
- Logo animado e o botão **Entrar**.
- Ao clicar, toca o som de abertura: começa em volume zero e sobe até o volume final em 3 segundos, com duração total de cerca de 5 segundos. O som é original, gerado com a Web Audio API (sem arquivo de música de terceiros).
- O som **não** toca se o modo for Noturno, se o Modo sensorial calmo estiver ligado ou se a opção "Som de abertura" estiver desligada.
- Aparece uma vez por sessão do navegador (`sessionStorage`). Links diretos para páginas internas não passam pela tela de entrada.

### 6.2 Topo fixo
Logo, **Início**, **Explorar**, campo de **busca** 🔍 e botão ⚙️ **Configurações**. Em telas pequenas, os links ficam num menu.

### 6.3 Início
1. **Destaque:** título popular no momento, com imagem de fundo e trailer automático **sem som** e botão 🔊 para ativar o áudio. Troca de título a cada 15 segundos, entre os 5 primeiros em alta, e pausa a troca enquanto o mouse está sobre ele ou o som está ativo. Botões: **Ver detalhes** e **Ver trailer** (abre o trailer em tela cheia, com som).
2. **"Como você quer se sentir hoje?":** 8 botões, cada um abrindo Explorar com o humor aplicado (`/explorar?humor=relaxar`), combinável com os demais filtros:
   😌 Relaxar · 😂 Rir · 💪 Histórias de superação · 🥹 Me emocionar · ⚡ Adrenalina · 😱 Sentir medo · ❤️ Me apaixonar · 🙏 Fé e espiritualidade
3. **Fileiras "Em alta na…"** para cada plataforma da lista configurada (seção 7.4): títulos mais populares no momento disponíveis nela, filmes e séries misturados.
4. **Fileiras por gênero:** Ação, Terror, Romance, Comédia, Infantil, Ficção científica, Animação e Drama.

Cada fileira tem 20 títulos, rola na horizontal (setas no computador, arrastar no celular) e tem o link "Ver tudo", que abre Explorar já filtrado.

Se "Meus streamings" tiver ao menos uma plataforma marcada, o Início e o Explorar mostram só títulos dessas plataformas, e as fileiras "Em alta na…" aparecem só para elas.

### 6.4 Explorar
- Grade de cartazes com carregamento de mais 20 títulos ao chegar perto do fim (rolagem infinita).
- **Filtros:** Filmes/Séries, plataforma (várias), gênero (vários), ano (de/até), nota mínima (0–10), duração (até 90 min, 90–120 min, mais de 120 min; só para filmes) e idioma original.
- **Ordenação:** popularidade (padrão), nota e lançamento mais recente. Ordenar por nota considera só títulos com pelo menos 200 votos.
- Os filtros ficam no endereço da página (`/explorar?genero=27&tipo=filme`), então dá para recarregar ou compartilhar a busca.
- Sem resultados: mensagem "Nenhum título encontrado" e o botão **Limpar filtros**.

### 6.5 Busca
- Resultados aparecem conforme a pessoa digita, a partir de 2 caracteres e 300 ms após a última tecla.
- Mostra filmes e séries **disponíveis em alguma assinatura no Brasil**. O servidor confere a disponibilidade de cada resultado do TMDB e descarta os demais (com cache, ver seção 7.3).
- Enter ou "Ver todos os resultados" abre `/busca?q=...` com a lista completa.

### 6.6 Página do título (`/filme/[id]` e `/serie/[id]`)
- Imagem de fundo grande, cartaz, título, ano, gêneros, nota, duração (filmes) ou número de temporadas (séries) e **classificação indicativa** brasileira (quando o TMDB não tiver, mostra "Classificação não informada").
- Sinopse, elenco principal (até 12 pessoas, com foto) e trailer.
- **Onde assistir:** logos das plataformas de assinatura e link para a página de disponibilidade do TMDB/JustWatch.
- **Você também pode gostar:** recomendações do TMDB para aquele título, filtradas pelas mesmas regras de disponibilidade.

### 6.7 Configurações (painel lateral)
- **Aparência:** Escuro, Claro ou Noturno; controle de brilho visível no Noturno.
- **Acessibilidade:**
  - Tamanho do texto: Normal (100%), Grande (125%), Muito grande (150%).
  - Modo sensorial calmo: liga/desliga.
  - Alto contraste: liga/desliga.
  - Som de abertura: liga/desliga (ligado por padrão).
- **Meus streamings:** caixas de seleção com as plataformas da lista configurada.

As opções de Acessibilidade combinam com qualquer modo de Aparência.

### 6.8 Rodapé
Créditos e logos do TMDB e do JustWatch, com o aviso "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB."

## 7. Arquitetura e fluxo de dados

```
Navegador ──► Next.js (servidor) ──► API do TMDB
    ▲               │ chave secreta, regras fixas, cache
    └── HTML/JSON ◄─┘
```

### 7.1 Componentes principais
| Unidade | Responsabilidade |
|---|---|
| `lib/tmdb.js` | Único ponto de contato com o TMDB: autenticação, regras fixas, timeout, nova tentativa, cache |
| `lib/moods.js` | Configuração das 8 opções de "Como você quer se sentir hoje?" |
| `lib/providers.js` | Lista e ordem das plataformas exibidas |
| `lib/trailer.js` | Escolha do melhor trailer de um título |
| `lib/preferences.js` | Leitura, validação e gravação das preferências no navegador |
| `app/api/*` | Rotas internas usadas pelas partes interativas (busca, explorar) |
| `app/*` (páginas) | Início, Explorar, Busca, Filme, Série, Não encontrado |
| `components/*` | Topo, Destaque, Fileira, Cartaz, Filtros, Painel de configurações, Rodapé, Tela de entrada |

### 7.2 Dois caminhos até a tela
- **Páginas montadas no servidor** (Início, Filme, Série, Busca completa): o servidor busca os dados e envia a página pronta.
- **Partes interativas** (busca enquanto digita, filtros, rolagem infinita): o navegador chama `/api/buscar` e `/api/explorar`, que usam `lib/tmdb.js`.

Preferências e "Meus streamings" ficam no navegador. As partes interativas enviam as plataformas escolhidas nos pedidos às rotas internas. As páginas montadas no servidor leem "Meus streamings" de um cookie espelhado das preferências, para já virem filtradas.

### 7.3 Cache
| Dado | Duração |
|---|---|
| Fileiras "em alta", gêneros e humores | 6 horas |
| Detalhes, elenco, vídeos e disponibilidade de um título | 24 horas |
| Lista de plataformas e de gêneros do TMDB | 24 horas |
| Busca (resposta da pesquisa por texto) | sem cache |

### 7.4 Configurações de conteúdo
- **Plataformas (`lib/providers.js`):** Netflix, Amazon Prime Video, Disney+, Max, Globoplay, Apple TV+, Paramount+ e Mercado Play, nesta ordem. Os IDs de cada uma são conferidos no endpoint de plataformas do TMDB para a região BR durante a implementação; plataformas que não existirem no TMDB saem da lista.
- **Humores (`lib/moods.js`):** cada opção é uma combinação de gêneros, palavras-chave do TMDB e nota mínima. Ponto de partida:

| Opção | Base |
|---|---|
| 😌 Relaxar | Comédia, Família, Animação; nota ≥ 7 |
| 😂 Rir | Comédia |
| 💪 Histórias de superação | Drama com palavras-chave de superação, esporte e baseado em fatos reais |
| 🥹 Me emocionar | Drama e Romance; nota ≥ 7,5 |
| ⚡ Adrenalina | Ação e Thriller |
| 😱 Sentir medo | Terror |
| ❤️ Me apaixonar | Romance |
| 🙏 Fé e espiritualidade | Palavras-chave de fé, religião, cristianismo, Bíblia e espiritualidade, sem restringir a uma crença |

Os IDs das palavras-chave são obtidos na pesquisa de palavras-chave do TMDB durante a implementação. A configuração é ajustável sem mexer nas telas.

### 7.5 Trailer
Ordem de preferência entre os vídeos do YouTube do título: trailer em pt-BR → teaser em pt-BR → trailer em inglês → teaser em inglês. Sem nenhum desses, mostra a imagem de fundo. O vídeo é incorporado por `youtube-nocookie.com`.

### 7.6 Comportamento automático por modo

| | Escuro | Claro | Noturno | Modo sensorial calmo (qualquer modo) |
|---|---|---|---|---|
| Trailer automático (sem som) | sim | sim | sim | **não** |
| Som de abertura | sim* | sim* | **não** | **não** |
| Brilhos neon | sim | sim | **não** | **não** |
| Troca automática do destaque | sim | sim | sim | **não** |
| Animações | completas | completas | completas | **mínimas** |

\* se a opção "Som de abertura" estiver ligada.

O site também respeita `prefers-reduced-motion` do sistema, reduzindo as animações mesmo sem o Modo sensorial calmo.

## 8. Tratamento de erros

| Situação | Comportamento |
|---|---|
| TMDB lento ou fora do ar | Timeout de 8 s e uma nova tentativa; depois, "Não foi possível carregar agora" com **Tentar novamente** |
| Limite de chamadas do TMDB (429) | Espera o tempo indicado pelo TMDB (até 2 s) e tenta uma vez mais |
| Uma fileira do Início falha | Só ela é ocultada; o restante da página aparece normalmente |
| Título sem cartaz | Cartaz neon genérico com o nome do título |
| Título sem trailer ou YouTube bloqueado | Destaque e página do título usam a imagem de fundo |
| Filtros sem resultados | "Nenhum título encontrado" e **Limpar filtros** |
| ID inexistente ou título não disponível em assinatura | Página "Não encontrado" no estilo do site, com link para o Início |
| Navegador sem permissão para salvar | Usa os valores padrão e não exibe erro |
| Preferências salvas corrompidas ou de versão antiga | Descartadas e substituídas pelos padrões |
| `TMDB_READ_TOKEN` ausente | Erro no servidor com a mensagem "Defina TMDB_READ_TOKEN em .env.local" |

## 9. Acessibilidade

- Meta: **WCAG 2.1 nível AA** em todos os modos (o modo Noturno com brilho reduzido é uma escolha da pessoa e fica fora da verificação de contraste).
- Todos os cartazes com texto alternativo (título e ano); botões apenas com ícone têm rótulo.
- Navegação completa pelo teclado, foco sempre visível, fileiras navegáveis com as setas.
- Nenhum som toca sem ação da pessoa (o som de abertura só toca após o clique em Entrar).
- Tamanho do texto ajusta a escala de fonte da página inteira, sem quebrar o layout em 150%.

## 10. Testes

Desenvolvimento orientado por testes (TDD). Os testes usam respostas de exemplo do TMDB salvas em `tests/fixtures/` e nunca chamam a API real.

1. **Unidade (Vitest):**
   - toda chamada de `lib/tmdb.js` inclui `include_adult=false`, região BR, pt-BR e `flatrate`;
   - timeout, nova tentativa e tratamento de 429;
   - escolha do trailer (seção 7.5);
   - configuração de humores e de plataformas;
   - preferências: padrões, validação, versão antiga e armazenamento indisponível.
2. **Componentes (React Testing Library):** painel de Configurações, filtros, cartaz sem imagem, destaque (sem vídeo automático no Modo sensorial calmo; sem troca automática no Modo sensorial calmo), tela de entrada (som só quando permitido).
3. **Ponta a ponta (Playwright, com a API simulada):** abrir o Início; buscar e abrir um título; filtrar no Explorar; trocar o modo, recarregar e conferir que ficou salvo; marcar "Meus streamings" e ver as fileiras filtradas.
4. **Acessibilidade (axe no Playwright):** Início, Explorar e página do título, nos modos Escuro e Claro, sem violações de nível AA.

## 11. Configuração local

- `.env.local` com `TMDB_READ_TOKEN` (token de leitura v4 da conta TMDB). O arquivo está no `.gitignore`.
- `.env.example` versionado, com a variável sem valor, para documentar o que é necessário.
