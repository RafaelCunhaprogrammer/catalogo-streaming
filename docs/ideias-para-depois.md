# Ideias para depois

Toda ideia nova entra aqui. No fim de cada etapa, revisamos esta lista e decidimos o que entra na próxima.

## Já planejadas para etapas futuras

### Etapa B – Contas e Perfis
- Banco de dados, cadastro e login.
- Login duradouro: a sessão expira após 30 dias sem uso; cada uso renova o prazo.
- Vários perfis por conta, com a tela "Quem está assistindo?".
- Perfil Kids: a criança vê o catálogo inteiro, mas os títulos acima da idade dela aparecem com 🔒 e só abrem com a senha dos pais. A regra segue a classificação indicativa brasileira (L, 10, 12, 14, 16, 18). Títulos sem classificação ficam bloqueados por precaução.
  - A decidir no design da Etapa B: idade por perfil, e se a senha libera um título ou a sessão inteira.
- FAVORITOS: seção com os filmes e séries favoritados pelo perfil.
- Preferências do perfil: gêneros favoritos escolhidos ao criar o perfil.
- Indicações personalizadas a partir das preferências, dos favoritos e dos assistidos.
- "Estou assistindo" (com "Parei no T2 E5" para séries), "Já assisti" e a fileira "Continuar assistindo", que leva à plataforma certa.
- Aparência, acessibilidade e "Meus streamings" passam a ser salvos no perfil, e não só no navegador.
- O som de abertura passa a tocar após a escolha do perfil.

### Etapa C – Assinatura (pagamento simulado)
- Planos mensal, trimestral, semestral e anual, com o anual destacado como o mais vantajoso.
- Teste grátis de algumas horas.
- Pagamento em modo de teste (Stripe ou Mercado Pago), sem dinheiro real.
- Acesso ao catálogo só para assinantes ou pessoas em período de teste.

### Etapa D – Personalização
- Fotos de perfil sugeridas em dois conjuntos de ilustrações próprias: infantil (bichos da Amazônia, frutas com carinha) e adulto (frutas regionais, símbolos de Belém).
- Foto própria **só em perfis adultos** (imagem de criança é dado sensível pela LGPD) e **desligada na demonstração** (compartilhada com desconhecidos). Recorte quadrado e redução para ~256 px no navegador antes de enviar; guardar num serviço de arquivos (ex.: Vercel Blob) e apagar o arquivo antigo ao trocar a foto ou excluir o perfil/conta.
- Avatares próprios ilustrados (mago, herói, astronauta, dinossauro…), sem personagens de marcas.
- Capa do perfil com a imagem oficial (TMDB) do filme ou série favorito, com a cor de destaque adaptada a ela, e a opção "Usar página padrão".

## Decisões registradas
- Não perguntar sobre ansiedade, depressão ou outras condições de saúde: são dados sensíveis pela LGPD. A seção "Como você quer se sentir hoje?" atende o mesmo objetivo sem coletar nada.
- Sem avatares ou temas de personagens de franquias (Harry Potter, Homem-Aranha…): os direitos pertencem aos estúdios.
- "Continuar assistindo" automático não é possível: os serviços de streaming não informam onde a pessoa parou.
- Uso comercial real exigiria licença comercial do TMDB e do JustWatch. Este projeto é de aprendizado e uso pessoal.

## Novas ideias
- Logo alternativa com o **paneiro** cheio de caroços de açaí (versão 2, testada em 18/10/2026). Ficou guardada em `docs/marca/logo-paneiro.png`, já recortada e sem o texto. Por enquanto ficou a versão 1 (o caroço): em tamanho pequeno, no topo, o paneiro vira uma mancha escura no modo Escuro. Pode voltar numa mudança futura da marca, por exemplo em telas grandes ou na abertura.
- **"Sala Pai d'Égua"**: filmes que tocam no próprio site, só com conteúdo que pode ser exibido legalmente (os filmes dos streamings não podem: exigiriam licença de cada estúdio).
  - Domínio público: no Brasil, filmes lançados há mais de 70 anos (Lei 9.610, art. 44), ou seja, até 1955 em 2026. Muitos estão no Internet Archive, com player que pode ser embutido.
  - Licença livre (Creative Commons), como os curtas da Blender Foundation (*Big Buck Bunny*, *Sintel*, *Tears of Steel*), citando os autores.
  - Filmes completos liberados oficialmente pelas distribuidoras no YouTube (embutir é permitido, como já fazemos com os trailers).
  - Sem custo de hospedagem usando Internet Archive e YouTube; conteúdo próprio exigiria um serviço de vídeo pago (Mux, Cloudflare Stream).
  - Conferir a situação de direitos de cada título antes de incluir.
