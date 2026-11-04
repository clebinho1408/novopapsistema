# Modelo de Termo — configuração de armazenamento

O PDF fica privado no R2 para o site Cloudflare e no App Storage para Node na Replit. O banco guarda somente o caminho do objeto,
nome, tamanho e ativação por agência. Nenhum arquivo é enviado nos emails.

## Banco

- Node/PostgreSQL: aplicar `migrations/postgresql-term-template.sql` (a tabela
  também está declarada no schema Drizzle).
- Cloudflare/D1: aplicar `migrations/25.sql` pelo procedimento habitual do projeto.
- A tabela também foi criada no D1 de produção com autorização restrita à criação
  da tabela. Não executar outras migrações nem publicar sem autorização do responsável.

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
`wrangler.worker.json`. Publicar ou conferir apenas esse Worker não significa atualizar
o site Pages. Antes de uma alteração de produção, conferir o projeto Pages e o
banco realmente vinculado a ele pela API Cloudflare.

O arquivo `wrangler.json` da raiz é para **Pages**, com
`pages_build_output_dir: "./dist"`. O comando de build no painel Pages deve ser
`npm run cf-build`, com diretório de saída `dist`. O repositório usa
`package-lock.json` e npm; não requer pnpm.

Antes de enviar alterações para publicação, execute `npm run check:cloudflare`.
Pacotes instalados na Replit podem introduzir URLs de registry interno no
lockfile. Essas URLs não são acessíveis no Cloudflare; o lockfile de publicação
deve usar URLs públicas HTTPS, preservando versões e hashes de integridade.

O responsável autorizou o uso de **R2 privado** para os PDFs no Cloudflare.
O SDK automático da Replit não autentica o runtime externo do Pages ou Worker.
Esses ambientes usam o binding nativo `TERM_PDFS`, apontado ao bucket
`termos-pap` nos dois arquivos Wrangler.

1. No painel Cloudflare, ative **R2 Object Storage**. A ativação pode exigir
   configuração de cobrança e deve ser concluída pelo responsável.
2. Crie um bucket chamado **termos-pap** (ou confirme se já existe).
3. Mantenha **Public Development URL / r2.dev** desativada. Não adicione domínio
   público nem política de acesso público. Não é necessário configurar CORS:
   o navegador acessa a API autenticada da agência, nunca o bucket diretamente.
4. Sincronize o código com o GitHub e publique uma nova versão no **Pages**.
   O Wrangler aplicará o binding. Alterar só o painel sem atualizar o código
   antigo não troca o adaptador de armazenamento.
5. Verifique o binding `TERM_PDFS` em produção e faça upload de um PDF de uma
   página pela conta administradora.

Não são necessárias chaves S3 nem `TERM_STORAGE_SERVICE_ACCOUNT` no Cloudflare.
O D1 continua guardando somente metadados; nenhuma migração adicional é necessária.
Não copiar arquivos entre os buckets da Replit e Cloudflare automaticamente.
Uma publicação sem o bucket criado e o R2 ativo não está pronta para uso.

## Verificação

- `npx tsx scripts/test-term-template.ts`: validação real de PDF, SQLite real,
  middleware de sessão, permissões, isolamento, troca segura e falhas de storage.
  Inclui o adaptador R2 executado no runtime local Cloudflare/Miniflare: upload,
  leitura, metadados PDF, persistência, substituição e limpeza após falha no banco.
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
