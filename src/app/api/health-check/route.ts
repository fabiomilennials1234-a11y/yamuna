import { NextResponse } from 'next/server';
import { getGoogleAnalyticsData } from '@/lib/services/google';
import { getTinyOrders } from '@/lib/services/tiny';
import { getWakeOrders } from '@/lib/services/wake';
import { getMetaAdsInsights } from '@/lib/services/meta';
import { format, subDays } from 'date-fns';

/**
 * API Health Check Endpoint
 * Usage: /api/health-check
 * 
 * Verifies all external APIs are working correctly:
 * - Tiny ERP API
 * - Wake API
 * - Google Analytics GA4
 * - Meta Ads API
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    const endDate = new Date();
    const startDate = subDays(endDate, 7); // Last 7 days for testing
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const results: any = {
        timestamp: new Date().toISOString(),
        period: { start: startStr, end: endStr },
        apis: {}
    };

    // Test Tiny ERP API
    try {
        const tinyStart = Date.now();
        const tinyOrders = await getTinyOrders(startStr, endStr);
        const tinyDuration = Date.now() - tinyStart;

        results.apis.tinyErp = {
            status: '✅ OK',
            responseTime: `${tinyDuration}ms`,
            ordersFound: tinyOrders?.length || 0,
            hasToken: !!process.env.TINY_API_TOKEN
        };
    } catch (error: any) {
        results.apis.tinyErp = {
            status: '🚨 ERROR',
            error: error.message,
            hasToken: !!process.env.TINY_API_TOKEN
        };
    }

    // Test Wake API
    try {
        const wakeStart = Date.now();
        const wakeOrders = await getWakeOrders(startStr, endStr);
        const wakeDuration = Date.now() - wakeStart;

        results.apis.wake = {
            status: '✅ OK',
            responseTime: `${wakeDuration}ms`,
            ordersFound: wakeOrders?.length || 0,
            hasApiKey: !!process.env.WAKE_API_KEY
        };
    } catch (error: any) {
        results.apis.wake = {
            status: '🚨 ERROR',
            error: error.message,
            hasApiKey: !!process.env.WAKE_API_KEY
        };
    }

    // Test Google Analytics GA4
    try {
        const ga4Start = Date.now();
        const ga4Data = await getGoogleAnalyticsData(startStr, endStr);
        const ga4Duration = Date.now() - ga4Start;

        results.apis.googleAnalytics = {
            status: '✅ OK',
            responseTime: `${ga4Duration}ms`,
            sessions: ga4Data?.sessions || 0,
            hasCredentials: !!process.env.GA4_PROPERTY_ID
        };
    } catch (error: any) {
        results.apis.googleAnalytics = {
            status: '🚨 ERROR',
            error: error.message,
            hasCredentials: !!process.env.GA4_PROPERTY_ID
        };
    }

    // Test Meta Ads API
    try {
        const metaStart = Date.now();
        const metaData = await getMetaAdsInsights(startStr, endStr);
        const metaDuration = Date.now() - metaStart;

        results.apis.metaAds = {
            status: '✅ OK',
            responseTime: `${metaDuration}ms`,
            spend: metaData?.spend || 0,
            hasToken: !!process.env.META_ADS_ACCESS_TOKEN
        };
    } catch (error: any) {
        results.apis.metaAds = {
            status: '🚨 ERROR',
            error: error.message,
            hasToken: !!process.env.META_ADS_ACCESS_TOKEN
        };
    }

    // Overall status
    const allOk = Object.values(results.apis).every((api: any) => api.status === '✅ OK');
    const someOk = Object.values(results.apis).some((api: any) => api.status === '✅ OK');

    results.overall = {
        status: allOk ? '✅ All APIs OK' : someOk ? '⚠️ Some APIs have issues' : '🚨 All APIs failing',
        healthScore: `${Object.values(results.apis).filter((api: any) => api.status === '✅ OK').length}/${Object.keys(results.apis).length}`,
        recommendation: allOk
            ? 'Dashboard está funcionando perfeitamente!'
            : 'Verifique as credenciais das APIs com erro.'
    };

    // Add environment check
    results.environment = {
        nodeEnv: process.env.NODE_ENV,
        hasUpstashRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
        hasTinyToken: !!process.env.TINY_API_TOKEN,
        hasWakeKey: !!process.env.WAKE_API_KEY,
        hasGA4: !!process.env.GA4_PROPERTY_ID,
        hasMetaToken: !!process.env.META_ADS_ACCESS_TOKEN
    };

    return NextResponse.json(results, {
        status: allOk ? 200 : someOk ? 207 : 500
    });
}
