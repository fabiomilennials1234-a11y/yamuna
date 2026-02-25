/**
 * B2B vs B2C Segmentation
 * CNPJ (14 digits) = B2B (Empresa)
 * CPF (11 digits) = B2C (Pessoa Física)
 */

export interface B2BSegmentation {
    b2bRevenue: number;
    b2cRevenue: number;
    b2bOrders: number;
    b2cOrders: number;
    b2bCustomers: number;
    b2cCustomers: number;
    b2bAverageTicket: number;
    b2cAverageTicket: number;
}

/**
 * Checks if a CPF/CNPJ is a CNPJ (company)
 */
export function isCNPJ(cpfCnpj: string): boolean {
    const normalized = cpfCnpj.replace(/\D/g, '');
    return normalized.length === 14;
}

/**
 * Checks if a CPF/CNPJ is a CPF (individual)
 */
export function isCPF(cpfCnpj: string): boolean {
    const normalized = cpfCnpj.replace(/\D/g, '');
    return normalized.length === 11;
}

/**
 * Segments orders into B2B (CNPJ) and B2C (CPF)
 */
// List of sellers that are exclusively B2B
// Add names here exactly as they appear in Tiny (e.g., "João Silva", "Representante X")
export const B2B_SELLERS: string[] = [
    "Valdir Casett ME",
    "CANTONI REPRESENTAÇÃO COMERCIAL",
    "Divina Terra",
    "Duarte | Correa Alves Representações EIRELI",
    "Fitland",
    "Marcus Vinícius Wust Zibetti ME",
    "Natiele Bordin",
    "Laura Rech",
];

import { TinyOrder } from "./tiny";

/**
 * Segments orders into B2B (CNPJ or B2B Seller) and B2C (CPF or others)
 */
export function segmentB2BvsB2C(orders: TinyOrder[]): B2BSegmentation {
    let b2bRevenue = 0;
    let b2cRevenue = 0;
    let b2bOrders = 0;
    let b2cOrders = 0;

    const b2bCustomerIds = new Set<string>();
    const b2cCustomerIds = new Set<string>();

    // Debug: Collect unique sellers found
    const sellersFound = new Set<string>();

    orders.forEach(order => {
        const cpfCnpj =
            order.customerCpfCnpj ||
            order.raw?.cliente?.cpf_cnpj ||
            order.raw?.cliente?.cnpj ||
            '';

        const seller = order.seller || order.raw?.nome_vendedor || order.raw?.vendedor || '';

        if (seller) {
            sellersFound.add(seller);
        }

        const total = order.total || 0;
        const customerId = order.customerCpfCnpj || order.customerEmail || order.customerName || `order-${order.id}`;

        // Check if B2B: Either has CNPJ OR is sold by a B2B seller
        const isB2B = (cpfCnpj && isCNPJ(cpfCnpj)) || (seller && B2B_SELLERS.includes(seller));

        if (isB2B) {
            // B2B - Empresa
            b2bRevenue += total;
            b2bOrders++;
            b2bCustomerIds.add(customerId);
        } else {
            // Alles else - B2C (CPF or undefined)
            b2cRevenue += total;
            b2cOrders++;
            b2cCustomerIds.add(customerId);
        }
    });

    if (sellersFound.size > 0) {
        console.log(`[B2B Segmentation] 🛍️ Sellers found in this batch:`, Array.from(sellersFound));
    }

    return {
        b2bRevenue,
        b2cRevenue,
        b2bOrders,
        b2cOrders,
        b2bCustomers: b2bCustomerIds.size,
        b2cCustomers: b2cCustomerIds.size,
        b2bAverageTicket: b2bOrders > 0 ? b2bRevenue / b2bOrders : 0,
        b2cAverageTicket: b2cOrders > 0 ? b2cRevenue / b2cOrders : 0
    };
}
