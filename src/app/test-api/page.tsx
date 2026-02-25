import { getGoogleAnalyticsData } from "@/lib/services/google";
import { getMetaAdsInsights, getMetaTopCreatives } from "@/lib/services/meta";
import { getTinyOrders } from "@/lib/services/tiny";
import { getWakeProducts, getWakeOrders } from "@/lib/services/wake";
import { createClient } from "@/lib/supabase/server";

export default async function TestApiPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();

    // Date Range: Last 90 days to ensure we catch data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch Data
    // Fetch Data
    const ga4Data: any = await getGoogleAnalyticsData('30daysAgo', 'today');
    const metaData: any = await getMetaAdsInsights(startDate, endDate);
    const metaCreatives: any = await getMetaTopCreatives(startDate, endDate); // Debug Creatives
    const tinyData: any = await getTinyOrders(startDate, endDate);
    const wakeData: any = await getWakeProducts();
    const wakeOrders: any = await getWakeOrders(startDate, endDate);

    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-white font-mono space-y-8">
            <h1 className="text-3xl font-bold text-indigo-500">API Connection Diagnostics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supabase */}
                <Card title="Supabase Auth" status={user ? "Connected" : "Not Logged In"}>
                    <pre>{JSON.stringify(user?.email || "No User", null, 2)}</pre>
                </Card>

                {/* GA4 */}
                <Card title="Google Analytics 4" status={ga4Data && !ga4Data.error ? "Success" : "Failed"}>
                    <div className="text-xs text-gray-400 mb-2">Query: Last 30 Days</div>
                    {ga4Data?.error ? (
                        <div className="text-red-400 text-sm font-bold whitespace-pre-wrap">{ga4Data.error}</div>
                    ) : (
                        <pre>{JSON.stringify(ga4Data, null, 2)}</pre>
                    )}
                </Card>

                {/* Meta Ads */}
                <Card title="Meta Ads" status={metaData && !metaData.error ? "Success" : "Failed"}>
                    <div className="text-xs text-gray-400 mb-2">Query: {startDate} to {endDate}</div>
                    {metaData?.error ? (
                        <div className="text-red-400 text-sm font-bold whitespace-pre-wrap">{metaData.error}</div>
                    ) : (
                        <pre>{JSON.stringify(metaData, null, 2)}</pre>
                    )}
                </Card>

                {/* Tiny ERP */}
                <Card title="Tiny ERP" status={tinyData.length > 0 ? "Success" : "Empty / Failed"}>
                    <div className="text-xs text-gray-400 mb-2">Orders Found: {tinyData.length}</div>
                    {/* Show raw first item to debug null total */}
                    <div className="text-xs text-yellow-500 mb-2">Debug Raw Item:</div>
                    <pre className="max-h-40 overflow-auto">{JSON.stringify(tinyData.slice(0, 1), null, 2)}</pre>
                </Card>

                {/* Wake */}
                <Card title="Wake Commerce" status={wakeData && !wakeData.error ? "Success" : "Failed"}>
                    <div className="text-xs text-gray-400 mb-2">Query: /products</div>
                    {wakeData?.error ? (
                        <div className="text-red-400 text-sm font-bold whitespace-pre-wrap">{wakeData.error}</div>
                    ) : (
                        <pre className="max-h-40 overflow-auto">{JSON.stringify(wakeData.slice(0, 1), null, 2)}</pre>
                    )}
                </Card>

                {/* Wake Orders */}
                <Card title="Wake Orders" status={wakeOrders && wakeOrders.length > 0 ? "Success" : "Empty"}>
                    <div className="text-xs text-gray-400 mb-2">Query: /pedidos ({startDate} to {endDate})</div>
                    <div className="text-xs text-gray-400 mb-2">Count: {wakeOrders.length}</div>
                    <pre className="max-h-40 overflow-auto">{JSON.stringify(wakeOrders.slice(0, 1), null, 2)}</pre>
                </Card>


                {/* Meta Creatives Debug */}
                <Card title="Meta Creatives" status={metaCreatives.length > 0 ? "Success" : "Empty"}>
                    <div className="text-xs text-gray-400 mb-2">Query: Top Creatives</div>
                    <pre className="max-h-40 overflow-auto">{JSON.stringify(metaCreatives, null, 2)}</pre>
                </Card>
            </div>
        </div>
    )
}

function Card({ title, status, children }: { title: string, status: string, children: React.ReactNode }) {
    const isSuccess = status.includes("Success") || status.includes("Connected");
    return (
        <div className={`border rounded-lg p-4 ${isSuccess ? "border-green-800 bg-green-950/20" : "border-red-800 bg-red-950/20"}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                <span className={`px-2 py-1 rounded text-xs font-bold ${isSuccess ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                    {status}
                </span>
            </div>
            <div className="text-sm overflow-auto">
                {children}
            </div>
        </div>
    )
}
