/**
 * Customer Analysis Service
 * Handles customer segmentation, RFM, and revenue attribution
 */

import { differenceInDays, parseISO } from "date-fns";

// Helper for AGGRESSIVE name normalization
// Extracts only FIRST + LAST name to maximize matching
export function normalizeName(name: string): string {
    if (!name) return "";

    // Remove accents, lowercase, trim
    let normalized = name.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Remove common titles and suffixes
    normalized = normalized
        .replace(/\b(sr|sra|dr|dra|prof|eng|arq|jr|junior|filho|neto|sobrinho)\b\.?/gi, '')
        .replace(/[^a-z\s]/g, '') // Remove all non-letters
        .replace(/\s+/g, ' ')
        .trim();

    // Extract ONLY first and last name (ignore middle names)
    const parts = normalized.split(' ').filter(p => p.length > 2); // Ignore initials
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];

    // Return "firstname lastname" - maximum compatibility
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

export interface CustomerOrder {
    id: string;
    customerId: string;
    customerEmail?: string;
    orderDate: string;
    total: number;
}

export interface CustomerSegmentation {
    newRevenue: number;
    retentionRevenue: number;
    newCustomersCount: number;
    returningCustomersCount: number;
}

export interface RFMScore {
    customerId: string;
    customerName?: string;
    email?: string;
    recency: number;      // Days since last purchase
    frequency: number;    // Total number of orders
    monetary: number;     // Total spent
    R: number;            // Recency score 1-4
    F: number;            // Frequency score 1-4
    M: number;            // Monetary score 1-4
    ticketAvg: number;    // Average order value
}

/**
 * Extract customer ID from order (handles multiple formats)
 * Priority: CPF/CNPJ (unique) > email > explicit customerId > name (fallback)
 */
export function getCustomerId(order: any): string {
    // 1. CPF/CNPJ (Highest Priority - Unique)
    const rawCpf = order.customerCpfCnpj || order.cliente?.cpf_cnpj || order.cpf_cnpj || order.cnpj || order.cpf;
    if (rawCpf) {
        const cleanCpf = rawCpf.toString().replace(/\D/g, '');
        if (cleanCpf.length >= 11) return `cpf_${cleanCpf}`;
    }

    // 2. Email (Reliable)
    const rawEmail = order.customerEmail || order.cliente?.email || order.email;
    if (rawEmail && rawEmail.includes('@')) {
        return rawEmail.toLowerCase().trim();
    }

    // 3. Customer ID (Service Specific)
    if (order.customerId && !order.customerId.startsWith('unknown_')) return order.customerId;
    if (order.cliente?.id || order.cliente?.codigo) return `tiny_id_${order.cliente?.id || order.cliente?.codigo}`;

    // 4. Name (Fallback - Normalized)
    const rawName = order.customerName || order.cliente?.nome || order.nome;
    if (rawName && rawName.length > 3 && rawName !== 'Cliente') {
        return `name_${normalizeName(rawName)}`;
    }

    return `unknown_${order.id || Math.random()}`;
}

/**
 * Extract customer name from order
 */
export function getCustomerName(order: any): string {
    return (
        order.customerName ||
        order.cliente_nome ||
        order.customer_name ||
        order.nome ||
        order.cliente?.nome ||
        order.raw?.cliente?.nome ||
        'Cliente'
    );
}

/**
 * Extract customer email from order
 */
export function getCustomerEmail(order: any): string {
    return (
        order.email ||
        order.cliente?.email ||
        order.raw?.cliente?.email ||
        order.customer_email ||
        ''
    );
}

/**
 * Extract customer phone from order
 */
export function getCustomerPhone(order: any): string {
    return (
        order.telefone ||
        order.cliente?.fone ||
        order.raw?.cliente?.fone ||
        order.phone ||
        order.phone ||
        ''
    );
}

/**
 * Extract customer CPF/CNPJ from order
 */
export function getCustomerCpf(order: any): string {
    const cpfCnpj =
        order.customerCpfCnpj ||
        order.cpf_cnpj ||
        order.cnpj ||
        order.cpf ||
        order.cliente?.cpf_cnpj ||
        order.cliente?.cnpj ||
        order.raw?.cliente?.cpf_cnpj ||
        order.raw?.cliente?.cnpj;

    if (cpfCnpj) {
        const normalized = cpfCnpj.toString().replace(/\D/g, '');
        if (normalized.length >= 11) {
            return normalized;
        }
    }
    return '';
}

/**
 * Parse order date to Date object
 */
