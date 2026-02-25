const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Manually load .env.local with robust parsing
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    console.log(`Loading .env.local from ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} else {
    console.error('❌ .env.local file not found!');
}

async function checkEdroneData() {
    console.log('🔍 Checking for Edrone/Email/SMS data in GA4...');

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;

    // Debug print (masked)
    console.log(`CLIENT_ID present: ${!!CLIENT_ID}`);
    console.log(`CLIENT_SECRET present: ${!!CLIENT_SECRET}`);
    console.log(`REFRESH_TOKEN present: ${!!REFRESH_TOKEN}`);
    console.log(`GA4_PROPERTY_ID: ${GA4_PROPERTY_ID}`);

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !GA4_PROPERTY_ID) {
        console.error('❌ Missing GA4 credentials');
        return;
    }

    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    auth.setCredentials({ refresh_token: REFRESH_TOKEN });
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    // Last 90 days to be sure
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
        console.log(`\nQuerying GA4 from ${startStr} to ${endStr}...`);

        // Query 1: Filter by Source containing 'edrone'
        await runReport(analyticsData, GA4_PROPERTY_ID, startStr, endStr, 'Source "edrone"', {
            filter: {
                fieldName: 'sessionSource',
                stringFilter: { matchType: 'CONTAINS', value: 'edrone' }
            }
        });

        // Query 2: Filter by Medium containing 'email'
        await runReport(analyticsData, GA4_PROPERTY_ID, startStr, endStr, 'Medium "email"', {
            filter: {
                fieldName: 'sessionMedium',
                stringFilter: { matchType: 'CONTAINS', value: 'email' }
            }
        });

        // Query 3: Filter by Medium containing 'sms'
        await runReport(analyticsData, GA4_PROPERTY_ID, startStr, endStr, 'Medium "sms"', {
            filter: {
                fieldName: 'sessionMedium',
                stringFilter: { matchType: 'CONTAINS', value: 'sms' }
            }
        });

        // Query 4: List Top Sources/Mediums to manually inspect
        console.log('\n----------------------------------------');
        console.log('📊 Top 20 Sources/Mediums by Revenue (General Check):');
        const topResponse = await analyticsData.properties.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate: startStr, endDate: endStr }],
                dimensions: [
                    { name: 'sessionSource' },
                    { name: 'sessionMedium' }
                ],
                metrics: [{ name: 'totalRevenue' }],
                limit: 20,
                orderBys: [{ desc: true, metric: { metricName: 'totalRevenue' } }]
            },
        });

        if (topResponse.data.rows) {
            topResponse.data.rows.forEach(row => {
                const source = row.dimensionValues[0].value;
                const medium = row.dimensionValues[1].value;
                const revenue = row.metricValues[0].value;
                console.log(`[${source} / ${medium}]: R$ ${parseFloat(revenue).toFixed(2)}`);
            });
        }

    } catch (error) {
        console.error('❌ Error querying GA4:', error.message);
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function runReport(analyticsData, propertyId, startStr, endStr, label, dimensionFilter) {
    const response = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
            dateRanges: [{ startDate: startStr, endDate: endStr }],
            dimensions: [
                { name: 'sessionSource' },
                { name: 'sessionMedium' },
                { name: 'campaignName' }
            ],
            // Removed 'transactions', using only totalRevenue and sessions
            metrics: [
                { name: 'totalRevenue' },
                { name: 'sessions' }
            ],
            dimensionFilter: dimensionFilter
        },
    });

    console.log(`\n--- Results for ${label} ---`);
    if (!response.data.rows || response.data.rows.length === 0) {
        console.log('   (No data found)');
        return;
    }

    response.data.rows.forEach(row => {
        const source = row.dimensionValues[0].value;
        const medium = row.dimensionValues[1].value;
        const campaign = row.dimensionValues[2].value;
        const revenue = row.metricValues[0].value;
        const sessions = row.metricValues[1].value;

        // Only show if revenue > 0
        if (parseFloat(revenue) > 0) {
            console.log(`   ✅ Source: ${source} | Medium: ${medium} | Campaign: ${campaign} (Rev: R$ ${parseFloat(revenue).toFixed(2)} | Sess: ${sessions})`);
        } else {
            console.log(`   (No Revenue) Source: ${source} | Medium: ${medium} | Campaign: ${campaign} (Sess: ${sessions})`);
        }
    });
}

checkEdroneData();
