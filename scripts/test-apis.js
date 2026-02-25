/**
 * Test all API integrations
 * Run with: node scripts/test-apis.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
}

// Colors for console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, emoji, message) {
    console.log(`${color}${emoji} ${message}${colors.reset}`);
}

// Test date range
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const startStr = startDate.toISOString().split('T')[0];
const endStr = endDate.toISOString().split('T')[0];

console.log('\n' + '='.repeat(60));
log(colors.blue, '🧪', 'TESTE DE INTEGRAÇÃO DAS APIs');
console.log('='.repeat(60));
console.log(`Período: ${startStr} até ${endStr}\n`);

// ============================================
// 1. TEST GOOGLE ANALYTICS 4 (GA4)
// ============================================
async function testGA4() {
    log(colors.cyan, '📊', 'Testando Google Analytics 4 (GA4)...');

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;

    console.log('   Credenciais:');
    console.log(`   - CLIENT_ID: ${CLIENT_ID ? '✅ Presente' : '❌ FALTANDO'}`);
    console.log(`   - CLIENT_SECRET: ${CLIENT_SECRET ? '✅ Presente' : '❌ FALTANDO'}`);
    console.log(`   - REFRESH_TOKEN: ${REFRESH_TOKEN ? '✅ Presente' : '❌ FALTANDO'}`);
    console.log(`   - GA4_PROPERTY_ID: ${GA4_PROPERTY_ID ? `✅ ${GA4_PROPERTY_ID}` : '❌ FALTANDO'}`);

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !GA4_PROPERTY_ID) {
        log(colors.red, '❌', 'Credenciais GA4 faltando!');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        auth.setCredentials({ refresh_token: REFRESH_TOKEN });

        const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

        // Test basic query
        const response = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: startStr, endDate: endStr }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' },
                    { name: 'addToCarts' },
                    { name: 'checkouts' },
                    { name: 'transactions' },
                    { name: 'totalRevenue' }
                ],
            },
        });

        const rows = response.data.rows || [];

        if (rows.length === 0) {
            log(colors.yellow, '⚠️', 'GA4 respondeu, mas SEM DADOS para o período!');
            log(colors.yellow, '💡', 'Verifique se há dados no GA4 para o período especificado.');
            return { success: true, noData: true };
        }

        // Calculate totals
        let totals = {
            sessions: 0,
            users: 0,
            addToCarts: 0,
            checkouts: 0,
            transactions: 0,
            revenue: 0
        };

        rows.forEach(row => {
            totals.sessions += parseInt(row.metricValues[0].value || 0);
            totals.users += parseInt(row.metricValues[1].value || 0);
            totals.addToCarts += parseInt(row.metricValues[2].value || 0);
            totals.checkouts += parseInt(row.metricValues[3].value || 0);
            totals.transactions += parseInt(row.metricValues[4].value || 0);
            totals.revenue += parseFloat(row.metricValues[5].value || 0);
        });

        log(colors.green, '✅', 'GA4 funcionando!');
        console.log(`   📊 Dados encontrados (${rows.length} dias):`);
        console.log(`      - Sessões: ${totals.sessions.toLocaleString('pt-BR')}`);
        console.log(`      - Usuários: ${totals.users.toLocaleString('pt-BR')}`);
        console.log(`      - Add to Cart: ${totals.addToCarts.toLocaleString('pt-BR')}`);
        console.log(`      - Checkouts: ${totals.checkouts.toLocaleString('pt-BR')}`);
        console.log(`      - Transações: ${totals.transactions.toLocaleString('pt-BR')}`);
        console.log(`      - Receita: R$ ${totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        return { success: true, data: totals };
    } catch (error) {
        log(colors.red, '❌', `Erro no GA4: ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Detalhes: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// 2. TEST TINY ERP
// ============================================
async function testTiny() {
    log(colors.cyan, '📦', 'Testando Tiny ERP...');

    const TINY_TOKEN = process.env.TINY_API_TOKEN;

    console.log('   Credenciais:');
    console.log(`   - TINY_API_TOKEN: ${TINY_TOKEN ? '✅ Presente' : '❌ FALTANDO'}`);

    if (!TINY_TOKEN) {
        log(colors.red, '❌', 'Token do Tiny faltando!');
        return { success: false, error: 'Missing token' };
    }

    try {
        // Convert dates to Tiny format (dd/MM/yyyy)
        const [y1, m1, d1] = startStr.split('-');
        const [y2, m2, d2] = endStr.split('-');
        const tinyStartDate = `${d1}/${m1}/${y1}`;
        const tinyEndDate = `${d2}/${m2}/${y2}`;

        const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${TINY_TOKEN}&formato=json&pagina=1&dataInicial=${encodeURIComponent(tinyStartDate)}&dataFinal=${encodeURIComponent(tinyEndDate)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.retorno.status === 'Erro') {
            log(colors.red, '❌', `Erro na API Tiny: ${data.retorno.codigo_erro}`);
            return { success: false, error: data.retorno.codigo_erro };
        }

        const orders = data.retorno.pedidos || [];

        let totalRevenue = 0;
        let validOrders = 0;

        orders.forEach(o => {
            const pedido = o.pedido;
            if (pedido.situacao && pedido.situacao.toLowerCase() !== 'cancelado') {
                validOrders++;
                const value = parseFloat(String(pedido.valor_total || pedido.valor || 0).replace(/\./g, '').replace(',', '.'));
                totalRevenue += value;
            }
        });

        log(colors.green, '✅', 'Tiny ERP funcionando!');
        console.log(`   📦 Dados encontrados (Página 1):`);
        console.log(`      - Pedidos: ${validOrders}`);
        console.log(`      - Receita: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        return { success: true, data: { orders: validOrders, revenue: totalRevenue } };
    } catch (error) {
        log(colors.red, '❌', `Erro no Tiny: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ============================================
// 3. TEST META ADS
// ============================================
async function testMetaAds() {
    log(colors.cyan, '📱', 'Testando Meta Ads (Facebook/Instagram)...');

    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

    console.log('   Credenciais:');
    console.log(`   - META_ACCESS_TOKEN: ${ACCESS_TOKEN ? '✅ Presente' : '❌ FALTANDO'}`);
    console.log(`   - META_AD_ACCOUNT_ID: ${AD_ACCOUNT_ID ? `✅ ${AD_ACCOUNT_ID}` : '❌ FALTANDO'}`);

    if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
        log(colors.yellow, '⚠️', 'Credenciais do Meta Ads faltando (opcional)');
        return { success: false, error: 'Missing credentials', optional: true };
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${AD_ACCOUNT_ID}/insights?access_token=${ACCESS_TOKEN}&time_range={"since":"${startStr}","until":"${endStr}"}&fields=spend,impressions,clicks,actions&level=account`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            log(colors.red, '❌', `Erro no Meta Ads: ${data.error.message}`);
            return { success: false, error: data.error.message };
        }

        const insights = data.data?.[0] || {};
        const spend = parseFloat(insights.spend || 0);

        log(colors.green, '✅', 'Meta Ads funcionando!');
        console.log(`   📱 Dados encontrados:`);
        console.log(`      - Investimento: R$ ${spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`      - Impressões: ${(insights.impressions || 0).toLocaleString('pt-BR')}`);
        console.log(`      - Cliques: ${(insights.clicks || 0).toLocaleString('pt-BR')}`);

        return { success: true, data: { spend } };
    } catch (error) {
        log(colors.red, '❌', `Erro no Meta Ads: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ============================================
// 4. TEST WAKE (E-COMMERCE PLATFORM)
// ============================================
async function testWake() {
    log(colors.cyan, '🛍️', 'Testando Wake Commerce...');

    const WAKE_API_KEY = process.env.WAKE_API_KEY;
    const WAKE_API_URL = process.env.WAKE_API_URL;

    console.log('   Credenciais:');
    console.log(`   - WAKE_API_KEY: ${WAKE_API_KEY ? '✅ Presente' : '❌ FALTANDO'}`);
    console.log(`   - WAKE_API_URL: ${WAKE_API_URL ? `✅ ${WAKE_API_URL}` : '❌ FALTANDO'}`);

    if (!WAKE_API_KEY || !WAKE_API_URL) {
        log(colors.yellow, '⚠️', 'Credenciais do Wake faltando (opcional)');
        return { success: false, error: 'Missing credentials', optional: true };
    }

    try {
        const url = `${WAKE_API_URL}/orders?offset=0&limit=10`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${WAKE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const orders = data || [];

        log(colors.green, '✅', 'Wake Commerce funcionando!');
        console.log(`   🛍️ Pedidos encontrados (amostra): ${orders.length}`);

        return { success: true, data: { orders: orders.length } };
    } catch (error) {
        log(colors.red, '❌', `Erro no Wake: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
    console.log('\n');

    const results = {
        ga4: await testGA4(),
        tiny: await testTiny(),
        meta: await testMetaAds(),
        wake: await testWake()
    };

    console.log('\n' + '='.repeat(60));
    log(colors.blue, '📝', 'RESUMO DOS TESTES');
    console.log('='.repeat(60) + '\n');

    let allCriticalSuccess = true;

    // GA4
    if (results.ga4.success && !results.ga4.noData) {
        log(colors.green, '✅', 'GA4: FUNCIONANDO');
    } else if (results.ga4.noData) {
        log(colors.yellow, '⚠️', 'GA4: SEM DADOS (mas API responde)');
        allCriticalSuccess = false;
    } else {
        log(colors.red, '❌', 'GA4: FALHOU');
        allCriticalSuccess = false;
    }

    // Tiny
    if (results.tiny.success) {
        log(colors.green, '✅', 'Tiny ERP: FUNCIONANDO');
    } else {
        log(colors.red, '❌', 'Tiny ERP: FALHOU');
        allCriticalSuccess = false;
    }

    // Meta (opcional)
    if (results.meta.success) {
        log(colors.green, '✅', 'Meta Ads: FUNCIONANDO');
    } else if (results.meta.optional) {
        log(colors.yellow, '⚠️', 'Meta Ads: NÃO CONFIGURADO (opcional)');
    } else {
        log(colors.red, '❌', 'Meta Ads: FALHOU');
    }

    // Wake (opcional)
    if (results.wake.success) {
        log(colors.green, '✅', 'Wake Commerce: FUNCIONANDO');
    } else if (results.wake.optional) {
        log(colors.yellow, '⚠️', 'Wake Commerce: NÃO CONFIGURADO (opcional)');
    } else {
        log(colors.red, '❌', 'Wake Commerce: FALHOU');
    }

    console.log('\n' + '='.repeat(60));

    if (allCriticalSuccess) {
        log(colors.green, '🎉', 'TODAS AS APIs CRÍTICAS ESTÃO FUNCIONANDO!');
    } else {
        log(colors.red, '⚠️', 'ALGUMAS APIs CRÍTICAS APRESENTAM PROBLEMAS');
        console.log('\n💡 Próximos passos:');

        if (!results.ga4.success || results.ga4.noData) {
            console.log('   1. Verifique as credenciais do GA4 no .env.local');
            console.log('   2. Certifique-se de que há dados no GA4 para o período testado');
            console.log('   3. Verifique se o Property ID está correto');
        }

        if (!results.tiny.success) {
            console.log('   1. Verifique o TINY_API_TOKEN no .env.local');
            console.log('   2. Teste o token diretamente na API do Tiny');
        }
    }

    console.log('='.repeat(60) + '\n');
}

// Run tests
runAllTests().catch(console.error);
