import { NextResponse } from 'next/server';
import { getTinyOrders } from '@/lib/services/tiny';
import { getWakeOrders } from '@/lib/services/wake';
import { mergeOrders, getCustomerId } from '@/lib/services/customers';
import { format, subDays } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || '30daysAgo';
    const endDate = searchParams.get('end') || 'today';

    // Calculate dates
    let currentStart: Date;
    let currentEnd: Date;

    if (startDate === "30daysAgo") {
        currentEnd = new Date();
        currentStart = subDays(currentEnd, 30);
    } else {
        currentStart = new Date(startDate);
        currentEnd = endDate === "today" ? new Date() : new Date(endDate);
    }

    const startStr = format(currentStart, "yyyy-MM-dd");
    const endStr = format(currentEnd, "yyyy-MM-dd");

    // Fetch current period orders
    const [tinyOrders, wakeOrders] = await Promise.all([
        getTinyOrders(startStr, endStr),
        getWakeOrders(startStr, endStr)
    ]);

    const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);

    // Analyze customer identification
    const analysis = {
        totalOrders: allOrders.length,
        tinyOrders: tinyOrders.length,
        wakeOrders: wakeOrders?.length || 0,
        identificationMethods: {
            cpfCnpj: 0,
            email: 0,
            name: 0,
            unknown: 0
        },
        samples: {
            withCpfCnpj: [] as any[],
            withEmail: [] as any[],
            withNameOnly: [] as any[],
            withUnknown: [] as any[]
        },
        rawSampleOrders: [] as any[]
    };

    // Take first 10 Tiny orders as raw samples
    analysis.rawSampleOrders = (tinyOrders || []).slice(0, 10).map((o: any) => ({
        id: o.id,
        date: o.date,
        total: o.total,
        customerCpfCnpj: o.customerCpfCnpj,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        raw_keys: Object.keys(o.raw || o || {})
    }));

    // Analyze each order
    allOrders.forEach((order: any) => {
        const customerId = getCustomerId(order);

        if (customerId.startsWith('cpf_')) {
            analysis.identificationMethods.cpfCnpj++;
            if (analysis.samples.withCpfCnpj.length < 5) {
                analysis.samples.withCpfCnpj.push({
                    id: order.id,
                    customerId: customerId,
                    cpfCnpj: order.customerCpfCnpj,
                    name: order.customerName,
                    total: order.total
                });
            }
        } else if (customerId.includes('@')) {
            analysis.identificationMethods.email++;
            if (analysis.samples.withEmail.length < 5) {
                analysis.samples.withEmail.push({
                    id: order.id,
                    customerId: customerId,
                    email: order.customerEmail,
                    name: order.customerName,
                    total: order.total
                });
            }
        } else if (customerId.startsWith('name_')) {
            analysis.identificationMethods.name++;
            if (analysis.samples.withNameOnly.length < 5) {
                analysis.samples.withNameOnly.push({
                    id: order.id,
                    customerId: customerId,
                    name: order.customerName,
                    total: order.total
                });
            }
        } else if (customerId.startsWith('unknown_')) {
            analysis.identificationMethods.unknown++;
            if (analysis.samples.withUnknown.length < 5) {
                analysis.samples.withUnknown.push({
                    id: order.id,
                    customerId: customerId,
                    total: order.total
                });
            }
        }
    });

    // Calculate percentages
    const percentages = {
        cpfCnpj: ((analysis.identificationMethods.cpfCnpj / analysis.totalOrders) * 100).toFixed(1),
        email: ((analysis.identificationMethods.email / analysis.totalOrders) * 100).toFixed(1),
        name: ((analysis.identificationMethods.name / analysis.totalOrders) * 100).toFixed(1),
        unknown: ((analysis.identificationMethods.unknown / analysis.totalOrders) * 100).toFixed(1)
    };

    const recommendation = analysis.identificationMethods.cpfCnpj < (analysis.totalOrders * 0.5)
        ? "⚠️ CPF/CNPJ não está sendo capturado! Menos de 50% dos pedidos têm CPF/CNPJ."
        : "✅ CPF/CNPJ está sendo capturado corretamente.";

    // Check if HTML output is requested
    const outputFormat = searchParams.get('format');

    if (outputFormat === 'html') {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Debug - Customer Identification</title>
                <style>
                    body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
                    h1 { color: #10b981; }
                    h2 { color: #60a5fa; margin-top: 30px; }
                    .stat { background: #2a2a2a; padding: 10px; margin: 10px 0; border-left: 4px solid #10b981; }
                    .warning { border-left-color: #f59e0b; }
                    .error { border-left-color: #ef4444; }
                    .good { color: #10b981; }
                    .bad { color: #ef4444; }
                    .medium { color: #f59e0b; }
                    pre { background: #2a2a2a; padding: 15px; overflow-x: auto; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #444; }
                    th { background: #2a2a2a; color: #60a5fa; }
                </style>
            </head>
            <body>
                <h1>🔍 Customer Identification Debug</h1>
                <p><strong>Período:</strong> ${startStr} até ${endStr}</p>
                
                <h2>📊 Resumo</h2>
                <div class="stat">
                    <strong>Total de Pedidos:</strong> ${analysis.totalOrders} 
                    (Tiny: ${analysis.tinyOrders}, Wake: ${analysis.wakeOrders})
                </div>
                
                <h2>🎯 Métodos de Identificação</h2>
                <table>
                    <tr>
                        <th>Método</th>
                        <th>Quantidade</th>
                        <th>Percentual</th>
                        <th>Status</th>
                    </tr>
                    <tr>
                        <td>CPF/CNPJ</td>
                        <td>${analysis.identificationMethods.cpfCnpj}</td>
                        <td class="${parseFloat(percentages.cpfCnpj) > 60 ? 'good' : parseFloat(percentages.cpfCnpj) > 30 ? 'medium' : 'bad'}">${percentages.cpfCnpj}%</td>
                        <td>${parseFloat(percentages.cpfCnpj) > 60 ? '✅ Ótimo' : parseFloat(percentages.cpfCnpj) > 30 ? '⚠️ Regular' : '❌ Ruim'}</td>
                    </tr>
                    <tr>
                        <td>Email</td>
                        <td>${analysis.identificationMethods.email}</td>
                        <td>${percentages.email}%</td>
                        <td>${parseFloat(percentages.email) > 10 ? '✅' : '⚠️'}</td>
                    </tr>
                    <tr>
                        <td>Nome (Fallback)</td>
                        <td>${analysis.identificationMethods.name}</td>
                        <td class="${parseFloat(percentages.name) > 50 ? 'bad' : parseFloat(percentages.name) > 20 ? 'medium' : 'good'}">${percentages.name}%</td>
                        <td>${parseFloat(percentages.name) < 20 ? '✅' : parseFloat(percentages.name) < 50 ? '⚠️' : '❌ Muitos!'}</td>
                    </tr>
                    <tr>
                        <td>Unknown</td>
                        <td>${analysis.identificationMethods.unknown}</td>
                        <td class="${parseFloat(percentages.unknown) > 5 ? 'bad' : 'good'}">${percentages.unknown}%</td>
                        <td>${parseFloat(percentages.unknown) < 5 ? '✅' : '❌'}</td>
                    </tr>
                </table>
                
                <div class="stat ${parseFloat(percentages.cpfCnpj) > 50 ? '' : 'warning'}">
                    <strong>${recommendation}</strong>
                </div>
                
                <h2>📋 Exemplos de Pedidos com CPF/CNPJ</h2>
                <pre>${JSON.stringify(analysis.samples.withCpfCnpj, null, 2)}</pre>
                
                <h2>📧 Exemplos de Pedidos com Email</h2>
                <pre>${JSON.stringify(analysis.samples.withEmail, null, 2)}</pre>
                
                <h2>👤 Exemplos de Pedidos com Nome Apenas (PROBLEMÁTICO)</h2>
                <pre>${JSON.stringify(analysis.samples.withNameOnly, null, 2)}</pre>
                
                <h2>🔬 Primeiros 5 Pedidos do Tiny (Raw Data)</h2>
                <pre>${JSON.stringify(analysis.rawSampleOrders.slice(0, 5), null, 2)}</pre>
            </body>
            </html>
        `;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    return NextResponse.json({
        period: { start: startStr, end: endStr },
        analysis,
        percentages,
        recommendation
    });
}

