/**
 * Google Analytics 4 - Extended Reports
 * Público-alvo (Demographics) and Origem/Mídia (Source/Medium)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { google } from "googleapis";

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Helper to create authenticated client
function getAnalyticsClient() {
    if (!GA4_PROPERTY_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        return null;
    }
    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    auth.setCredentials({ refresh_token: REFRESH_TOKEN });
    return google.analyticsdata({ version: "v1beta", auth });
}

// Safe date helper
function getSafeEndDate(endDate: string): string {
    const todayStr = new Date().toISOString().split('T')[0];
    return endDate > todayStr ? todayStr : endDate;
}

export interface RegionData {
    region: string;
    sessions: number;
    sessionsChange: number;
    purchases: number;
    purchasesChange: number;
    revenue: number;
    revenueChange: number;
    conversionRate: number;
}

export interface CityData {
    city: string;
    sessions: number;
    sessionsChange: number;
    purchases: number;
    purchasesChange: number;
    revenue: number;
    revenueChange: number;
    conversionRate: number;
}

export interface AgeData {
    age: string;
    sessions: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
}

export interface SourceMediumData {
    source: string;
    medium: string;
    landingPage: string;
    sessions: number;
    sessionsChange: number;
    addToCarts: number;
    purchases: number;
    revenue: number;
    revenueChange: number;
    conversionRate: number;
    avgRevenue: number;
    avgSessionDuration: number;
}

/**
 * Fetch Público-alvo (Demographics) data
 * Regions, Cities, and Age groups
 */
