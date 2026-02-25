

# Como Conectar a API do Google Ads

## 📋 Pré-requisitos
1. Conta Google Ads ativa
2. Acesso de administrador na conta
3. Projeto no Google Cloud Console

---

## 🔧 Passo a Passo

### 1. Criar Projeto no Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Clique em **"Criar Projeto"**
3. Dê um nome (ex: "Yamuna Dashboard")
4. Anote o **Project ID**

### 2. Ativar a API do Google Ads
1. No menu lateral, vá em **"APIs e Serviços"** → **"Biblioteca"**
2. Pesquise por **"Google Ads API"**
3. Clique em **"Ativar"**

### 3. Criar Credenciais OAuth 2.0
1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ CRIAR CREDENCIAIS"** → **"ID do cliente OAuth"**
3. Tipo de aplicativo: **"Aplicativo da Web"**
4. Nome: "Yamuna Dashboard"
5. **URIs de redirecionamento autorizados**:
   - `http://localhost:3000/auth/callback`
   - `https://seu-dominio.com/auth/callback` (produção)
6. Clique em **"Criar"**
7. **Anote**:
   - ✅ **Client ID**
   - ✅ **Client Secret**

### 4. Obter o Customer ID e Developer Token

#### Customer ID:
1. Acesse sua conta Google Ads: https://ads.google.com
2. Clique no ícone de **ferramentas** no canto superior direito
3. Em "CONFIGURAÇÃO", clique em **"Configurações"**
4. Veja o **"ID do cliente"** (formato: 123-456-7890)
5. **Anote o ID sem os hífens**: `1234567890`

#### Developer Token:
1. Na mesma conta Google Ads, vá em **"API Center"**
2. Clique em **"Solicitar um token de desenvolvedor"**
3. Preencha o formulário:
   - Tipo de uso: Interno
   - Descreva o uso: "Dashboard interno de métricas"
4. Aguarde aprovação (pode levar 1-2 dias úteis)
5. **Anote o Developer Token**

### 5. Gerar Refresh Token

Execute este script no terminal do projeto:

\`\`\`bash
node scripts/get-google-ads-token.js
\`\`\`

Ou crie o arquivo `scripts/get-google-ads-token.js`:

\`\`\`javascript
const readline = require('readline');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'SEU_CLIENT_ID',
  'SEU_CLIENT_SECRET',
  'http://localhost:3000/auth/callback'
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Abra esta URL no navegador:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Cole o código de autorização aqui: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('Refresh Token:', tokens.refresh_token);
  rl.close();
});
\`\`\`

### 6. Adicionar ao `.env.local`

Adicione estas variáveis ao arquivo `.env.local`:

\`\`\`bash
# Google Ads API
GOOGLE_ADS_CLIENT_ID=seu_client_id_aqui
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_aqui
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token_aqui
GOOGLE_ADS_CUSTOMER_ID=1234567890
\`\`\`

---

## 📊 Estrutura dos Dados

A API do Google Ads retorna dados neste formato:

\`\`\`typescript
{
  campaign: {
    name: "Nome da Campanha",
    id: "123456789"
  },
  metrics: {
    impressions: 10000,
    clicks: 250,
    cost_micros: 50000000, // R$ 50,00 (dividir por 1.000.000)
    conversions: 15,
    conversions_value: 500.00,
    ctr: 2.5,
    average_cpc: 0.20
  }
}
\`\`\`

---

## ✅ Checklist Final

- [ ] Projeto criado no Google Cloud Console
- [ ] Google Ads API ativada
- [ ] Client ID e Client Secret obtidos
- [ ] Customer ID anotado (sem hífens)
- [ ] Developer Token solicitado e aprovado
- [ ] Refresh Token gerado
- [ ] Variáveis adicionadas ao `.env.local`
- [ ] Servidor reiniciado (`npm run dev`)

---

## 🆘 Problemas Comuns

### "Invalid customer ID"
- Certifique-se de usar o ID **sem hífens**
- Exemplo correto: `1234567890`

### "Developer token not approved"
- Aguarde aprovação do Google (1-2 dias)
- Use modo de teste enquanto isso (limitado)

### "Refresh token not working"
- Regere o token seguindo o passo 5
- Certifique-se de usar `access_type: 'offline'`

---

## 📚 Documentação Oficial
- [Google Ads API - Get Started](https://developers.google.com/google-ads/api/docs/start)
- [OAuth2 para Google Ads](https://developers.google.com/google-ads/api/docs/oauth)
