import { NextResponse } from 'next/server';
import { fetchDashboardData } from "@/app/actions";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start') || '30daysAgo';
    const endDate = url.searchParams.get('end') || 'today';

    try {
        console.log(`[API Dashboard] Fetching data from ${startDate} to ${endDate}`);
        const data = await fetchDashboardData(startDate, endDate);

        // Transform the data for the DashboardClient component
        const response = {
            kpis: {
                investment: data.kpis.investment,
                costPercentage: data.kpis.costPercentage,
                avgTicket: data.kpis.ticketAvg,
                avgTicketNewCustomers: data.kpis.ticketAvgNew,
                sales: data.revenue,
                retentionRevenue: data.kpis.retentionRevenue,
                newRevenue: data.kpis.newRevenue,
                acquiredCustomers: data.kpis.acquiredCustomers,
                cac: data.kpis.cac,
                transactions: data.transactions,
                revenue12Months: data.kpis.revenue12m,
                ltv12Months: data.kpis.ltv12m,
                roi12Months: data.kpis.roi12m,
            },
            sessions: data.sessions,
            transactions: data.transactions,
            checkouts: data.checkouts,
            addToCarts: data.addToCarts,
            productsViewed: data.productsViewed,
            revenue: data.revenue,
            source: data.source,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[API Dashboard] Error:', error);
        return NextResponse.json(
            { error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}
