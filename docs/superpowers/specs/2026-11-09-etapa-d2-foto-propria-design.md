# Etapa D2 – Foto própria: especificação de design

**Data:** 2026-11-09
**Status:** aguardando revisão
**Ramo:** `etapa-d2-foto-propria`
**Base:** [especificação da Etapa D](2026-11-08-etapa-d-personalizacao-design.md), §11

## 1. Objetivo

Um perfil adulto pode usar uma foto como avatar, no lugar de um dos 27 desenhos.

**Sucesso:** a pessoa escolhe uma foto no computador ou no celular, ajusta o recorte quadrado, salva, e a foto aparece em "Quem está assistindo?", no topo do site e na capa da Minha lista.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Quem pode | Só perfis **adultos**, inclusive na demonstração. Foto de criança é dado sensível pela LGPD, então o perfil Kids não vê a opção |
| Onde fica | **Vercel Blob privado** `pai-degua-fotos`, região São Paulo (criado em 09/11/2026; token em `BLOB_READ_WRITE_TOKEN`) |
| Quem vê | Só quem está logado na conta dona do perfil. A foto passa pelo site (§5), e nunca há um endereço público |
| Tamanho | Recorte quadrado e redução para **256 × 256 px no navegador**, em WebP (JPEG se o navegador não gerar WebP), até **200 KB** |
| Demonstração | Liberada nos adultos; a recriação diária apaga as fotos |
| Sem token (computador local e testes) | As fotos ficam numa pasta local, `.data/fotos/` (§6) |

## 3. Dados

Nova coluna em `profiles`:

| Coluna | Tipo | Observação |
|---|---|---|
| `photo_key` | text | caminho do arquivo no armazenamento (`fotos/<perfil>/<aleatório>.webp`), ou `null` |

O avatar especial `'foto'` em `profiles.avatar` indica que a foto está em uso. A foto continua guardada se a pessoa voltar a escolher um desenho? **Não:** voltar para um desenho apaga a foto (§4.4). Assim nada fica guardado sem uso.

## 4. Regras

1. **Enviar:** só para o perfil indicado, que precisa ser adulto e da conta da sessão. Área de adulto: no Kids, pede o PIN, como editar perfil.
2. **Conferência no servidor:** o arquivo precisa ser WebP, JPEG ou PNG (conferido pelos primeiros bytes, não pelo nome), ter até 200 KB, e ter exatamente 256 × 256 px (conferido com o `sharp`). Fora disso: "Não foi possível usar essa imagem. Tente outra foto."
3. **Trocar a foto:** a nova é gravada, `photo_key` passa a apontar para ela, e só então a antiga é apagada.
4. **Voltar para um desenho ou "Só a inicial":** a foto é apagada e `photo_key` vira `null`.
5. **Excluir o perfil, excluir a conta ou recriar a demonstração:** as fotos daqueles perfis são apagadas antes de apagar as linhas do banco.
6. **Trocar o tipo para Kids:** a foto é apagada e o avatar volta para o padrão do Kids (Boto).
7. Se apagar um arquivo falhar, o erro é registrado e o fluxo continua. Um arquivo órfão não pode impedir a pessoa de seguir.

## 5. Como a foto chega à tela

- Rota `GET /api/foto/[perfilId]`: confere a sessão, confere que o perfil é da conta, lê o arquivo do armazenamento e responde com `Cache-Control: private, max-age=3600`. Sem permissão: 404. O endereço muda a cada troca de foto (`?v=<parte da chave>`), então o navegador não mostra a foto antiga.
- `ProfileAvatar`: com `avatar: 'foto'` e `photoUrl`, mostra `<img alt="">` (enfeite, porque o nome está ao lado) em vez do desenho.

## 6. Armazenamento

`lib/photos/storage.js` com três funções (`put`, `get`, `del`) e duas implementações:
- **Vercel Blob** (`@vercel/blob`, acesso privado) quando `BLOB_READ_WRITE_TOKEN` existe;
- **pasta local** `.data/fotos/` nos outros casos (desenvolvimento sem token e testes de ponta a ponta).

## 7. Tela

- No seletor de avatar, uma quinta fileira, **"Sua foto"**, só para perfis adultos: botão "Escolher foto" e, depois de escolher, um recorte quadrado. A pessoa arrasta a imagem e ajusta o zoom num controle deslizante (que também funciona pelo teclado), e depois toca em "Usar esta foto". A prévia aparece no lugar do desenho.
- A foto só é enviada quando a pessoa salva o perfil. Enquanto envia, o botão mostra "Enviando foto…".
- Erros: "Não foi possível usar essa imagem. Tente outra foto." e "Não foi possível salvar. Tente de novo."
- No Kids, a fileira não aparece.

## 8. Acessibilidade

- "Escolher foto" é um `<input type="file" accept="image/*">` com rótulo visível.
- O recorte tem um controle deslizante "Zoom" e botões de seta para mover a imagem.
- Não há nada que dependa só de arrastar com o mouse.

## 9. Testes

- **Unidade:** conferência do arquivo (tipo pelos primeiros bytes, tamanho e dimensões); regras 4.3 a 4.6 com o armazenamento local; a rota de §5 respondendo 404 para outra conta.
- **Componentes:** a fileira "Sua foto" só no adulto; o recorte gera 256 × 256 (com `canvas` simulado).
- **Ponta a ponta:** na demonstração, o Pai envia uma foto e a vê no topo; volta para o Açaí e a foto some do armazenamento local.
