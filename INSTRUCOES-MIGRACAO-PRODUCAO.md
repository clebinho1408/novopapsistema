# 📋 Instruções para Migração para Banco de Produção

## ⚠️ Problema Atual
O aplicativo publicado está usando um **banco de dados temporário** que é resetado automaticamente, causando perda de dados após logout/login.

## ✅ Solução: Migrar para Banco de Produção Permanente

---

## 🔧 PASSO A PASSO

### **1. Criar Banco de Dados de Produção**

1. Acesse: https://dash.cloudflare.com/
2. No menu lateral → **Workers & Pages**
3. Clique na aba **D1 SQL Database**
4. Clique em **Create database**
5. Nome sugerido: `pap-sistema-producao`
6. Clique em **Create**
7. **⚠️ IMPORTANTE: Anote o "Database ID"** (exemplo: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

### **2. Aplicar as Migrações no Banco de Produção**

Execute este comando no terminal do Replit (substitua `SEU-DATABASE-ID` pelo ID que você anotou):

```bash
npx wrangler d1 migrations apply SEU-DATABASE-ID --remote
```

Este comando aplicará todas as 17 migrações do sistema no banco novo.

---

### **3. Importar os Dados de Configuração**

#### **Opção A: Via Dashboard Cloudflare (Recomendado)**

1. No painel D1, clique no seu novo banco de produção
2. Clique na aba **Console**
3. Abra o arquivo `migration-to-production.sql` deste projeto
4. Copie TODO o conteúdo do arquivo
5. Cole no console do Cloudflare
6. Clique em **Execute**

#### **Opção B: Via Terminal (Alternativo)**

```bash
# Substitua SEU-DATABASE-ID pelo ID do seu banco
npx wrangler d1 execute SEU-DATABASE-ID --remote --file=./migration-to-production.sql
```

---

### **4. Criar Usuário Administrativo**

Após importar os dados, você precisará criar um novo usuário:

1. Acesse o aplicativo publicado
2. Clique em **Criar Conta**
3. Preencha os dados:
   - Nome: (seu nome)
   - Email: (seu email)
   - Senha: (sua senha)
   - Código da Agência: **deixe em branco na primeira vez**
4. Clique em **Registrar**

**O primeiro usuário cadastrado será automaticamente o administrador da agência.**

---

### **5. Atualizar Configuração do Aplicativo**

Agora precisamos atualizar o aplicativo para usar o banco de produção:

**Me envie o Database ID do banco de produção que você criou**, e eu atualizarei automaticamente a configuração do sistema.

---

### **6. Republicar o Aplicativo**

Após eu atualizar a configuração, você precisará republicar o aplicativo:

1. No Replit, clique no botão **Deploy/Publicar**
2. Aguarde o processo finalizar
3. Teste o aplicativo:
   - Faça login
   - Altere algum dado
   - Faça logout
   - Faça login novamente
   - **Verifique se o dado foi mantido** ✅

---

## 📦 O que será preservado?

✅ **Agência**: Balneário Camboriú
✅ **7 Cidades**: BALNEÁRIO CAMBORIÚ, BOMBINHAS, CAMBORIÚ, CANELINHA, PORTO BELO, ITAPEMA, TIJUCAS
✅ **5 Etapas**: Foto, Taxa, Exame Médico, Exame Psicológico, Prova
✅ **5 Taxas**: Emissão da CNH, Transferência, Psicólogo, Médico, Prova (com vínculos corretos)
✅ **28 Credenciados**: Todos os profissionais cadastrados

❌ **Não será preservado**:
- Processos "Passo a Passo" individuais
- Sessões de usuários
- Histórico

---

## 🆘 Ajuda

Se encontrar qualquer erro durante o processo, me envie:
1. A mensagem de erro completa
2. Em qual passo você estava

Estou aqui para ajudar! 🚀
