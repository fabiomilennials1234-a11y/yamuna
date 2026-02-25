import { NextResponse } from 'next/server';

/**
 * Test Wake API Dashboard endpoints
 * Tests if Wake has specific dashboard metrics endpoints
 */
export async function GET(request: Request) {
    const WAKE_API_URL = process.env.WAKE_API_URL;
    const WAKE_API_TOKEN = process.env.WAKE_API_TOKEN;

    if (!WAKE_API_URL || !WAKE_API_TOKEN) {
        return NextResponse.json({
            error: 'Wake API credentials not configured',
            hasUrl: !!WAKE_API_URL,
            hasToken: !!WAKE_API_TOKEN
        }, { status: 500 });
    }

    const results: any = {
        baseUrl: WAKE_API_URL,
        endpoints: {}
    };

    // List of potential dashboard endpoints to test
    const endpointsToTest = [
        '/Dashboard/IndicadorNovosCompradores',
        '/dashboard/novoscompradores',
        '/pedidos/novoscompradores',
        '/clientes/novoscompradores',
        '/Dashboard',
        '/dashboard',
        '/metricas',
        '/indicadores'
    ];

    for (const endpoint of endpointsToTest) {
        const url = `${WAKE_API_URL}${endpoint}`;

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${WAKE_API_TOKEN}`,
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });

            const status = res.status;
            let body = null;
            let contentType = res.headers.get('content-type') || '';

            if (status === 200) {
                if (contentType.includes('application/json')) {
                    body = await res.json();
                } else {
                    const text = await res.text();
                    body = text.substring(0, 200);
                }
            }

            results.endpoints[endpoint] = {
                status,
                contentType,
                exists: status !== 404,
                success: status === 200,
                bodyPreview: body ? (typeof body === 'string' ? body : JSON.stringify(body).substring(0, 200)) : null
            };

        } catch (error: any) {
            results.endpoints[endpoint] = {
                error: error.message,
                exists: false
            };
        }
    }

    // Summary
    const existingEndpoints = Object.entries(results.endpoints)
        .filter(([_, data]: any) => data.exists)
        .map(([endpoint]) => endpoint);

    const successfulEndpoints = Object.entries(results.endpoints)
        .filter(([_, data]: any) => data.success)
        .map(([endpoint]) => endpoint);

    results.summary = {
        tested: endpointsToTest.length,
        existing: existingEndpoints.length,
        successful: successfulEndpoints.length,
        existingEndpoints,
        successfulEndpoints
    };

    return NextResponse.json(results);
}