export function parseOrderDate(order: any): Date {
    const dateStr = order.date || order.data_pedido || order.orderDate;
    if (!dateStr) return new Date();

    // Handle dd/MM/yyyy format
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    // Handle ISO format
    return parseISO(dateStr);
}

/**
 * Count first-time buyers in the period
 * This is the CORRECT way to calculate "Clientes Adquiridos"
 */
export function countFirstTimeBuyers(
    currentPeriodOrders: any[],
    historicalOrders: any[]
): number {
    // Build lookup indexes from historical data
    const existingCpfs = new Set<string>();
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();
    const existingIds = new Set<string>();

    historicalOrders.forEach(order => {
        const cpf = getCustomerCpf(order);
        if (cpf) existingCpfs.add(cpf);

        const email = getCustomerEmail(order);
        if (email) existingEmails.add(email.toLowerCase());

        const name = getCustomerName(order);
        if (name && name !== 'Cliente' && name.length > 3) {
            existingNames.add(normalizeName(name));
        }

        existingIds.add(getCustomerId(order));
    });

    // Count unique new customers in current period
    const newCustomerIds = new Set<string>();

    // We need to track *who* we've already counted as new/returning in this batch to avoid double counting
    const processedCurrentIds = new Set<string>();

    currentPeriodOrders.forEach(order => {
        const mainId = getCustomerId(order);

        if (processedCurrentIds.has(mainId)) return; // Already processed this customer
        processedCurrentIds.add(mainId);

        let isReturning = false;

        const cpf = getCustomerCpf(order);
        if (cpf && existingCpfs.has(cpf)) isReturning = true;

        if (!isReturning) {
            const email = getCustomerEmail(order);
            if (email && existingEmails.has(email.toLowerCase())) isReturning = true;
        }

        if (!isReturning) {
            const name = getCustomerName(order);
            if (name && name !== 'Cliente' && name.length > 3) {
                if (existingNames.has(normalizeName(name))) isReturning = true;
            }
        }

        if (!isReturning && existingIds.has(mainId)) isReturning = true;

        if (!isReturning) {
            newCustomerIds.add(mainId);
        }
    });

    return newCustomerIds.size;
}

export function calculateRevenueSegmentation(
    currentPeriodOrders: any[],
    historicalOrders: any[]
): CustomerSegmentation {
    // 1. Build Historical Indexes (Multi-Key)
    const existingCpfs = new Set<string>();
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();
    const existingIds = new Set<string>();

    historicalOrders.forEach(order => {
        // IMPROVED: Strict normalization for index
        const cpf = getCustomerCpf(order);
        if (cpf && cpf.length >= 11) existingCpfs.add(cpf); // Only add valid-looking CPFs

        const email = getCustomerEmail(order);
        if (email && email.includes('@')) existingEmails.add(email.toLowerCase().trim());

        const name = getCustomerName(order);
        if (name && name !== 'Cliente' && name.length > 3) {
            existingNames.add(normalizeName(name));
        }

        existingIds.add(getCustomerId(order));
    });

    console.log(`[Segmentation Debug] Historical Indexes Built: CPFs=${existingCpfs.size}, Emails=${existingEmails.size}, Names=${existingNames.size}`);

    // Debug: Show sample normalized names
    const sampleNames = Array.from(existingNames).slice(0, 5);
    console.log(`[Segmentation Debug] Sample normalized names: ${sampleNames.join(', ')}`);

    let newRevenue = 0;
    let retentionRevenue = 0;
    const newCustomerIds = new Set<string>();
    const returningCustomerIds = new Set<string>();

    // Debug counters
    let matchByCpf = 0;
    let matchByEmail = 0;
    let matchByName = 0;
    let matchById = 0;

    currentPeriodOrders.forEach(order => {
        const orderValue = order.total || 0;
        const mainId = getCustomerId(order);

        let isReturning = false;

        // Check CPF (Primary Match)
        const cpf = getCustomerCpf(order);
        if (cpf && existingCpfs.has(cpf)) {
            isReturning = true;
            matchByCpf++;
        }

        // Check Email (Secondary Match)
        if (!isReturning) {
            const email = getCustomerEmail(order);
            if (email && existingEmails.has(email.toLowerCase().trim())) {
                isReturning = true;
                matchByEmail++;
            }
        }

        // Check Name (Fallback Match)
        if (!isReturning) {
            const name = getCustomerName(order);
            if (name && name !== 'Cliente' && name.length > 3) {
                if (existingNames.has(normalizeName(name))) {
                    isReturning = true;
                    matchByName++;
                }
            }
        }

        // Check ID (Legacy Match)
        if (!isReturning && existingIds.has(mainId)) {
            isReturning = true;
            matchById++;
        }

        if (isReturning) {
            retentionRevenue += orderValue;
            returningCustomerIds.add(mainId);
        } else {
            newRevenue += orderValue;
            newCustomerIds.add(mainId);
        }
    });

    console.log(`[Segmentation] 🔢 Match Analysis: CPF=${matchByCpf}, Email=${matchByEmail}, Name=${matchByName}, ID=${matchById}`);
    console.log(`[Segmentation]    Total Current Orders: ${currentPeriodOrders.length}, Classified Returning: ${matchByCpf + matchByEmail + matchByName + matchById}`);

    return {
        newRevenue,
        retentionRevenue,
        newCustomersCount: newCustomerIds.size,
        returningCustomersCount: returningCustomerIds.size
    };
}

