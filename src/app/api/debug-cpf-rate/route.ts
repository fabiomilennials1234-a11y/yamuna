import { NextResponse } from 'next/server';
import { getTinyOrdersWithCustomers } from '@/lib/services/tiny';
import { getWakeOrders } from '@/lib/services/wake';
import { mergeOrders, getCustomerId } from '@/lib/services/customers';
import { format, subDays } from 'date-fns';

/**
 * Debug endpoint to check CPF/CNPJ extraction rate
 * Usage: /api/debug-cpf-rate?days=30
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    console.log(`[CPF Rate Check] Fetching orders from ${startStr} to ${endStr}`);

    try {
        // Fetch orders with FULL customer data (CPF/CNPJ)
        const [tinyOrders, wakeOrders] = await Promise.all([
            getTinyOrdersWithCustomers(startStr, endStr),
            getWakeOrders(startStr, endStr)
        ]);

        const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);

        if (allOrders.length === 0) {
            return NextResponse.json({
                error: 'Nenhum pedido encontrado no período',
                period: { start: startStr, end: endStr }
            });
        }

        // Analyze customer identification methods
        let cpfCnpjCount = 0;
        let emailCount = 0;
        let nameCount = 0;
        let unknownCount = 0;

        const cpfCnpjSamples: any[] = [];
        const emailSamples: any[] = [];
        const nameSamples: any[] = [];
        const unknownSamples: any[] = [];

        allOrders.forEach(order => {
            const customerId = getCustomerId(order);

            const sample = {
                orderId: order.id,
                customerId: customerId.substring(0, 30) + '...',
                customerName: order.customerName || order.nome || 'N/A',
                total: order.total
            };

            if (customerId.startsWith('cpf_')) {
                cpfCnpjCount++;
                if (cpfCnpjSamples.length < 5) cpfCnpjSamples.push(sample);
            } else if (customerId.includes('@')) {
                emailCount++;
                if (emailSamples.length < 5) emailSamples.push(sample);
            } else if (customerId.startsWith('name_')) {
                nameCount++;
                if (nameSamples.length < 5) nameSamples.push(sample);
            } else {
                unknownCount++;
                if (unknownSamples.length < 5) unknownSamples.push(sample);
            }
        });

        const totalOrders = allOrders.length;
        const cpfCnpjRate = (cpfCnpjCount / totalOrders) * 100;
        const emailRate = (emailCount / totalOrders) * 100;
        const nameRate = (nameCount / totalOrders) * 100;
        const unknownRate = (unknownCount / totalOrders) * 100;

        const status = cpfCnpjRate >= 80
            ? '✅ EXCELENTE'
            : cpfCnpjRate >= 50
                ? '⚠️ ACEITÁVEL'
                : '🚨 BAIXO - PRECISA MELHORAR';

        return NextResponse.json({
            status,
            summary: {
                totalOrders,
                period: { start: startStr, end: endStr },
                identificationRates: {
                    cpfCnpj: {
                        count: cpfCnpjCount,
                        percentage: parseFloat(cpfCnpjRate.toFixed(2)),
                        status: cpfCnpjRate >= 80 ? '✅ OK' : cpfCnpjRate >= 50 ? '⚠️ Médio' : '🚨 Baixo'
                    },
                    email: {
                        count: emailCount,
                        percentage: parseFloat(emailRate.toFixed(2))
                    },
                    name: {
                        count: nameCount,
                        percentage: parseFloat(nameRate.toFixed(2))
                    },
                    unknown: {
                        count: unknownCount,
                        percentage: parseFloat(unknownRate.toFixed(2))
                    }
                }
            },
            recommendation: cpfCnpjRate >= 80
                ? 'Taxa de CPF/CNPJ está ótima! A Receita Nova será precisa.'
                : cpfCnpjRate >= 50
                    ? 'Taxa de CPF/CNPJ aceitável, mas pode melhorar. Considere enriquecer dados.'
                    : 'Taxa de CPF/CNPJ BAIXA! Recomenda-se usar getTinyOrdersWithCustomers() para buscar detalhes completos.',
            samples: {
                cpfCnpj: cpfCnpjSamples,
                email: emailSamples,
                name: nameSamples,
                unknown: unknownSamples
            }
        });

    } catch (error: any) {
        console.error('[CPF Rate Check] Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
