# Pai d'Égua: progresso do projeto

Atualizado em 09/11/2026. Marque aqui o que for sendo concluído.

**No ar:** [pai-degua.vercel.app](https://pai-degua.vercel.app)

## Visão geral

| Etapa | O que é | Situação |
|---|---|---|
| **A – Catálogo** | O site em si: vitrine, busca, páginas de filmes e séries, visual e acessibilidade | **Publicada** (faltam ajustes pequenos) |
| **B – Contas e Perfis** | Login, perfis, Kids com controle dos pais, favoritos, "Continuar assistindo" | **B1 e B2 prontas** e juntadas ao `main` |
| **C – Assinatura** | Planos, teste grátis e pagamento simulado | **Pronta** (ramo `etapa-c-assinatura`, aguardando juntar ao `main`) |
| **D – Personalização** | Avatares regionais e capa do perfil | **D1 pronta** e juntada ao `main`; D2 (foto própria) pronta, aguardando juntar ao `main` |

A Etapa B é a maior das três que faltam, porque traz banco de dados e login. A C e a D são menores e dependem da B.

---

## Etapa A – Catálogo

### Feito

**Base e dados**
- [x] Projeto Next.js com testes automáticos (219 de unidade e componentes, 18 de ponta a ponta, verificação de acessibilidade)
- [x] Integração com o TMDB: só títulos de assinatura no Brasil, sem conteúdo adulto, em português
- [x] Plataformas conferidas no TMDB real (Netflix, Prime Video, Disney+, HBO Max, Globoplay, Apple TV, Paramount+, Mercado Play)
- [x] Código no GitHub (repositório público)

**Identidade**
- [x] Nome **Pai d'Égua** e logo do caroço de açaí com o play (também no ícone da aba); a versão com o paneiro ficou guardada para depois
- [x] Vídeo de abertura com som, transição gradual para o Início e "Pular abertura"
- [x] Clicar na logo, no Início, mostra a abertura de novo
- [x] Protetor de tela com a abertura muda após 3 minutos parado

**Navegação e conteúdo**
- [x] Menu INÍCIO · FILMES · SÉRIES · CATEGORIAS · EXPLORAR (com menu ☰ no celular)
- [x] Destaque com trailer (tendências da semana), setas, pontinhos, pausa e som
- [x] Trailer dublado primeiro; sem dublagem, com legendas em português
- [x] Fileiras: Lançamentos recentes, Em alta em cada plataforma (com logo) e gêneros
- [x] "Como você quer se sentir hoje?" com imagens e o nome do filme levando à página dele
- [x] Páginas Filmes e Séries
- [x] Explorar com filtros (tipo, plataforma, gênero, ano, nota, duração, idioma, ordem)
- [x] Busca com sugestões, lupa, gênero sugerido ("guerra"), filtro Todos/Filmes/Séries
- [x] Página do filme/série: sinopse, classificação indicativa, elenco, trailer, onde assistir, recomendações

**Conforto e acessibilidade**
- [x] Modos Escuro, Claro e Noturno (com brilho ajustável)
- [x] Tamanho do texto, Modo sensorial calmo, Alto contraste
- [x] "Meus streamings" filtrando o site
- [x] Imagens em alta resolução; carregamento em partes, com esqueletos

### Visual novo (05/11/2026)
- [x] Destaque com a foto em tela cheia, arte do título e a luz do filme vazando atrás das fileiras
- [x] Fileiras com cartões horizontais, fonte Archivo e uma só margem no site
- [x] Gêneros de série em português (o TMDB manda alguns em inglês)
- [ ] Conferir no navegador: trailer tocando no destaque, tema Noturno, Modo calmo e cartões com cadeado do Kids

### Falta para fechar a Etapa A
- [ ] Sua revisão final no navegador, sem pressa
- [ ] Ajustes pequenos já conhecidos (lista abaixo)
- [ ] Vídeo de abertura em 1080p (opcional; o atual é 720p)
- [ ] Logo oficial do TMDB no rodapé (o download automático foi bloqueado)
- [ ] Atualizar a especificação com o que mudou (nome, menu, abertura, protetor de tela)
- [x] Juntar o ramo `etapa-a-catalogo` ao `main` (28/10/2026)
- [x] README de portfólio (com imagens e as decisões de acessibilidade)
- [x] Publicar na Vercel (link aberto para o portfólio)

### Publicação (05 a 08/11/2026)
- [x] Site na Vercel: [pai-degua.vercel.app](https://pai-degua.vercel.app)
- [x] Banco de produção trocado do Neon para o **Supabase** (região São Paulo), com as migrações aplicadas
- [x] RLS ligada em todas as tabelas, sem políticas: só o servidor do site acessa o banco (conferido no Security Advisor em 08/11, sem o alerta "RLS Disabled in Public")
- [x] Conexão com o certificado do Supabase
- [x] Registro do motivo quando o destaque fica sem dados do TMDB (sem expor o token)
- [x] Token do TMDB trocado, no `.env.local` e na Vercel, depois de aparecer no chat
- [x] `BETTER_AUTH_SECRET` local trocado
- [x] Imagem do Início no README atualizada com o visual novo
- [x] Apagar a pasta `app-temp` (sobra da criação do projeto)

**Ajustes pequenos já conhecidos**
- [ ] No Noturno, a página aparece com brilho total por um instante antes de escurecer
- [ ] Filtro de nota do Explorar só oferece 5 a 9 (perde valores como 7,5)
- [x] Busca: setas do teclado não navegam pelas sugestões
- [x] Se o TMDB cair por completo, o Início fica vazio, sem "Tentar novamente"
- [x] Se a lista de gêneros falhar, o Explorar inteiro mostra erro
- [ ] O destaque pode sumir se a lista em alta encolher depois de mudar "Meus streamings"
- [ ] Regras de preferências repetidas em dois arquivos

---

## Etapa B – Contas e Perfis

### B1 – Contas e Perfis (pronta, no ramo `etapa-b-contas`)
- [x] Banco de dados, cadastro e login com e-mail e senha (sessão dura 30 dias sem uso)
- [x] "Esqueci minha senha" com link por e-mail (sem a chave do Resend, o link aparece no terminal)
- [x] Visitante vê só a vitrine do Início (até 14 anos); o resto pede para entrar
- [x] "Experimentar sem cadastro": conta de demonstração (PIN 1234), recriada todo dia pelo horário de Belém
- [x] Tela "Quem está assistindo?", com o som de abertura (woosh de 6 s) ao escolher o perfil e a logo pulsando na transição (um só perfil entra direto)
- [x] Até 5 perfis por conta; criar, editar e excluir
- [x] Perfil Kids: títulos acima da faixa com cadeado, liberados um a um pelo PIN dos pais
- [x] Sair do Kids, trocar de perfil ou abrir áreas de adulto pede o PIN, mesmo depois de fechar o navegador
- [x] PIN bloqueia por 5 minutos depois de 5 erros
- [x] Aparência, acessibilidade e "Meus streamings" salvos em cada perfil
- [x] Minha conta: trocar senha, trocar PIN, excluir conta (desligado na demonstração)
- [x] Testes: 331 de unidade e componentes, 28 de ponta a ponta com acessibilidade
- [ ] Sua revisão no navegador (`npm run dev` e entrar pela demonstração)
- [x] Juntar o ramo ao `main` (28/10/2026, junto com a B2)

Feito depois da revisão (18/10): Kids só com títulos infantis, opção Todas/Todos nos filtros, botão Assistir na plataforma, sinopses justificadas, logo e som definitivos.

Ajustes pequenos já conhecidos da B1:
- [ ] No Kids, trocar senha/excluir conta sem PIN mostra a mensagem da demonstração em vez da do PIN
- [ ] Duas entradas na demonstração na virada do dia podem recriar os perfis duas vezes
- [ ] Na demonstração (compartilhada), um visitante pode mexer nos perfis dos outros até o dia seguinte
- [ ] No Kids, o título da aba mostra o nome de um título bloqueado
- [x] Nome do cadastro (até 40 letras) só é conferido no navegador
- [ ] Ao pedir para entrar a partir da busca, a palavra buscada se perde

### B2 – Listas e Indicações (pronta, no ramo `etapa-b-contas`)
- [x] Favoritar com o ♥ no cartaz e na página do título
- [x] Situação do título: *Assistindo* ou *Já assisti*
- [x] Séries em *Assistindo*: temporada e episódio, com "+1 episódio" e a pergunta "Marcar como Já assisti?" no fim
- [x] Página **Minha lista** (item no menu) com abas Favoritos, Assistindo e Já assisti, filtros, "Remover desta lista" e "Desfazer"
- [x] Fileiras no Início: **Continuar assistindo** (com "Parei no T1 E2") e **Indicados para você**
- [x] Gêneros favoritos do perfil: passo ao criar o perfil, edição em Gerenciar perfis e convite no Início
- [x] Kids: marcações respeitam a faixa e o PIN dos pais
- [x] Demonstração recriada todo dia, já com listas de exemplo no perfil Pai
- [x] Testes: 495 de unidade e componentes, 29 de ponta a ponta (percurso das listas com acessibilidade, incluindo desfazer em Já assisti)
- [ ] Sua revisão no navegador

## Etapa C – Assinatura (pagamento simulado)
- [x] Planos mensal, trimestral, semestral e anual (anual em destaque)
- [x] Teste grátis de 6 horas ao criar a conta, com faixa "Teste grátis: faltam …" e link para assinar
- [x] Pagamento simulado, sem cobrança real: Pix ("Já paguei") e cartão de teste (4242… aprova, 4000…0002 recusa)
- [x] Catálogo só para quem assina ou está no teste; teste acabado leva a `/assinar?motivo=expirou`
- [x] Minha conta: situação da assinatura, histórico de pagamentos e cancelamento (acesso até o fim do período pago); a demonstração segue sempre ativa
- [x] Teste de ponta a ponta com acessibilidade: conta nova com a faixa, teste acabado, pagar com Pix, abrir o catálogo e cancelar (assinatura.spec.js)
- [ ] Sua revisão no navegador
- [ ] Juntar o ramo ao `main`

## Etapa D – Personalização

Protótipo aprovado em 08/11/2026: https://claude.ai/artifact/2hFdr3aR1CwZSdHQEG7RQe · [especificação](superpowers/specs/2026-11-08-etapa-d-personalizacao-design.md) · [plano da D1](superpowers/plans/2026-11-08-etapa-d1-avatares-capa.md)

### D1 – Avatares e capa (ramo `etapa-d-personalizacao`)
- [x] 12 avatares próprios: Açaí, Cupuaçu, Pupunha, Jambu, Castanha, Ver-o-Peso (adulto) e Boto, Preguiça, Arara, Peixe-boi, Tracajá, Onça (Kids)
- [x] Escolha do avatar ao criar e editar o perfil (já vem marcado: Açaí ou Boto; opção "Só a inicial")
- [x] Avatar em "Quem está assistindo?", Gerenciar perfis, no topo do site e na transição
- [x] Capa da Minha lista com a imagem de um favorito, ou "Usar página padrão"
- [x] Cor de destaque tirada da imagem, ajustada para 3:1 nos temas Escuro e Claro (Noturno e Alto contraste usam a do tema)
- [x] Demonstração: Pai com Açaí e capa do filme favorito, Mãe com Ver-o-Peso, Pequeno com Boto
- [x] Lendas do Pará (09/11/2026): Curupira, Mapinguari, Matinta Perera, Boto encantado, Iara, Cobra Grande e Moça do Táxi, para todos os perfis (inclusive Kids); no formulário, cada grupo numa fileira que rola de lado
- [x] Sabores e festas do Pará (09/11/2026): carimbó, maniçoba, tacacá, camarão e Círio de Nazaré; mais urubu, garça e barquinho — 27 avatares no total (uirapuru retirado)
- [ ] Sua revisão no navegador
- [x] Juntar o ramo ao `main` (09/11/2026)

### D2 – Foto própria
- [x] Armazenamento Vercel Blob criado no painel da Vercel (09/11/2026)
- [x] Foto só em perfis adultos (inclusive na demonstração), apagada na recriação diária
- [x] Teste de ponta a ponta: escolher, recortar e salvar a foto, ver no menu do topo e apagar o arquivo ao voltar para um desenho (649 testes de unidade e componentes; personalizacao.spec.js com 2 de ponta a ponta, passando)

## Correções da auditoria de qualidade (09/11/2026, ramo `correcoes-auditoria`)
- [x] Prévias da Vercel não migram mais o banco (usam o mesmo `DATABASE_URL` da produção); só o build de produção migra
- [x] Em produção, sem `RESEND_API_KEY`, o "Esqueci minha senha" dá erro em vez de escrever o link no log
- [x] Conta de demonstração (compartilhada): não cria nem exclui perfis; na edição, só avatar dos desenhos e cor (sem nome novo nem foto própria). Revê a decisão da D2 de aceitar foto na demonstração: qualquer visitante publicaria uma imagem para todos
- [x] Cabeçalhos de segurança: `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- [x] Topo em tablets: o menu completo só a partir de 1024 px (entre 768 e 850 px os botões saíam da tela)
- [x] Gerenciar perfis no celular: botões descem de linha em vez de sair da tela
- [x] Celular: campos com letra de 16 px em telas de toque (o iPhone não dá mais zoom ao tocar na busca)
- [x] Alvos de toque de pelo menos 24 px ("Ver tudo", TMDB); topo numa linha só em 320 px
- [x] `zod` do `@vercel/cli-config` atualizado (4 vulnerabilidades altas do `@vercel/blob`)
- [x] Teste de ponta a ponta de responsividade: 320 a 1280 px, sem rolagem para o lado
- [ ] Na Vercel: chave do Resend e `EMAIL_FROM`; `DATABASE_URL` e `TMDB_READ_TOKEN` próprios para as prévias
- [ ] Depois da Etapa C: limite de tentativas de login guardado no banco (precisa de migração) e reset da demonstração sem disputa

Ideias novas continuam indo para [ideias-para-depois.md](ideias-para-depois.md).
