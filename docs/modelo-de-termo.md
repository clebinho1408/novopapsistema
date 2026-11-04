# Modelo de Termo — configuração de armazenamento

O PDF fica privado no App Storage. O banco guarda somente o caminho do objeto,
nome, tamanho e ativação por agência. Nenhum arquivo é enviado nos emails.

## Banco

- Node/PostgreSQL: aplicar `migrations/postgresql-term-template.sql` (a tabela
  também está declarada no schema Drizzle).
- Cloudflare/D1: aplicar `migrations/25.sql` pelo procedimento habitual do projeto.
- A alteração foi aplicada somente ao banco de desenvolvimento. Não executar a
  migração em produção nem publicar sem autorização do responsável.

## Node na Replit

1. Abra **Tools → App Storage** no editor e crie/selecione um bucket.
2. O SDK usa o bucket padrão e a autenticação automática da Replit.
3. Para selecionar um bucket específico, configure `TERM_STORAGE_BUCKET` com o
   identificador do bucket, pelas ferramentas de variáveis do workspace.
4. Reinicie o aplicativo após configurar. Faça upload pela aba **Modelo de
   Termo** usando uma conta administradora.

Sem bucket configurado o upload falha explicitamente. Não há fallback para
arquivos locais ou base64 no banco.

## Cloudflare Pages (site publicado) e Worker separado

O site `papsistema.pages.dev` é o projeto **Cloudflare Pages `papsistema`**.
Sua API entra por `functions/api/[[path]].ts`, que usa o mesmo app Hono do
projeto. O Pages tem seu próprio build/publicação e configuração de bindings.

Existe também um **Worker `papsistema`** separado, configurado em
`wrangler.json`. Publicar ou conferir apenas esse Worker não significa atualizar
o site Pages. Antes de uma alteração de produção, conferir o projeto Pages e o
banco realmente vinculado a ele pela API Cloudflare.

O SDK automático da Replit não autentica o runtime externo do Pages ou Worker.
O adaptador de arquivos externo usa a API
Google Cloud Storage do mesmo bucket de App Storage, com:

- `TERM_STORAGE_BUCKET`: identificador/nome do bucket.
- `TERM_STORAGE_SERVICE_ACCOUNT`: secret contendo o JSON de uma conta de serviço
  com acesso de leitura, criação e exclusão de objetos **somente nesse bucket**.

O acesso dessa conta ao bucket precisa ser confirmado antes da ativação. Não
assumir que um token da Cloudflare dá acesso ao App Storage. Se não houver como
conceder esse acesso ao bucket gerenciado, decidir uma arquitetura compatível
com o responsável antes de publicar; não criar um bucket de outro provedor ou
salvar os arquivos no banco como alternativa silenciosa.

Use os mecanismos seguros de secrets de cada ambiente para configurar a
credencial; nunca inclua seu conteúdo em código, logs, arquivos versionados ou
chat. Secrets da Replit não são automaticamente transferidos ao Cloudflare.

## Verificação

- `npx tsx scripts/test-term-template.ts`: validação real de PDF, SQLite real,
  middleware de sessão, permissões, isolamento, troca segura e falhas de storage.
- `node scripts/test-term-browser.mjs`: componentes com APIs de teste isoladas,
  renderização real por PDF.js e impressão Chromium com uma/duas páginas A4,
  seis serviços, casos negativos, falha/repetição e visualização móvel.
  Requer o workflow ativo, `REPLIT_DEV_DOMAIN` e Chromium em
  `/repl/tools/bin/chromium`. Resultados em `generated-artifacts/term-tests/`.
- `node scripts/test-rehabilitation.cjs`: regressão da primeira página e emails.
- `npm run build`: compilação e empacotamento, incluindo fontes/CMaps locais.

Os testes com storage em memória não comprovam o acesso real ao bucket. A
verificação de ponta a ponta exige um bucket configurado e acesso autorizado à
conta; não contornar a autenticação para verificá-la.
