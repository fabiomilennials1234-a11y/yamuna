
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
console.log('Token Loaded:', TOKEN ? 'YES' : 'NO');

// Helpers
function getDates() {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        dates.push(d);
    }
    return dates;
}

function formatDate(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

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
    const dates = getDates();
    let totalRevenue = 0;
    let totalOrders = 0;

    // Process in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Batch ${i / BATCH_SIZE + 1} ---`);

        const promises = batch.map(async (date) => {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const startStr = formatDate(start);
            const endStr = formatDate(end);

            const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${TOKEN}&formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;
            console.log(`Fetching ${startStr} to ${endStr}...`);

            const data = await fetchTiny(url);
            const orders = data.retorno?.pedidos || [];

            if (orders.length > 0 && i === 0 && batch.indexOf(date) === 0) {
                console.log("FIRST ORDER RAW:", JSON.stringify(orders[0], null, 2));
            }

            const batchRevenue = orders.reduce((sum, o) => {
                // Simulate accurate parsing
                let rawVal = o.pedido.total_pedido || o.pedido.valor_total || '0';
                if (rawVal.includes(',')) {
                    rawVal = rawVal.replace(/\./g, '').replace(',', '.');
                }
                const val = parseFloat(rawVal);

                if (o.pedido.situacao !== 'cancelado') return sum + val;
                return sum;
            }, 0);

            console.log(`  > ${startStr}-${endStr}: ${orders.length} orders, R$ ${batchRevenue.toFixed(2)}`);
            return { count: orders.length, revenue: batchRevenue };
        });

        const results = await Promise.all(promises);
        results.forEach(r => {
            totalRevenue += r.revenue;
            totalOrders += r.count;
        });
    }

    console.log('\n================================');
    console.log(`TOTAL 12M REVENUE: R$ ${totalRevenue.toFixed(2)}`);
    console.log(`TOTAL ORDERS: ${totalOrders}`);
    console.log('================================');
}

run();
