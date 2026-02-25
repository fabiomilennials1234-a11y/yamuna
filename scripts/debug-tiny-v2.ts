
import fs from 'fs';
import path from 'path';
import https from 'https';

// Manual fetch implementation to avoid dependency on global fetch if node is old (though v22 should have it)
// But let's use global fetch as Node v22 definitely has it.

async function run() {
    console.log("🚀 Starting Debug Script V2");
    console.log(`📂 CWD: ${process.cwd()}`);

    const envPath = path.resolve(process.cwd(), '.env.local');
    console.log(`📄 Expecting .env.local at: ${envPath}`);

    if (!fs.existsSync(envPath)) {
        console.error("❌ .env.local FILE NOT FOUND!");
        return;
    }

    console.log("✅ .env.local found.");

    // Read and parse env
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    envContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });

    const token = env['TINY_API_TOKEN'];
    if (!token) {
        console.error("❌ TINY_API_TOKEN not found in .env.local keys:", Object.keys(env));
        return;
    }

    console.log(`✅ Token found (length: ${token.length})`);

    // --- FETCH DATA ---

    // 12 Months ago
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 365);

    const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    const startStr = formatDate(startDate);
    const endStr = formatDate(today);

    console.log(`\n📅 Testing 12-Month Range: ${startStr} to ${endStr}`);

    const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${token}&formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;

    try {
        console.log("⏳ Sending request to Tiny...");
        const res = await fetch(url);
        const data = await res.json();

        console.log("📡 Response Status:", res.status);

        if (data.retorno.status === 'Erro') {
            console.error("❌ API Error:", JSON.stringify(data.retorno.erros, null, 2));
        } else {
            const pedidos = data.retorno.pedidos || [];
            console.log(`✅ SUCCESS! Found ${pedidos.length} orders in the first page.`);
            if (pedidos.length > 0) {
                console.log(`   First order date: ${pedidos[0].pedido.data_pedido}`);
                console.log(`   Last order date: ${pedidos[pedidos.length - 1].pedido.data_pedido}`);
            } else {
                console.warn("⚠️  No orders found in this range.");
            }
        }
    } catch (err) {
        console.error("❌ Fetch Error:", err);
    }
}

run();
