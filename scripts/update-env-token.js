const fs = require('fs');
const path = require('path');

// Read the new token
const newTokenPath = path.join(__dirname, '..', '.new-google-token.json');
const newTokenData = JSON.parse(fs.readFileSync(newTokenPath, 'utf-8'));

// Read current .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = fs.readFileSync(envPath, 'utf-8');

// Update the GOOGLE_REFRESH_TOKEN line
envContent = envContent.replace(
    /GOOGLE_REFRESH_TOKEN=.*/,
    `GOOGLE_REFRESH_TOKEN=${newTokenData.GOOGLE_REFRESH_TOKEN}`
);

// Write back
fs.writeFileSync(envPath, envContent, 'utf-8');

console.log('✅ .env.local atualizado com sucesso!');
console.log(`   Novo REFRESH_TOKEN: ${newTokenData.GOOGLE_REFRESH_TOKEN.substring(0, 30)}...`);
console.log('\n🚀 Próximo passo: Reinicie o servidor com "npm run dev"');
