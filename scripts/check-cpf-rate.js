/**
 * Script to check CPF/CNPJ extraction rate directly
 * Run with: node scripts/check-cpf-rate.js
 */

const { format, subDays } = require('date-fns');

// Mock environment
process.env.NODE_ENV = 'development';

async function checkCPFRate() {
    console.log('🔍 Checking CPF/CNPJ Extraction Rate...\n');

    // Import services after env is set
    const { getTinyOrders } = await import('../src/lib/services/tiny.ts');
    const { getWakeOrders } = await import('../src/lib/services/wake.ts');
    const { mergeOrders, getCustomerId } = await import('../src/lib/services/customers.ts');

    const endDate = new Date();
    const startDate = subDays(endDate, 30);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    console.log(`📅 Período: ${startStr} até ${endStr}\n`);

    try {
        // Fetch orders
        const [tinyOrders, wakeOrders] = await Promise.all([
            getTinyOrders(startStr, endStr),
            getWakeOrders(startStr, endStr)
        ]);

        const allOrders = mergeOrders(tinyOrders || [], wakeOrders || []);

        if (allOrders.length === 0) {
            console.log('❌ Nenhum pedido encontrado no período');
            return;
        }

        console.log(`📦 Total de pedidos: ${allOrders.length}\n`);

        // Analyze customer identification methods
        let cpfCnpjCount = 0;
        let emailCount = 0;
        let nameCount = 0;
        let unknownCount = 0;

        const cpfCnpjSamples = [];
        const emailSamples = [];
        const nameSamples = [];

        allOrders.forEach(order => {
            const customerId = getCustomerId(order);

            if (customerId.startsWith('cpf_')) {
                cpfCnpjCount++;
                if (cpfCnpjSamples.length < 3) {
                    cpfCnpjSamples.push({
                        pedido: order.id,
                        nome: order.customerName || order.nome || 'N/A',
                        cpf: customerId.substring(4, 10) + '***'
                    });
                }
            } else if (customerId.includes('@')) {
                emailCount++;
                if (emailSamples.length < 3) {
                    emailSamples.push({
                        pedido: order.id,
                        email: customerId
                    });
                }
            } else if (customerId.startsWith('name_')) {
                nameCount++;
                if (nameSamples.length < 3) {
                    nameSamples.push({
                        pedido: order.id,
                        nome: customerId.replace('name_', '')
                    });
                }
            } else {
                unknownCount++;
            }
        });

        const totalOrders = allOrders.length;
        const cpfCnpjRate = (cpfCnpjCount / totalOrders) * 100;
        const emailRate = (emailCount / totalOrders) * 100;
        const nameRate = (nameCount / totalOrders) * 100;
        const unknownRate = (unknownCount / totalOrders) * 100;

        console.log('📊 ANÁLISE DE IDENTIFICAÇÃO DE CLIENTES\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log(`✅ CPF/CNPJ: ${cpfCnpjCount} pedidos (${cpfCnpjRate.toFixed(2)}%)`);
        console.log(`📧 Email:   ${emailCount} pedidos (${emailRate.toFixed(2)}%)`);
        console.log(`👤 Nome:    ${nameCount} pedidos (${nameRate.toFixed(2)}%)`);
        console.log(`❓ Unknown: ${unknownCount} pedidos (${unknownRate.toFixed(2)}%)\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Status
        let status = '';
        let recommendation = '';

        if (cpfCnpjRate >= 80) {
            status = '✅ EXCELENTE - Taxa de CPF/CNPJ está ótima!';
            recommendation = '✅ A Receita Nova será calculada com precisão máxima.';
        } else if (cpfCnpjRate >= 50) {
            status = '⚠️  ACEITÁVEL - Taxa de CPF/CNPJ é aceitável.';
            recommendation = '⚠️  Considere enriquecer dados com getTinyOrdersWithCustomers().';
        } else {
            status = '🚨 BAIXO - Taxa de CPF/CNPJ está muito baixa!';
            recommendation = '🚨 CRÍTICO: Use getTinyOrdersWithCustomers() para buscar detalhes completos.';
        }

        console.log(`STATUS: ${status}`);
        console.log(`\n${recommendation}\n`);

        // Show samples
        if (cpfCnpjSamples.length > 0) {
            console.log('📋 Amostras com CPF/CNPJ:');
            cpfCnpjSamples.forEach(s => {
                console.log(`   - Pedido ${s.pedido}: ${s.nome} (CPF: ${s.cpf})`);
            });
            console.log('');
        }

        if (emailSamples.length > 0) {
            console.log('📧 Amostras com Email:');
            emailSamples.forEach(s => {
                console.log(`   - Pedido ${s.pedido}: ${s.email}`);
            });
            console.log('');
        }

        if (nameSamples.length > 0) {
            console.log('👤 Amostras com Nome apenas:');
            nameSamples.forEach(s => {
                console.log(`   - Pedido ${s.pedido}: ${s.nome}`);
            });
            console.log('');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Exit with code based on quality
        if (cpfCnpjRate < 50) {
            console.log('⚠️  ATENÇÃO: Taxa de CPF/CNPJ baixa - implementação precisa de ajustes\n');
            process.exit(1);
        } else {
            console.log('✅ Tudo pronto para implementação!\n');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkCPFRate();