export async function getGA4Demographics(startDate: string, endDate: string) {
    const analyticsData = getAnalyticsClient();
    if (!analyticsData) {
        console.error('[GA4 Demographics] Missing credentials');
        return null;
    }

    const safeEndDate = getSafeEndDate(endDate);
    console.log(`[GA4 Demographics] Fetching data from ${startDate} to ${safeEndDate}`);

    try {
        // Parallel requests for regions, cities, and age
        const [regionsReport, citiesReport, ageReport] = await Promise.all([
            // Regions (States)
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate: safeEndDate }],
                    dimensions: [{ name: "region" }],
                    metrics: [
                        { name: "sessions" },
                        { name: "ecommercePurchases" },
                        { name: "totalRevenue" }
                    ],
                    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                    limit: "20"
                }
            }),
            // Cities
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate: safeEndDate }],
                    dimensions: [{ name: "city" }],
                    metrics: [
                        { name: "sessions" },
                        { name: "ecommercePurchases" },
                        { name: "totalRevenue" }
                    ],
                    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                    limit: "20"
                }
            }),
            // Age groups
            analyticsData.properties.runReport({
                property: `properties/${GA4_PROPERTY_ID}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate: safeEndDate }],
                    dimensions: [{ name: "userAgeBracket" }],
                    metrics: [
                        { name: "sessions" },
                        { name: "ecommercePurchases" },
                        { name: "totalRevenue" }
                    ],
                    orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
                }
            })
        ]);

        // Parse regions
        const regions: RegionData[] = (regionsReport.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const purchases = parseInt(row.metricValues?.[1]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[2]?.value || "0");
            return {
                region: row.dimensionValues?.[0]?.value || "Unknown",
                sessions,
                sessionsChange: 0, // Would need comparison period
                purchases,
                purchasesChange: 0,
                revenue,
                revenueChange: 0,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0
            };
        });

        // Parse cities
        const cities: CityData[] = (citiesReport.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const purchases = parseInt(row.metricValues?.[1]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[2]?.value || "0");
            return {
                city: row.dimensionValues?.[0]?.value || "Unknown",
                sessions,
                sessionsChange: 0,
                purchases,
                purchasesChange: 0,
                revenue,
                revenueChange: 0,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0
            };
        });

        // Parse age groups
        const ageGroups: AgeData[] = (ageReport.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const purchases = parseInt(row.metricValues?.[1]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[2]?.value || "0");
            return {
                age: row.dimensionValues?.[0]?.value || "unknown",
                sessions,
                purchases,
                revenue,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0
            };
        });

        // Calculate totals
        const totalSessions = regions.reduce((sum, r) => sum + r.sessions, 0);
        const totalPurchases = regions.reduce((sum, r) => sum + r.purchases, 0);
        const totalRevenue = regions.reduce((sum, r) => sum + r.revenue, 0);

        console.log(`[GA4 Demographics] Found ${regions.length} regions, ${cities.length} cities, ${ageGroups.length} age groups`);

        return {
            regions,
            cities,
            ageGroups,
            totals: {
                sessions: totalSessions,
                purchases: totalPurchases,
                revenue: totalRevenue,
                conversionRate: totalSessions > 0 ? (totalPurchases / totalSessions) * 100 : 0
            }
        };
    } catch (error: any) {
        console.error("[GA4 Demographics] Error:", error.message);
        return null;
    }
}

/**
 * Fetch Origem/Mídia (Source/Medium) data
 */
export async function getGA4SourceMedium(startDate: string, endDate: string) {
    const analyticsData = getAnalyticsClient();
    if (!analyticsData) {
        console.error('[GA4 Source/Medium] Missing credentials');
        return null;
    }

    const safeEndDate = getSafeEndDate(endDate);
    console.log(`[GA4 Source/Medium] Fetching data from ${startDate} to ${safeEndDate}`);

    try {
        const report = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate: safeEndDate }],
                dimensions: [
                    { name: "sessionSource" },
                    { name: "sessionMedium" },
                    { name: "landingPage" }
                ],
                metrics: [
                    { name: "sessions" },
                    { name: "addToCarts" },
                    { name: "ecommercePurchases" },
                    { name: "totalRevenue" },
                    { name: "averageSessionDuration" }
                ],
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                limit: "50"
            }
        });

        const data: SourceMediumData[] = (report.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const addToCarts = parseInt(row.metricValues?.[1]?.value || "0");
            const purchases = parseInt(row.metricValues?.[2]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[3]?.value || "0");
            const avgDuration = parseFloat(row.metricValues?.[4]?.value || "0");

            return {
                source: row.dimensionValues?.[0]?.value || "(direct)",
                medium: row.dimensionValues?.[1]?.value || "(none)",
                landingPage: row.dimensionValues?.[2]?.value || "/",
                sessions,
                sessionsChange: 0,
                addToCarts,
                purchases,
                revenue,
                revenueChange: 0,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0,
                avgRevenue: purchases > 0 ? revenue / purchases : 0,
                avgSessionDuration: avgDuration
            };
        });

        // Calculate totals
        const totalSessions = data.reduce((sum, r) => sum + r.sessions, 0);
        const totalAddToCarts = data.reduce((sum, r) => sum + r.addToCarts, 0);
        const totalPurchases = data.reduce((sum, r) => sum + r.purchases, 0);
        const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);

        console.log(`[GA4 Source/Medium] Found ${data.length} source/medium combinations`);

        return {
            data,
            totals: {
                sessions: totalSessions,
                addToCarts: totalAddToCarts,
                purchases: totalPurchases,
                revenue: totalRevenue,
                conversionRate: totalSessions > 0 ? (totalPurchases / totalSessions) * 100 : 0
            }
        };
    } catch (error: any) {
        console.error("[GA4 Source/Medium] Error:", error.message);
        return null;
    }
}

/**
 * Fetch Google Ads Campaign Data via GA4
 * Filters for source=google and medium=cpc
 */
export async function getGA4GoogleAdsCampaigns(startDate: string, endDate: string) {
    const analyticsData = getAnalyticsClient();
    if (!analyticsData) {
        return null;
    }

    const safeEndDate = getSafeEndDate(endDate);

    try {
        const report = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate: safeEndDate }],
                dimensions: [
                    { name: "sessionSource" },
                    { name: "sessionMedium" },
                    { name: "sessionCampaignName" }
                ],
                metrics: [
                    { name: "sessions" },
                    { name: "ecommercePurchases" },
                    { name: "totalRevenue" }
                ],
                // Filter specifically for Google CPC
                dimensionFilter: {
                    andGroup: {
                        expressions: [
                            {
                                filter: {
                                    fieldName: "sessionSource",
                                    stringFilter: { value: "google", matchType: "CONTAINS" } // 'google' domain
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionMedium",
                                    stringFilter: { value: "cpc", matchType: "EXACT" }
                                }
                            }
                        ]
                    }
                },
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
            }
        });

        const campaigns = (report.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const purchases = parseInt(row.metricValues?.[1]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[2]?.value || "0");

            return {
                name: row.dimensionValues?.[2]?.value || "(not set)", // sessionCampaignName
                sessions,
                purchases,
                revenue,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0,
                avgTicket: purchases > 0 ? revenue / purchases : 0
            };
        });

        // Consolidate duplicates (if any same campaign name split by slight source variations)
        const consolidated = campaigns.reduce((acc: any[], curr) => {
            const existing = acc.find(c => c.name === curr.name);
            if (existing) {
                existing.sessions += curr.sessions;
                existing.purchases += curr.purchases;
                existing.revenue += curr.revenue;
                // Recalc rates
                existing.conversionRate = existing.sessions > 0 ? (existing.purchases / existing.sessions) * 100 : 0;
                existing.avgTicket = existing.purchases > 0 ? existing.revenue / existing.purchases : 0;
            } else {
                acc.push(curr);
            }
            return acc;
        }, []);

        const totals = consolidated.reduce((acc, curr) => ({
            sessions: acc.sessions + curr.sessions,
            purchases: acc.purchases + curr.purchases,
            revenue: acc.revenue + curr.revenue
        }), { sessions: 0, purchases: 0, revenue: 0 });

        return {
            campaigns: consolidated.sort((a, b) => b.revenue - a.revenue),
            totals
        };

    } catch (error: any) {
        console.error("[GA4 Google Ads] Error:", error.message);
        return null;
    }
}

/**
 * Format seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetch Daily Sessions by Device Category (Mobile vs Desktop)
 * For the interactive area chart on dashboard
 */
export async function getGA4DailySessions(startDate: string, endDate: string) {
    const analyticsData = getAnalyticsClient();
    if (!analyticsData) {
        console.error('[GA4 Daily Sessions] Missing credentials');
        return null;
    }

    const safeEndDate = getSafeEndDate(endDate);
    console.log(`[GA4 Daily Sessions] Fetching data from ${startDate} to ${safeEndDate}`);

    try {
        const report = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate: safeEndDate }],
                dimensions: [
                    { name: "date" },
                    { name: "deviceCategory" }
                ],
                metrics: [
                    { name: "sessions" }
                ],
                orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
            }
        });

        // Group by date and split mobile/desktop
        const dailyData: Record<string, { date: string, mobile: number, desktop: number }> = {};

        (report.data.rows || []).forEach((row: any) => {
            const rawDate = row.dimensionValues?.[0]?.value || "";
            const deviceCategory = (row.dimensionValues?.[1]?.value || "").toLowerCase();
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");

            // Format date from YYYYMMDD to YYYY-MM-DD
            const formattedDate = rawDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

            if (!dailyData[formattedDate]) {
                dailyData[formattedDate] = { date: formattedDate, mobile: 0, desktop: 0 };
            }

            if (deviceCategory === 'mobile') {
                dailyData[formattedDate].mobile += sessions;
            } else if (deviceCategory === 'desktop') {
                dailyData[formattedDate].desktop += sessions;
            } else if (deviceCategory === 'tablet') {
                // Add tablet to desktop for simplification
                dailyData[formattedDate].desktop += sessions;
            }
        });

        const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

        console.log(`[GA4 Daily Sessions] Fetched ${chartData.length} days of data`);

        return chartData;
    } catch (error: any) {
        console.error("[GA4 Daily Sessions] Error:", error.message);
        return null;
    }
}

/**
 * Fetch Email & SMS Performance (Edrone specific)
 * Filters for source=edrone OR medium=email OR medium=sms
 */
export async function getGA4EmailSmsPerformance(startDate: string, endDate: string) {
    const analyticsData = getAnalyticsClient();
    if (!analyticsData) {
        return null;
    }

    const safeEndDate = getSafeEndDate(endDate);
    console.log(`[GA4 Email/SMS] Fetching data from ${startDate} to ${safeEndDate}`);

    try {
        const report = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate: safeEndDate }],
                dimensions: [
                    { name: "sessionSource" },
                    { name: "sessionMedium" },
                    { name: "sessionCampaignName" }
                ],
                metrics: [
                    { name: "sessions" },
                    { name: "ecommercePurchases" },
                    { name: "totalRevenue" }
                ],
                // Complex filter: (Source CONTAINS edrone OR sms) OR (Medium CONTAINS email OR sms)
                // Note: SMS campaigns may have source='SMS_NEWSLETTER' with medium='edrone'
                dimensionFilter: {
                    orGroup: {
                        expressions: [
                            {
                                filter: {
                                    fieldName: "sessionSource",
                                    stringFilter: { value: "edrone", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionSource",
                                    stringFilter: { value: "sms", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionSource",
                                    stringFilter: { value: "SMS", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionMedium",
                                    stringFilter: { value: "email", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionMedium",
                                    stringFilter: { value: "sms", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionMedium",
                                    stringFilter: { value: "SMS", matchType: "CONTAINS" }
                                }
                            },
                            {
                                filter: {
                                    fieldName: "sessionMedium",
                                    stringFilter: { value: "text", matchType: "CONTAINS" }
                                }
                            }
                        ]
                    }
                },
                orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }]
            }
        });

        const data = (report.data.rows || []).map((row: any) => {
            const sessions = parseInt(row.metricValues?.[0]?.value || "0");
            const purchases = parseInt(row.metricValues?.[1]?.value || "0");
            const revenue = parseFloat(row.metricValues?.[2]?.value || "0");

            return {
                source: row.dimensionValues?.[0]?.value || "(not set)",
                medium: row.dimensionValues?.[1]?.value || "(not set)",
                campaign: row.dimensionValues?.[2]?.value || "(not set)",
                sessions,
                purchases,
                revenue,
                conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0,
                avgTicket: purchases > 0 ? revenue / purchases : 0
            };
        });

        // Log all unique mediums to debug SMS visibility
        const uniqueMediums = [...new Set(data.map(d => d.medium))];
        console.log(`[GA4 Email/SMS] Unique mediums found:`, uniqueMediums);
        console.log(`[GA4 Email/SMS] Breakdown by medium:`,
            uniqueMediums.map(m => ({
                medium: m,
                count: data.filter(d => d.medium === m).length,
                revenue: data.filter(d => d.medium === m).reduce((sum, d) => sum + d.revenue, 0)
            }))
        );

        const totals = data.reduce((acc, curr) => ({
            sessions: acc.sessions + curr.sessions,
            purchases: acc.purchases + curr.purchases,
            revenue: acc.revenue + curr.revenue
        }), { sessions: 0, purchases: 0, revenue: 0 });

        console.log(`[GA4 Email/SMS] Found ${data.length} campaign rows. Total Revenue: R$ ${totals.revenue}`);

        return {
            campaigns: data,
            totals
        };

    } catch (error: any) {
        console.error("[GA4 Email/SMS] Error:", error.message);
        return null;
    }
}
