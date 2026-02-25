const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const TOKEN = envVars.TINY_API_TOKEN;

async function fetchTiny(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('JSON Parse Error:', data.substring(0, 100));
                    resolve({});
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    // Test basic list API
    const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${TOKEN}&formato=json&pagina=1`;
    console.log('🔍 Testing pedidos.pesquisa.php...\n');

    const data = await fetchTiny(url);
    const orders = data.retorno?.pedidos || [];

    if (orders.length > 0) {
        const sample = orders[0].pedido;
        console.log('📋 Keys in pedido object:', Object.keys(sample).join(', '));
        console.log('\n🔍 Checking for cliente data...');
        console.log('Has cliente?', 'cliente' in sample);

        if (sample.cliente) {
            console.log('Cliente keys:', Object.keys(sample.cliente).join(', '));
            console.log('Has CPF/CNPJ?', sample.cliente.cpf_cnpj || sample.cliente.cnpj || 'NONE');
        }

        console.log('\n📄 First order raw:');
        console.log(JSON.stringify(sample, null, 2));

        // Now test detailed API
        console.log('\n\n🔍 Testing pedido.obter.php (detailed)...\n');
        const detailUrl = `https://api.tiny.com.br/api2/pedido.obter.php?token=${TOKEN}&id=${sample.id}&formato=json`;
        const detailData = await fetchTiny(detailUrl);

        if (detailData.retorno?.pedido) {
            const detailedOrder = detailData.retorno.pedido;
            console.log('📋 Keys in detailed pedido:', Object.keys(detailedOrder).join(', '));
            console.log('Has cliente?', 'cliente' in detailedOrder);

            if (detailedOrder.cliente) {
                console.log('Cliente keys:', Object.keys(detailedOrder.cliente).join(', '));
                console.log('CPF/CNPJ:', detailedOrder.cliente.cpf_cnpj || detailedOrder.cliente.cnpj || 'NONE');
                console.log('Nome:', detailedOrder.cliente.nome || 'NONE');
            }
        }
    }
}

run().catch(console.error);
