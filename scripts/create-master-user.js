#!/usr/bin/env node
/**
 * Script para criar um usuário master no Supabase.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env (chave "service_role secret" do painel Supabase).
 *
 * Uso: node scripts/create-master-user.js
 */

const fs = require('fs');
const path = require('path');

// Carrega .env
function loadEnv() {
    for (const file of ['.env', '.env.local']) {
        const envPath = path.join(__dirname, '..', file);
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match && !line.startsWith('#')) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^["']|["']$/g, '');
                    if (value) process.env[key] = value;
                }
            });
            console.log(`[OK] Carregado ${file}`);
            break;
        }
    }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('\n[ERRO] Variáveis necessárias no .env:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY (chave "service_role secret" do Supabase)');
    console.error('\nAdicione SUPABASE_SERVICE_ROLE_KEY no .env e execute novamente.');
    process.exit(1);
}

const EMAIL = 'gabriegipp04@gmail.com';
const PASSWORD = 'Aurelio01@';

async function main() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('\n--- CRIANDO USUÁRIO MASTER ---');
    console.log('Email:', EMAIL);

    // 1. Criar usuário no Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Master Admin' }
    });

    if (authError) {
        if (authError.message?.includes('already been registered')) {
            console.log('\n[INFO] Usuário já existe no Auth. Atualizando role para super_admin...');
            const { data: existing } = await supabase.auth.admin.listUsers();
            const existingUser = existing?.users?.find(u => u.email === EMAIL);
            if (!existingUser) {
                console.error('[ERRO] Não foi possível encontrar o usuário existente.');
                process.exit(1);
            }
            await upsertUserProfile(supabase, existingUser.id);
            console.log('[OK] Perfil master configurado com sucesso.');
            return;
        }
        console.error('[ERRO] Falha ao criar usuário:', authError.message);
        process.exit(1);
    }

    // 2. Inserir em user_profiles com role super_admin
    await upsertUserProfile(supabase, userData.user.id);
    console.log('\n[OK] Usuário master criado com sucesso!');
    console.log('   Email:', EMAIL);
    console.log('   Role: super_admin');
}

async function upsertUserProfile(supabase, userId) {
    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            full_name: 'Master Admin',
            tenant_id: null,
            role: 'super_admin'
        }, {
            onConflict: 'id',
            ignoreDuplicates: false
        });

    if (error) {
        console.error('[ERRO] Falha ao configurar perfil:', error.message);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
