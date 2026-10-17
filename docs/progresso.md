# Pai d'Égua: progresso do projeto

Atualizado em 17/10/2026. Marque aqui o que for sendo concluído.

## Visão geral

| Etapa | O que é | Situação |
|---|---|---|
| **A – Catálogo** | O site em si: vitrine, busca, páginas de filmes e séries, visual e acessibilidade | **Quase pronta** (falta fechar e publicar) |
| **B – Contas e Perfis** | Login, perfis, Kids com controle dos pais, favoritos, "Continuar assistindo" | **B1 pronta** no ramo `etapa-b-contas` (falta revisar e juntar); B2 não iniciada |
| **C – Assinatura** | Planos, teste grátis e pagamento simulado | Não iniciada |
| **D – Personalização** | Avatares regionais e capa do perfil | Não iniciada |

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
- [x] Nome **Pai d'Égua** e logo do açaí preso à ráquila
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

### Falta para fechar a Etapa A
- [ ] Sua revisão final no navegador, sem pressa
- [ ] Ajustes pequenos já conhecidos (lista abaixo)
- [ ] Vídeo de abertura em 1080p (opcional; o atual é 720p)
- [ ] Logo oficial do TMDB no rodapé (o download automático foi bloqueado)
- [ ] Atualizar a especificação com o que mudou (nome, menu, abertura, protetor de tela)
- [ ] Juntar o ramo `etapa-a-catalogo` ao `main`
- [ ] README de portfólio (com imagens e as decisões de acessibilidade)
- [ ] Publicar na Vercel (link aberto para o portfólio)
- [ ] Apagar a pasta `app-temp` (sobra da criação do projeto)

**Ajustes pequenos já conhecidos**
- [ ] No Noturno, a página aparece com brilho total por um instante antes de escurecer
- [ ] Filtro de nota do Explorar só oferece 5 a 9 (perde valores como 7,5)
- [ ] Busca: setas do teclado não navegam pelas sugestões
- [ ] Se o TMDB cair por completo, o Início fica vazio, sem "Tentar novamente"
- [ ] Se a lista de gêneros falhar, o Explorar inteiro mostra erro
- [ ] O destaque pode sumir se a lista em alta encolher depois de mudar "Meus streamings"
- [ ] Regras de preferências repetidas em dois arquivos

---

## Etapa B – Contas e Perfis

### B1 – Contas e Perfis (pronta, no ramo `etapa-b-contas`)
- [x] Banco de dados, cadastro e login com e-mail e senha (sessão dura 30 dias sem uso)
- [x] "Esqueci minha senha" com link por e-mail (sem a chave do Resend, o link aparece no terminal)
- [x] Visitante vê só a vitrine do Início (até 14 anos); o resto pede para entrar
- [x] "Experimentar sem cadastro": conta de demonstração (PIN 1234), recriada todo dia pelo horário de Belém
- [x] Tela "Quem está assistindo?", com o som de abertura ao escolher o perfil (um só perfil entra direto)
- [x] Até 5 perfis por conta; criar, editar e excluir
- [x] Perfil Kids: títulos acima da faixa com cadeado, liberados um a um pelo PIN dos pais
- [x] Sair do Kids, trocar de perfil ou abrir áreas de adulto pede o PIN, mesmo depois de fechar o navegador
- [x] PIN bloqueia por 5 minutos depois de 5 erros
- [x] Aparência, acessibilidade e "Meus streamings" salvos em cada perfil
- [x] Minha conta: trocar senha, trocar PIN, excluir conta (desligado na demonstração)
- [x] Testes: 331 de unidade e componentes, 28 de ponta a ponta com acessibilidade
- [ ] Sua revisão no navegador (`npm run dev` e entrar pela demonstração)
- [ ] Juntar o ramo ao `main` (depois da Etapa A)

Ajustes pequenos já conhecidos da B1:
- [ ] No Kids, trocar senha/excluir conta sem PIN mostra a mensagem da demonstração em vez da do PIN
- [ ] Duas entradas na demonstração na virada do dia podem recriar os perfis duas vezes
- [ ] Na demonstração (compartilhada), um visitante pode mexer nos perfis dos outros até o dia seguinte
- [ ] No Kids, o título da aba mostra o nome de um título bloqueado
- [ ] Nome do cadastro (até 40 letras) só é conferido no navegador
- [ ] Ao pedir para entrar a partir da busca, a palavra buscada se perde

### B2 – Listas e Indicações (próxima)
- [ ] FAVORITOS
- [ ] Preferências do perfil (gêneros favoritos) e indicações personalizadas
- [ ] "Estou assistindo", "Já assisti" e a fileira "Continuar assistindo"

## Etapa C – Assinatura (pagamento simulado)
- [ ] Planos mensal, trimestral, semestral e anual (anual em destaque)
- [ ] Teste grátis de algumas horas
- [ ] Pagamento em modo de teste (Stripe ou Mercado Pago)
- [ ] Acesso só para assinantes ou em teste

## Etapa D – Personalização
- [ ] Avatares regionais (açaí, jambu, manga, pupunha, cupuaçu…)
- [ ] Capa do perfil com a imagem do filme ou série favorito

Ideias novas continuam indo para [ideias-para-depois.md](ideias-para-depois.md).