/**
 * Get unique customer count from orders
 */
export function getUniqueCustomerCount(orders: any[]): number {
    const uniqueCustomers = new Set<string>();
    orders.forEach(order => {
        const customerId = getCustomerId(order);
        if (customerId) uniqueCustomers.add(customerId);
    });
    return uniqueCustomers.size;
}

/**
 * Calculate RFM scores for all customers
 * R = Days since last purchase (lower is better)
 * F = Number of orders (higher is better)
 * M = Total monetary value (higher is better)
 */
export function calculateRFM(orders: any[]): RFMScore[] {
    const today = new Date();

    // Group orders by customer
    const customerData = new Map<string, {
        name: string;
        email: string;
        phone: string;
        lastOrderDate: Date;
        orderCount: number;
        totalSpent: number;
    }>();

    orders.forEach(order => {
        const customerId = getCustomerId(order);
        const orderDate = parseOrderDate(order);
        const orderValue = order.total || 0;

        if (!customerData.has(customerId)) {
            customerData.set(customerId, {
                name: getCustomerName(order),
                email: getCustomerEmail(order),
                phone: getCustomerPhone(order),
                lastOrderDate: orderDate,
                orderCount: 0,
                totalSpent: 0
            });
        }

        const data = customerData.get(customerId)!;
        data.orderCount++;
        data.totalSpent += orderValue;
        if (orderDate > data.lastOrderDate) {
            data.lastOrderDate = orderDate;
        }
    });

    // Convert to RFM data
    const rfmData: RFMScore[] = Array.from(customerData.entries()).map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        email: data.email,
        recency: differenceInDays(today, data.lastOrderDate),
        frequency: data.orderCount,
        monetary: data.totalSpent,
        R: 0, // Calculated below
        F: 0,
        M: 0,
        ticketAvg: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0
    }));

    // Calculate quantiles (1-4 scores)
    const recencyValues = rfmData.map(r => r.recency).sort((a, b) => a - b);
    const frequencyValues = rfmData.map(r => r.frequency).sort((a, b) => a - b);
    const monetaryValues = rfmData.map(r => r.monetary).sort((a, b) => a - b);

    rfmData.forEach(customer => {
        // For Recency: lower is better, so we invert the score
        customer.R = 5 - getQuartile(customer.recency, recencyValues);
        // For Frequency and Monetary: higher is better
        customer.F = getQuartile(customer.frequency, frequencyValues);
        customer.M = getQuartile(customer.monetary, monetaryValues);

        // Ensure scores are in 1-4 range
        customer.R = Math.max(1, Math.min(4, customer.R));
        customer.F = Math.max(1, Math.min(4, customer.F));
        customer.M = Math.max(1, Math.min(4, customer.M));
    });

    return rfmData;
}

/**
 * Helper: Get quartile (1-4) for a value in sorted array
 */
function getQuartile(value: number, sortedArray: number[]): number {
    const n = sortedArray.length;
    if (n === 0) return 2;

    const index = sortedArray.findIndex(v => v >= value);
    const position = index === -1 ? n : index;
    const percentile = position / n;

    if (percentile <= 0.25) return 1;
    if (percentile <= 0.50) return 2;
    if (percentile <= 0.75) return 3;
    return 4;
}

/**
 * Merge orders from multiple sources (Tiny + Wake), removing duplicates
 */
export function mergeOrders(tinyOrders: any[], wakeOrders: any[]): any[] {
    const orderMap = new Map<string, any>();

    // Add Tiny orders
    tinyOrders.forEach(order => {
        const id = order.id || order.numero;
        if (id) orderMap.set(`tiny_${id}`, order);
    });

    // Add Wake orders (may have different ID format)
    wakeOrders.forEach(order => {
        const id = order.id || order.pedidoId || order.numero;
        if (id) orderMap.set(`wake_${id}`, order);
    });

    return Array.from(orderMap.values());
}
