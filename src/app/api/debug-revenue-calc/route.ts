import { NextResponse } from 'next/server';
import { getTinyOrders, getTinyOrdersWithCustomers } from '@/lib/services/tiny';
import { getWakeOrders } from '@/lib/services/wake';
import { mergeOrders, getCustomerId, getCustomerCpf, getCustomerEmail, getCustomerName, normalizeName } from '@/lib/services/customers';
import { format, subDays } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = subDays(endDate, days);
    const historicalStartDate = subDays(startDate, 180);
    const historicalEndDate = subDays(startDate, 1);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    const histStartStr = format(historicalStartDate, 'yyyy-MM-dd');
    const histEndStr = format(historicalEndDate, 'yyyy-MM-dd');

    try {
        // CURRENT PERIOD - Using enriched data
        console.log(`[Debug] Fetching CURRENT enriched: ${startStr} to ${endStr}`);
        const [currentTiny, currentWake] = await Promise.all([
            getTinyOrdersWithCustomers(startStr, endStr),
            getWakeOrders(startStr, endStr)
        ]);

        const currentOrders = mergeOrders(currentTiny, currentWake);
        const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // HISTORICAL - Using fast fetch
        console.log(`[Debug] Fetching HISTORICAL fast: ${histStartStr} to ${histEndStr}`);

        // Chunked fetch for historical
        const chunks = [];
        for (let i = 0; i < 6; i++) {
            const chunkEnd = subDays(startDate, i * 30);
            const chunkStart = subDays(chunkEnd, 29);
            chunks.push({
                start: format(chunkStart, "yyyy-MM-dd"),
                end: format(chunkEnd, "yyyy-MM-dd")
            });
        }

        const historyChunks = await Promise.all(
            chunks.map(chunk => getTinyOrders(chunk.start, chunk.end).catch(() => []))
        );
        const histTiny = historyChunks.flat();
        const histWake = await getWakeOrders(histStartStr, histEndStr).catch(() => []);
        const historicalOrders = mergeOrders(histTiny, histWake);

        // Build historical indexes
        const existingCpfs = new Set<string>();
        const existingEmails = new Set<string>();
        const existingNames = new Set<string>();

        historicalOrders.forEach(order => {
            const cpf = getCustomerCpf(order);
            if (cpf) existingCpfs.add(cpf);

            const email = getCustomerEmail(order);
            if (email) existingEmails.add(email.toLowerCase());

            const name = getCustomerName(order);
            if (name && name !== 'Cliente' && name.length > 3) {
                existingNames.add(normalizeName(name));
            }
        });

        // Analyze matches
        let newRevenue = 0;
        let retentionRevenue = 0;
        let matchByCpf = 0;
        let matchByEmail = 0;
        let matchByName = 0;
        let noMatch = 0;

        const sampleReturning: any[] = [];
        const sampleNew: any[] = [];

        currentOrders.forEach(order => {
            const orderValue = order.total || 0;
            let isReturning = false;
            let matchReason = '';

            const cpf = getCustomerCpf(order);
            if (cpf && existingCpfs.has(cpf)) {
                isReturning = true;
                matchReason = 'CPF';
                matchByCpf++;
            }

            if (!isReturning) {
                const email = getCustomerEmail(order);
                if (email && existingEmails.has(email.toLowerCase())) {
                    isReturning = true;
                    matchReason = 'Email';
                    matchByEmail++;
                }
            }

            if (!isReturning) {
                const name = getCustomerName(order);
                if (name && name !== 'Cliente' && name.length > 3) {
                    if (existingNames.has(normalizeName(name))) {
                        isReturning = true;
                        matchReason = 'Name';
                        matchByName++;
                    }
                }
            }

            if (isReturning) {
                retentionRevenue += orderValue;
                if (sampleReturning.length < 10) {
                    sampleReturning.push({
                        id: order.id,
                        name: getCustomerName(order),
                        cpf: cpf ? cpf.substring(0, 3) + '***' : 'none',
                        email: getCustomerEmail(order) || 'none',
                        total: orderValue,
                        matchReason
                    });
                }
            } else {
                noMatch++;
                newRevenue += orderValue;
                if (sampleNew.length < 10) {
                    sampleNew.push({
                        id: order.id,
                        name: getCustomerName(order),
                        cpf: cpf ? cpf.substring(0, 3) + '***' : 'none',
                        email: getCustomerEmail(order) || 'none',
                        total: orderValue
                    });
                }
            }
        });

        const totalCalculated = newRevenue + retentionRevenue;
        const missingRevenue = currentRevenue - totalCalculated;

        return NextResponse.json({
            summary: {
                period: `${startStr} to ${endStr}`,
                currentOrders: currentOrders.length,
                historicalOrders: historicalOrders.length,
                currentRevenue: currentRevenue.toFixed(2),
                newRevenue: newRevenue.toFixed(2),
                retentionRevenue: retentionRevenue.toFixed(2),
                totalCalculated: totalCalculated.toFixed(2),
                missingRevenue: missingRevenue.toFixed(2),
                missingPercentage: ((missingRevenue / currentRevenue) * 100).toFixed(2) + '%'
            },
            matching: {
                byCpf: matchByCpf,
                byEmail: matchByEmail,
                byName: matchByName,
                noMatch: noMatch,
                total: currentOrders.length
            },
            historicalIndexes: {
                cpfs: existingCpfs.size,
                emails: existingEmails.size,
                names: existingNames.size
            },
            samples: {
                returning: sampleReturning,
                new: sampleNew
            },
            warning: missingRevenue > 100 ? '🚨 CRITICAL: Missing revenue detected! Check if getTinyOrdersWithCustomers is incomplete.' : null
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
