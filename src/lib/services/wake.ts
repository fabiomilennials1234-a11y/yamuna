const WAKE_API_URL = process.env.WAKE_API_URL;
const WAKE_API_TOKEN = process.env.WAKE_API_TOKEN;

export interface WakeOrder {
    id: string;
    date: string;
    total: number;
    status: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    raw?: any;
}

export async function getWakeProducts() {
    if (!WAKE_API_URL || !WAKE_API_TOKEN) {
        return { error: "Missing Wake Credentials" };
    }

    const url = `${WAKE_API_URL}/produtos`;

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Basic ${WAKE_API_TOKEN}`,
                'Accept': 'application/json'
            },
            next: { revalidate: 0 }
        });

        if (!res.ok) {
            const text = await res.text();
            const cleanText = text.includes("<!DOCTYPE") ? `HTML Response: ${text.substring(0, 100)}...` : text;
            return { error: `API Error ${res.status} at ${url}: ${cleanText}` };
        }

        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            const cleanText = text.includes("<!DOCTYPE") ? `HTML Response: ${text.substring(0, 100)}...` : text.substring(0, 200);
            return { error: `Invalid JSON at ${url}: ${cleanText}` };
        }

    } catch (error: any) {
        return { error: `Fetch Failed to ${url}: ${error.message}` };
    }
}

export async function getWakeOrders(startDate: string, endDate: string): Promise<WakeOrder[]> {
    if (!WAKE_API_URL || !WAKE_API_TOKEN) {
        console.error("[Wake API] ❌ ERRO: Credenciais Wake não configuradas!");
        return [];
    }

    console.log(`[Wake API] ✓ Credenciais configuradas`);
    console.log(`[Wake API] 📅 Buscando pedidos de ${startDate} até ${endDate}`);

    const searchStart = Date.now();

    const url = `${WAKE_API_URL}/pedidos?dataInicial=${startDate}&dataFinal=${endDate}`;
    console.log(`[Wake Fetch] URL: ${url}`);

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Basic ${WAKE_API_TOKEN}`,
                'Accept': 'application/json'
            },
            next: { revalidate: 0 },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error(`[Wake API] ❌ Erro HTTP ${res.status}`);
            const errorText = await res.text();
            console.error(`[Wake API] Response: ${errorText.substring(0, 200)}`);
            return [];
        }

        const data = await res.json();
        const orders = Array.isArray(data) ? data : (data.lista || []);

        const searchTime = Date.now() - searchStart;
        console.log(`[Wake API] ⏱️  Busca concluída em ${searchTime}ms`);
        console.log(`[Wake API] 📦 Total de pedidos: ${orders.length}`);

        if (orders.length > 0) {
            // Log sample for debugging
            const sample = orders[0];
            console.log(`[Wake Debug] Sample order fields:`, Object.keys(sample).join(', '));
        }

        // Normalize Wake orders to standard format
        return orders.map((order: any) => normalizeWakeOrder(order));

    } catch (error: any) {
        console.error("[Wake API] ❌ Erro na requisição:", error.message);
        return [];
    }
}

/**
 * Normalize Wake order to standard format
 * Wake (Fbits) has different field names
 */
function normalizeWakeOrder(order: any): WakeOrder {
    // Try various field names - Wake/Fbits structure varies
    const cliente = order.cliente || order.usuario || order.customer || {};

    // Get customer ID from various possible fields
    const customerId =
        cliente.usuarioId?.toString() ||
        cliente.clienteId?.toString() ||
        cliente.id?.toString() ||
        cliente.cpf ||
        cliente.cnpj ||
        cliente.email ||
        order.usuarioId?.toString() ||
        order.clienteId?.toString() ||
        `wake_customer_${order.pedidoId || order.id}`;

    // Get customer name
    const customerName =
        cliente.nome ||
        cliente.nomeCompleto ||
        cliente.razaoSocial ||
        order.nomeCliente ||
        'Cliente Wake';

    // Get customer email
    const customerEmail =
        cliente.email ||
        order.email ||
        '';

    // Get customer phone
    const customerPhone =
        cliente.telefone ||
        cliente.celular ||
        cliente.fone ||
        order.telefone ||
        '';

    // Get order value
    const total =
        parseFloat(order.valorTotal || 0) ||
        parseFloat(order.total || 0) ||
        parseFloat(order.valorPedido || 0) ||
        0;

    // Get order date
    const date =
        order.data ||
        order.dataPedido ||
        order.dataCompra ||
        order.createdAt ||
        '';

    // Format date to dd/MM/yyyy if it's ISO
    let formattedDate = date;
    if (date && date.includes('T')) {
        const d = new Date(date);
        formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    return {
        id: order.pedidoId?.toString() || order.id?.toString() || 'N/A',
        date: formattedDate,
        total,
        status: order.situacao || order.status || order.situacaoPedido || '',
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        raw: order
    };
}
