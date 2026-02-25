
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
    // Just Last Month
    const end = new Date();
    const start = new Date();
    start.setDate(1); // 1st of this month

    // Actually let's go back 1 month to be sure we have completed orders
    start.setMonth(start.getMonth() - 1);
    end.setDate(0); // Last day of previous month

    const startStr = formatDate(start);
    const endStr = formatDate(end);

    const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${TOKEN}&formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;
    console.log(`Fetching SINGLE BATCH ${startStr} to ${endStr}...`);

    const data = await fetchTiny(url);
    const orders = data.retorno?.pedidos || [];

    console.log(`Received ${orders.length} orders.`);

    if (orders.length > 0) {
        console.log("SAMPLE ORDER KEYS:", Object.keys(orders[0].pedido));
        console.log("SAMPLE ORDER FULL:", JSON.stringify(orders[0], null, 2));

        // Test Price Parsing
        orders.slice(0, 5).forEach(o => {
            const raw = o.pedido.total_pedido || o.pedido.valor_total || o.pedido.valor || "MISSING";
            console.log(`Order ${o.pedido.id || o.pedido.numero}: Raw Value = ${raw}`);
        });
    } else {
        console.log("NO ORDERS FOUND? Check raw response:", JSON.stringify(data).substring(0, 200));
    }
}

run();
