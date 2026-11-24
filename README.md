# Cardápio Arena Beach Park

Aplicação estática para GitHub Pages, integrada ao Supabase. O repositório deve conter os arquivos deste diretório na raiz (não dentro de uma segunda pasta).

## Arquivos publicados

- `index.html` — cardápio público.
- `admin.html` — painel administrativo (login Supabase Auth).
- `app.js` — carrinho, busca, pedidos e sincronização de produtos.
- `config.js` — URL, chave pública do Supabase e WhatsApp.
- `assets/` — identidade visual.
- `supabase/schema.sql` — estrutura e políticas do banco (já executado, conforme configuração atual).
- `products-seed.json` — catálogo original de referência (53 produtos; já importados no Supabase).

## Publicar no GitHub Pages

1. Crie um repositório no GitHub. Sugestão: `cardapio-arena-beach-park`.
2. Configure-o como **Private** se quiser restringir o código-fonte. Atenção: um site GitHub Pages de repositório privado depende do plano/organização e da configuração de Pages; o conteúdo do site publicado pode ficar público. Para um cardápio público, normalmente o repositório público é a opção mais simples.
3. Envie **todo o conteúdo desta pasta** para a raiz do repositório. Não envie somente o ZIP e não crie uma pasta externa contendo o projeto.
4. No GitHub, abra `Settings > Pages`.
5. Em **Build and deployment**, selecione `Deploy from a branch`.
6. Escolha a branch `main` e a pasta `/(root)`, depois clique em **Save**.
7. Aguarde a publicação e abra o endereço mostrado pelo GitHub. Com o nome sugerido, normalmente será `https://SEU-USUARIO.github.io/cardapio-arena-beach-park/`.
8. O painel administrativo ficará em `https://SEU-USUARIO.github.io/cardapio-arena-beach-park/admin.html`.

O arquivo `.nojekyll` já está incluído. Os caminhos de imagens e scripts são relativos, compatíveis com GitHub Pages em repositório de projeto.

## Configuração obrigatória no Supabase Auth após publicar

No painel Supabase, abra `Authentication > URL Configuration`:

- `Site URL`: informe a URL base exata publicada pelo GitHub Pages, incluindo a barra final.
- `Redirect URLs`: adicione a URL base e a URL do painel administrativo (`.../admin.html`).

Salve as alterações. Isso permite que o fluxo de autenticação seja autorizado no domínio publicado.

## Testes depois da publicação

1. Abra o endereço público e confirme que o cardápio aparece sem erro no Console do navegador.
2. Confirme no Supabase que existem 53 produtos ativos na tabela `public.products`.
3. Adicione um produto ao carrinho e teste alterar quantidades e remover itens.
4. Faça um pedido de teste real somente quando estiver pronto para registrar o pedido no banco. O pedido é gravado em `public.orders` e depois abre o WhatsApp com a mensagem preenchida; o cliente precisa confirmar o envio no WhatsApp.
5. Abra `/admin.html`, entre com o usuário Supabase Auth autorizado em `public.admin_users` e confirme que produtos e pedidos carregam.
6. Teste a alteração do status de um pedido.

Consulta de conferência no SQL Editor:

```sql
select
  count(*) as total_produtos,
  count(*) filter (where active = true) as produtos_ativos,
  count(distinct category) as categorias,
  count(*) filter (where prices is null or cardinality(prices) = 0) as produtos_sem_preco
from public.products;
```

Resultado esperado: `53`, `53`, `5`, `0`.

## Segurança e limites

- `config.js` contém apenas a chave pública `sb_publishable_...`, apropriada para uso no navegador. Nunca coloque `service_role`, secret keys ou senha no repositório.
- A chave pública não substitui as políticas RLS. Mantenha RLS ativo e não crie leitura pública de pedidos nem administração pública de produtos.
- O painel depende da autenticação Supabase e da autorização do UUID do usuário em `public.admin_users`.
- O navegador envia os itens e o total do pedido. O banco não recalcula o preço; não use esse total como cobrança/pagamento sem validação no servidor, por exemplo com Edge Function.
- O WhatsApp configurado foi mantido como informado (`553499476917`). Teste o link e confirme se abre o contato correto. Se não abrir, corrija `WHATSAPP_NUMBER` em `config.js` (somente dígitos, com código do país e DDD).
- O GitHub Pages hospeda arquivos estáticos. Não executa backend, funções privadas ou segredos.

## Desenvolvimento local

Abra a pasta com VS Code e use uma extensão de servidor local (por exemplo, Live Server). Evite abrir o HTML por `file://`, pois algumas funções do navegador e integrações podem exigir HTTP/HTTPS.
