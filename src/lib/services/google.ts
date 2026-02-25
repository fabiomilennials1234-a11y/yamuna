import { google } from "googleapis";

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

export async function getGoogleAnalyticsData(startDate: string, endDate: string) {
    if (!GA4_PROPERTY_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        return null;
    }

    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    auth.setCredentials({ refresh_token: REFRESH_TOKEN });

    const analyticsData = google.analyticsdata({ version: "v1beta", auth });

    try {
        // FIX: Google Analytics fails if endDate is in the future (Currency Exchange error)
        // So we clamp endDate to TODAY.
        const todayStr = new Date().toISOString().split('T')[0];
        const safeEndDate = endDate > todayStr ? todayStr : endDate;

        // Ensure startDate is not after safeEndDate
        const safeStartDate = startDate > safeEndDate ? safeEndDate : startDate;

        // Request 1: Sessions (Session Scope)
        // Request 2: Events (Revenue, Transactions - Standard Metrics)
        // Request 3: Ad Cost (Ad Scope)
        // Request 4: Event Counts (View Item, Add to Cart, Begin Checkout)
        const [sessionsReport, eventsReport, adsReport, eventCountsReport] = await Promise.all([
            // Request 1: Sessions
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate: safeStartDate, endDate: safeEndDate }],
                    metrics: [{ name: 'sessions' }],
                },
            }),
            // Request 2: Events (Revenue, Transactions, Users)
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate: safeStartDate, endDate: safeEndDate }],
                    metrics: [
                        { name: "totalRevenue" },
                        { name: "transactions" },
                        { name: "totalUsers" },
                        { name: "newUsers" },
                    ],
                },
            }),
            // Request 3: Ad Cost
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate: safeStartDate, endDate: safeEndDate }],
                    dimensions: [{ name: "campaignName" }],
                    metrics: [{ name: "advertiserAdCost" }],
                },
            }),
            // Request 4: Funnel Events
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate: safeStartDate, endDate: safeEndDate }],
                    dimensions: [{ name: "eventName" }],
                    metrics: [{ name: "eventCount" }],
                    dimensionFilter: {
                        filter: {
                            fieldName: "eventName",
                            inListFilter: {
                                values: ["view_item", "add_to_cart", "begin_checkout", "purchase"],
                                caseSensitive: false
                            }
                        }
                    }
                },
            })
        ]);

        const sessionsRow = sessionsReport.data.rows?.[0];
        const events = eventsReport.data.rows?.[0]?.metricValues || [];
        const revenue = parseFloat(events[0]?.value || "0");
        const transactions = parseInt(events[1]?.value || "0");
        const users = parseInt(events[2]?.value || "0");
        const newUsers = parseInt(events[3]?.value || "0");

        // Helper to get event count
        const getEventCount = (name: string) => {
            const row = eventCountsReport.data.rows?.find((r) => r.dimensionValues?.[0].value === name);
            return parseInt(row?.metricValues?.[0].value || "0");
        };

        // Aggregate Ad Cost
        const totalInvestment = adsReport.data.rows?.reduce((acc, row) => {
            return acc + parseFloat(row.metricValues?.[0]?.value || "0");
        }, 0) || 0;

        // Get purchase count for unique purchasers approximation
        const purchaseCount = getEventCount("purchase");

        return {
            sessions: parseInt(sessionsRow?.metricValues?.[0]?.value || "0"),
            totalRevenue: revenue,
            transactions: transactions,
            purchasers: users, // Total users during period
            newUsers: newUsers,
            addToCarts: getEventCount("add_to_cart"),
            checkouts: getEventCount("begin_checkout"),
            itemsViewed: getEventCount("view_item"),
            investment: totalInvestment, // Ads spend
            roas: totalInvestment > 0 ? revenue / totalInvestment : 0
        };
    } catch (error: any) {
        console.warn("⚠️ GA4 Data Fetch Failed (Check Credentials/Quota):", error.message || "Unknown error");
        // console.error(error);
        return { error: error.message || JSON.stringify(error) };
    }
}
