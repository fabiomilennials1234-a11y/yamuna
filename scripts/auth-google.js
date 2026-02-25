const { google } = require('googleapis');
const readline = require('readline');
const http = require('http');
const url = require('url');

// 1. PREENCHA AQUI COM OS DADOS DO SEU "ID DO CLIENTE OAUTH"
// (Crie em: Google Cloud > Credenciais > Criar Credenciais > ID do cliente do OAuth > App para Desktop)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// Escopos necessários para ler o Analytics e confirmar a identidade do usuário
const SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

console.log('--- GERADOR DE REFRESH TOKEN GOOGLE ---');
console.log('1. Certifique-se de ter criado uma credencial "ID do cliente do OAuth" (Tipo Desktop) no Google Cloud.');
console.log('2. Script pré-configurado com suas credenciais.');

// Servidor temporário para receber o código
const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth2callback')) {
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');

        res.end('Autenticacao OK! Pode fechar esta janela e olhar o terminal.');
        server.close();

        console.log(`\nCódigo recebido: ${code}`);
        console.log('Trocando código por tokens...');

        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Verificar qual email autenticou
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            const userEmail = userInfo.data.email;

            console.log('\n----------------------------------------');
            console.log(`AUTENTICADO COMO: ${userEmail}`);

            if (userEmail !== 'gabrielgipp04@gmail.com') {
                console.log('\n[ATENÇÃO] Este NÃO parece ser o email que tem acesso ao GA4!');
                console.log('Por favor, rode novamente e logue com a conta correta.');
            } else {
                console.log('Identity Check: OK (Email correto)');
            }

            console.log('----------------------------------------');
            console.log('----------------------------------------');
            console.log('SUCESSO! Copie e salve estas chaves no seu .env.local:');
            console.log('----------------------------------------');
            console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
            console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('----------------------------------------\n');

            // Save to file for automation
            const fs = require('fs');
            const path = require('path');
            const tokenData = {
                GOOGLE_CLIENT_ID: CLIENT_ID,
                GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
                GOOGLE_REFRESH_TOKEN: tokens.refresh_token
            };
            fs.writeFileSync(
                path.join(__dirname, '..', '.new-google-token.json'),
                JSON.stringify(tokenData, null, 2)
            );
            console.log('✅ Credenciais salvas em .new-google-token.json');

            process.exit(0);
        } catch (error) {
            console.error('Erro ao trocar token:', error.message);
            process.exit(1);
        }
    }
}).listen(3000);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces Google to provide a new Refresh Token
});

console.log(`\n3. Abra este link no navegador para autorizar: \n${authUrl}`);
