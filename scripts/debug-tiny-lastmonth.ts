
import fs from 'fs';
import path from 'path';
import https from 'https';

async function run() {
    console.log("🚀 Debugging Last Month (Nov 2025)");

    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) { console.error("❌ No .env.local"); return; }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    envContent.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    });

    const token = env['TINY_API_TOKEN'];
    if (!token) { console.error("❌ No Token"); return; }

    const startStr = "01/11/2025";
    const endStr = "30/11/2025";

    console.log(`\n📅 Testing Range: ${startStr} to ${endStr}`);

    const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php?token=${token}&formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.retorno.status === 'Erro') {
            console.error("❌ API Error:", JSON.stringify(data.retorno.erros, null, 2));
        } else {
            const pedidos = data.retorno.pedidos || [];
            console.log(`✅ SUCCESS! Found ${pedidos.length} orders.`);
            if (pedidos.length > 0) {
                // Print first 3 dates
                pedidos.slice(0, 3).forEach((p: any) => console.log(`   - Order ${p.pedido.id}: ${p.pedido.data_pedido}`));
            } else {
                console.warn("⚠️  Empty list returned.");
            }
        }
    } catch (err) {
        console.error("❌ Fetch Error:", err);
    }
}

run();
