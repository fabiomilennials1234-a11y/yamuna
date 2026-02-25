// Test GA4 Connection
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Ler .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const GA4_PROPERTY_ID = env.GA4_PROPERTY_ID;
const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = env.GOOGLE_REFRESH_TOKEN;

console.log('🔍 Testando conexão com GA4...\n');
console.log('📋 Configuração:');
console.log('   GA4_PROPERTY_ID:', GA4_PROPERTY_ID || '❌ FALTANDO');
console.log('   CLIENT_ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : '❌ FALTANDO');
console.log('   CLIENT_SECRET:', CLIENT_SECRET ? '✅ Configurado' : '❌ FALTANDO');
console.log('   REFRESH_TOKEN:', REFRESH_TOKEN ? `${REFRESH_TOKEN.substring(0, 15)}...` : '❌ FALTANDO');
console.log('');

if (!GA4_PROPERTY_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('❌ Credenciais incompletas no .env.local');
    process.exit(1);
}

async function testGA4() {
    try {
        const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        auth.setCredentials({ refresh_token: REFRESH_TOKEN });

        const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

        // Data range - últimos 7 dias
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        console.log(`📅 Buscando dados de ${startDate} até ${endDate}...\n`);

        const response = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' }
                ],
            },
        });

        console.log('✅ SUCESSO! Conexão com GA4 estabelecida!');
        console.log('');
        console.log('📊 Dados recebidos:');
        console.log('   Linhas retornadas:', response.data.rows?.length || 0);

        if (response.data.rows && response.data.rows.length > 0) {
            const firstRow = response.data.rows[0];
            console.log('   Primeira linha:', {
                data: firstRow.dimensionValues?.[0]?.value,
                sessões: firstRow.metricValues?.[0]?.value,
                usuários: firstRow.metricValues?.[1]?.value
            });
        }

        console.log('');
        console.log('🎉 GA4 está OPERACIONAL!');

    } catch (error) {
        console.error('❌ ERRO ao conectar com GA4:');
        console.error('');
        console.error('Tipo:', error.message);
        console.error('');

        if (error.message.includes('invalid_grant')) {
            console.error('💡 O refresh token ainda está inválido ou expirou.');
            console.error('   Passos para resolver:');
            console.error('   1. Vá para https://developers.google.com/oauthplayground/');
            console.error('   2. Configure suas credenciais OAuth');
            console.error('   3. Selecione o escopo: https://www.googleapis.com/auth/analytics.readonly');
            console.error('   4. Autorize com: caiomilennials@gmail.com');
            console.error('   5. Gere um novo refresh token');
        } else if (error.message.includes('Request had invalid authentication credentials')) {
            console.error('💡 GA4_PROPERTY_ID pode estar incorreto.');
            console.error('   Valor atual:', GA4_PROPERTY_ID);
            console.error('   Verifique em: https://analytics.google.com/ > Admin > Property Settings');
        } else {
            console.error('Detalhes completos:', error);
        }

        process.exit(1);
    }
}

testGA4();
