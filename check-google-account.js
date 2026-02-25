// Script para verificar qual conta Google está associada ao refresh token
const https = require('https');
const fs = require('fs');
const path = require('path');

// Ler .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove aspas se houver
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('❌ Credenciais faltando no .env.local');
    process.exit(1);
}

const postData = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token'
}).toString();

const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};

console.log('🔍 Verificando token do Google...\n');

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);

            if (response.error) {
                console.error('❌ Erro ao trocar token:');
                console.error('Tipo:', response.error);
                console.error('Descrição:', response.error_description || 'N/A');
                console.log('\n💡 O token provavelmente expirou ou foi revogado.');
                console.log('   Você precisará gerar um novo refresh token.');
            } else {
                console.log('✅ Token válido!');
                console.log('Access Token obtido:', response.access_token.substring(0, 20) + '...');

                // Agora vamos buscar info da conta
                getAccountInfo(response.access_token);
            }
        } catch (e) {
            console.error('❌ Erro ao processar resposta:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Erro na requisição:', e.message);
});

req.write(postData);
req.end();

function getAccountInfo(accessToken) {
    const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/oauth2/v2/userinfo',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const userInfo = JSON.parse(data);
                console.log('\n📧 Informações da Conta Google:');
                console.log('Email:', userInfo.email);
                console.log('Nome:', userInfo.name);
                console.log('ID:', userInfo.id);
            } catch (e) {
                console.error('❌ Erro ao buscar info da conta:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ Erro:', e.message);
    });

    req.end();
}
