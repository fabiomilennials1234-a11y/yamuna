import { google } from "googleapis";

export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const SA_CLIENT_EMAIL = process.env.GOOGLE_SA_CLIENT_EMAIL;
const SA_PRIVATE_KEY = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function getGA4Auth() {
    if (!GA4_PROPERTY_ID || !SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) return null;

    return new google.auth.JWT({
        email: SA_CLIENT_EMAIL,
        key: SA_PRIVATE_KEY,
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
}
