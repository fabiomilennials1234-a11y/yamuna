import { NextResponse } from 'next/server';
import { getTinyOrders } from '@/lib/services/tiny';
import { format, subDays } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '5');

    const endDate = new Date();
    const startDate = subDays(endDate, days);
    // Use 90 days history for debug speed
    const historicalStartDate = subDays(startDate, 90);
    const historicalEndDate = subDays(startDate, 1);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    const histStartStr = format(historicalStartDate, 'yyyy-MM-dd');
    const histEndStr = format(historicalEndDate, 'yyyy-MM-dd');

    console.log(`[Debug] Checking overlap between ${startStr}:${endStr} and ${histStartStr}:${histEndStr}`);

    try {
        const currentOrders = await getTinyOrders(startStr, endStr);
        const historicalOrders = await getTinyOrders(histStartStr, histEndStr);

        // Normalize names for comparison
        const normalize = (s: string) => s ? s.toLowerCase().trim().replace(/\s+/g, ' ') : '';

        const historicalNames = new Set(historicalOrders.map(o => normalize(o.customerName)));
        const historicalNamesRaw = historicalOrders.slice(0, 5).map(o => o.customerName);

        let matchCount = 0;
        let newCount = 0;

        const sampleMatches: any[] = [];
        const sampleMisses: any[] = [];

        currentOrders.forEach(o => {
            const name = normalize(o.customerName);
            if (historicalNames.has(name) && name.length > 3) {
                matchCount++;
                if (sampleMatches.length < 5) sampleMatches.push(o.customerName);
            } else {
                newCount++;
                if (sampleMisses.length < 5) sampleMisses.push(o.customerName);
            }
        });

        return NextResponse.json({
            counts: {
                current: currentOrders.length,
                historical: historicalOrders.length
            },
            dates: {
                current: { start: startStr, end: endStr },
                historical: { start: histStartStr, end: histEndStr }
            },
            results: {
                matches: matchCount,
                new: newCount,
                percentNew: ((newCount / currentOrders.length) * 100).toFixed(2) + '%'
            },
            samples: {
                matches: sampleMatches,
                misses: sampleMisses,
                historicalRawSample: historicalNamesRaw
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
