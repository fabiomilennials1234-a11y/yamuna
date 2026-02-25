const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

async function listProperties() {
    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    auth.setCredentials({ refresh_token: REFRESH_TOKEN });

    // Use Analytics Admin API
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth });

    try {
        console.log('Tentando listar contas com Analytics Admin API...');
        const accountsRes = await analyticsAdmin.accounts.list();
        const accounts = accountsRes.data.accounts;

        if (!accounts || accounts.length === 0) {
            console.log('Nenhuma conta encontrada.');
            return;
        }

        console.log(`Encontradas ${accounts.length} contas.`);

        for (const account of accounts) {
            console.log(`\nConta: ${account.displayName} (${account.name})`);

            try {
                const propsRes = await analyticsAdmin.properties.list({
                    filter: `parent:${account.name}`,
                    showDeleted: false
                });

                const properties = propsRes.data.properties;
                if (properties && properties.length > 0) {
                    properties.forEach(p => {
                        console.log(`   -> Propriedade: ${p.displayName}`);
                        const id = p.name.split('/')[1];
                        console.log(`      ID: ${id}`);
                        console.log(`      [SUGESTÃO] Adicione ao .env.local: GA4_PROPERTY_ID=${id}`);
                    });
                } else {
                    console.log('   (Nenhuma propriedade nesta conta)');
                }
            } catch (err) {
                console.log(`   Erro ao listar propriedades da conta ${account.name}: ${err.message}`);
            }
        }

    } catch (e) {
        console.error('Erro Geral:', e.message);
        console.log('Talvez o escopo de autenticação não permita listar contas (Admin API).');
        console.log('Escopos atuais permitidos: analytics.readonly, userinfo.email');
    }
}

listProperties();
