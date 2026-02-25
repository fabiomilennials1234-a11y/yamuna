import { NextResponse } from 'next/server';
import { getWakeOrders } from "@/lib/services/wake";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to inspect raw Wake API response
 * Access: http://localhost:3000/api/test-wake
 */
export async function GET() {
    try {
        // Get last month's orders
        const lastMonthDate = subMonths(new Date(), 1);
        const startDate = format(startOfMonth(lastMonthDate), "yyyy-MM-dd");
        const endDate = format(endOfMonth(lastMonthDate), "yyyy-MM-dd");

        console.log(`[Test Wake] Fetching orders from ${startDate} to ${endDate}`);

        const orders = await getWakeOrders(startDate, endDate);

        console.log(`[Test Wake] Received ${orders.length} orders`);

        // Get detailed info about first order
        const firstOrder = orders[0];

        return NextResponse.json({
            summary: {
                totalOrders: orders.length,
                period: { startDate, endDate },
                totalRevenue: orders.reduce((acc, o) => acc + (o.total || 0), 0),
                ordersWithZeroTotal: orders.filter(o => !o.total || o.total === 0).length
            },
            firstOrderNormalized: firstOrder,
            firstOrderRaw: firstOrder?.raw,
            firstOrderRawKeys: firstOrder?.raw ? Object.keys(firstOrder.raw) : [],
            // Show all fields from raw order
            firstOrderFieldAnalysis: firstOrder?.raw ? {
                valorTotal: firstOrder.raw.valorTotal,
                total: firstOrder.raw.total,
                valorPedido: firstOrder.raw.valorPedido,
                valor: firstOrder.raw.valor,
                valorBruto: firstOrder.raw.valorBruto,
                valorLiquido: firstOrder.raw.valorLiquido,
                valorFinal: firstOrder.raw.valorFinal,
                totalPedido: firstOrder.raw.totalPedido,
                // Check all possible value fields
                allNumericFields: Object.entries(firstOrder.raw)
                    .filter(([key, value]) => typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))
                    .map(([key, value]) => ({ key, value }))
            } : null,
            sampleOrders: orders.slice(0, 3).map(o => ({
                id: o.id,
                total: o.total,
                date: o.date,
                rawValueFields: o.raw ? {
                    valorTotal: o.raw.valorTotal,
                    total: o.raw.total,
                    valorPedido: o.raw.valorPedido,
                    valor: o.raw.valor
                } : null
            }))
        });
    } catch (error: any) {
        console.error('[Test Wake] Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
