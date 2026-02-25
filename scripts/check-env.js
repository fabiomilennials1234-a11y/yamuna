console.log('Starting API test...');

const fs = require('fs');
const path = require('path');

console.log('Loading .env.local...');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Env path:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
    console.log('Environment loaded!');
}

console.log('\n=== CHECKING ENV VARIABLES ===');
console.log('GA4_PROPERTY_ID:', process.env.GA4_PROPERTY_ID || 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? 'SET' : 'NOT SET');
console.log('TINY_API_TOKEN:', process.env.TINY_API_TOKEN ? 'SET' : 'NOT SET');

console.log('\nTest completed!');
