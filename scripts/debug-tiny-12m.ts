
import fs from 'fs';
import path from 'path';

// Manually parse .env.local because dotenv might not be installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return;

        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // remove quotes
                process.env[key] = value;
            }
        });
    } catch (e) {
        console.error("Error loading .env.local", e);
    }
}

loadEnv();

async function debugTinyOrders() {
    const token = process.env.TINY_API_TOKEN;
    if (!token) {
        console.error("❌ TINY_API_TOKEN not found in .env.local");
        process.exit(1);
    }

    console.log("✅ Token found:", token.substring(0, 5) + "...");

    const today = new Date();
    // Calculate date 365 days ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - 365);

    // Format as dd/mm/yyyy for Tiny API
    const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    const startStr = formatDate(startDate);
    const endStr = formatDate(today);

    console.log(`\n📅 Fetching orders from ${startStr} to ${endStr}...`);

    const url = `https://api.tiny.com.br/api2/pedidos.pesquisa.php`;
    const params = new URLSearchParams({
        token,
        formato: 'json',
        dataInicial: startStr,
        dataFinal: endStr,
    });

    try {
        console.log(`🔍 Requesting: ${url}?${params.toString().replace(token, 'REDACTED')}`);
        const response = await fetch(`${url}?${params.toString()}`);

        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
            return;
        }

        const data = await response.json();

        if (data.retorno.status === 'Erro') {
            console.error(`❌ API Error:`, data.retorno.erros);
            return;
        }

        const orders = data.retorno.pedidos || [];
        console.log(`\n📦 Orders found in FIRST PAGE: ${orders.length}`);

        if (orders.length > 0) {
            console.log("First order date:", orders[0].pedido.data_pedido);
            console.log("Last order date:", orders[orders.length - 1].pedido.data_pedido);
        }

        // Check if there are more pages
        const numero_paginas = data.retorno.numero_paginas;
        console.log(`📄 Total pages available: ${numero_paginas}`);

    } catch (error) {
        console.error("❌ Unexpected error:", error);
    }
}

debugTinyOrders();
