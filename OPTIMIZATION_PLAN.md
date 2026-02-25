# 🚀 Plano de Otimização - Dashboard Yamuna

**Data:** 10/12/2024  
**Objetivo:** Acelerar carregamento, corrigir cálculos e garantir precisão das métricas

---

## 📋 RESUMO EXECUTIVO

### Problemas Identificados

| Categoria | Problema | Impacto | Prioridade |
|-----------|----------|---------|------------|
| **Performance** | Múltiplas chamadas API paralelas sem cache | Alto | 🔴 Crítico |
| **Performance** | `force-dynamic` em todas as páginas | Alto | 🔴 Crítico |
| **Performance** | Fetch de 12 meses a cada request | Alto | 🔴 Crítico |
| **Cálculos** | LTV usando `totalUsers` ao invés de `purchasers` | Médio | 🟡 Importante |
| **Cálculos** | Clientes Adquiridos = Total Users (incorreto) | Alto | 🔴 Crítico |
| **Cálculos** | Retenção calculada por ratio de newUsers | Médio | 🟡 Importante |
| **Arquitetura** | Sem camada de cache (Redis/Upstash) | Alto | 🔴 Crítico |
| **Integrações** | Wake API não está sendo usada nos cálculos | Médio | 🟡 Importante |
| **Google Ads** | Página com dados hardcoded (zeros) | Alto | 🔴 Crítico |

---

## 🔧 SEÇÃO 1: CORREÇÃO DOS CÁLCULOS

### 1.1 Métricas Financeiras (Conforme PDF)

```typescript
// ❌ ATUAL (INCORRETO)
const acquiredCustomers = googleData?.purchasers || 0; // Usa totalUsers!

// ✅ CORRETO (Conforme PDF)
// Clientes Adquiridos = COUNT(distinct customer_id WHERE first_order_date = período)
// Fonte: Tiny + Wake (primeira compra no período)
```

**Fórmulas Corretas a Implementar:**

```typescript
// === INVESTIMENTO ===
// Investimento_total = MetaAds.cost + GoogleAds.cost
const totalInvestment = metaAdsCost + googleAdsCost;

// === CLIENTES ADQUIRIDOS ===
// Contagem de PRIMEIRAS compras no período (Tiny + Wake)
// PROBLEMA: Hoje usa GA4 totalUsers, que inclui visitantes sem compra
const acquiredCustomers = countFirstTimeBuyers(tinyOrders, wakeOrders, startDate, endDate);

// === CAC ===
// CAC = Investimento_total / Clientes_Adquiridos
const cac = acquiredCustomers > 0 ? totalInvestment / acquiredCustomers : 0;

// === TICKET MÉDIO ===
// Ticket_medio = Faturamento / Número_de_pedidos
const ticketAvg = totalOrders > 0 ? totalRevenue / totalOrders : 0;

// === LTV 12 MESES ===
// LTV = SUM(receita_cliente_12m) / total_clientes_ativos_12m
// PROBLEMA: Hoje usa purchasers (que é totalUsers do GA4)
const ltv12m = uniqueCustomers12m > 0 ? revenue12m / uniqueCustomers12m : 0;

// === ROI 12 MESES ===
// ROI = (Faturamento_12m - Investimento_12m) / Investimento_12m * 100
const roi12m = cost12m > 0 ? ((revenue12m - cost12m) / cost12m) * 100 : 0;

// === RETENÇÃO ===
// Retenção = Receita_Retida / Receita_Total
// Receita Retida = Receita de clientes que JÁ compraram antes
// PROBLEMA: Hoje usa estimativa baseada em newUsers ratio

// === RECEITA NOVA ===
// Receita_Nova = SUM(receita WHERE cliente_primeira_compra == período)
```

### 1.2 Taxas do Funil (GA4 + ERP)

```typescript
// === TAXAS DO FUNIL ===
const taxaPedidos = sessions > 0 ? (pedidos / sessions) * 100 : 0;
const taxaCheckout = sessions > 0 ? (checkouts / sessions) * 100 : 0;
const taxaCarrinho = sessions > 0 ? (addToCart / sessions) * 100 : 0;
const taxaConversao = sessions > 0 ? (purchases / sessions) * 100 : 0;
const sessoesPorCarrinho = addToCart > 0 ? sessions / addToCart : 0;
```

### 1.3 Meta Ads (Por Campanha)

```typescript
// CTR = cliques / impressões * 100
const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

// CPC = custo / cliques
const cpc = clicks > 0 ? cost / clicks : 0;

// Custo por compra = custo / compras
const costPerPurchase = purchases > 0 ? cost / purchases : 0;

// ROAS = receita / custo
const roas = cost > 0 ? revenue / cost : 0;
```

### 1.4 Google Ads (Por Campanha/Palavra-chave)

```typescript
// CTR = cliques / impressões * 100
const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

// CPC = custo / cliques  
const cpc = clicks > 0 ? cost / clicks : 0;

// ROAS = receita / custo
const roas = cost > 0 ? revenue / cost : 0;
```

### 1.5 Curva ABC (Tiny)

```typescript
// Ordenar produtos por receita DESC
// %Acumulado = SUM(receita_itens_anteriores) / ReceitaTotal * 100
// A = 0-80%, B = 80-95%, C = 95-100%
function calculateABC(products: Product[]) {
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  let accumulated = 0;
  
  return products
    .sort((a, b) => b.revenue - a.revenue)
    .map(p => {
      accumulated += p.revenue;
      const percentage = (accumulated / totalRevenue) * 100;
      const classification = percentage <= 80 ? 'A' : percentage <= 95 ? 'B' : 'C';
      return { ...p, accumulatedPercentage: percentage, classification };
    });
}
```

### 1.6 RFM (Recência, Frequência, Monetário)

```typescript
interface RFMScore {
  customerId: string;
  recency: number;      // Dias desde última compra
  frequency: number;    // Total de compras
  monetary: number;     // Total gasto
  R: number;           // Score 1-4 (quantil)
  F: number;           // Score 1-4 (quantil)
  M: number;           // Score 1-4 (quantil)
}

function calculateRFM(customers: Customer[]): RFMScore[] {
  // 1. Calcular R, F, M brutos
  const rfmData = customers.map(c => ({
    customerId: c.id,
    recency: differenceInDays(new Date(), new Date(c.lastOrderDate)),
    frequency: c.orderCount,
    monetary: c.totalSpent
  }));
  
  // 2. Calcular quantis (dividir em 4 grupos)
  // R: Menor recência = melhor = score 4
  // F: Maior frequência = melhor = score 4
  // M: Maior monetário = melhor = score 4
  
  return rfmData.map(r => ({
    ...r,
    R: calculateQuantile(rfmData, 'recency', r.recency, true),  // invertido
    F: calculateQuantile(rfmData, 'frequency', r.frequency, false),
    M: calculateQuantile(rfmData, 'monetary', r.monetary, false)
  }));
}
```

---

## 🏗️ SEÇÃO 2: ARQUITETURA RECOMENDADA

### 2.1 Arquitetura Atual (Problemática)

```
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │ Request
         ▼
┌─────────────────┐
│   Next.js SSR   │ ← force-dynamic (sem cache)
│   Page.tsx      │
└────────┬────────┘
         │ Parallel Fetch (NO CACHE)
         ▼
┌─────────────────────────────────────────────┐
│  API Calls (a cada request)                 │
│  ├── GA4 API (4 requests)                   │
│  ├── Tiny API (5+ páginas, ~500 pedidos)    │
│  ├── Meta Ads API                            │
│  ├── Wake API                                │
│  └── MAIS: 12 meses, mês anterior...        │
└─────────────────────────────────────────────┘
```

**Problema:** ~15+ chamadas de API por request do usuário!

### 2.2 Arquitetura Proposta

```
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Next.js       │
│   ISR/SSG       │ ← revalidate: 300 (5 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Redis/Upstash │ ← Cache Layer
│   (Edge)        │
└────────┬────────┘
         │ Cache Miss?
         ▼
┌─────────────────┐
│   ETL Worker    │ ← Cron Job (5-15 min)
│   (Background)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  APIs Externas                               │
│  ├── GA4 API                                 │
│  ├── Tiny API                                │
│  ├── Meta Ads API                            │
│  └── Wake API                                │
└─────────────────────────────────────────────┘
```

---

## ⚡ SEÇÃO 3: OTIMIZAÇÕES DE PERFORMANCE

### 3.1 Cache Strategy por Tipo de Dado

| Dado | TTL | Estratégia | Justificativa |
|------|-----|------------|---------------|
| Métricas 12 meses | 1 hora | Redis + ISR | Dados históricos, mudam lentamente |
| Métricas mês atual | 5 min | Redis + SWR | Atualização moderada |
| Campanhas Meta/Google | 15 min | Redis | APIs lentas, dados semi-estáticos |
| Funil (sessões, cart) | 5 min | SWR | Dados dinâmicos importantes |
| RFM/ABC | 1 hora | Redis | Cálculo pesado, dados estáveis |
| Pedidos Tiny (período) | 5 min | Redis | Depende do filtro de data |

### 3.2 Implementação de Cache (Upstash Redis)

```typescript
// src/lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached) {
    console.log(`[Cache] ✅ HIT: ${key}`);
    return cached;
  }
  
  // Fetch and cache
  console.log(`[Cache] ❌ MISS: ${key}`);
  const data = await fetcher();
  await redis.setex(key, ttlSeconds, data);
  return data;
}
```

### 3.3 Lazy Loading de Componentes

```typescript
// Antes: Tudo carrega junto
import { FunnelOverview } from "@/components/charts/FunnelOverview";

// Depois: Lazy loading com Suspense
import dynamic from 'next/dynamic';

const FunnelOverview = dynamic(
  () => import('@/components/charts/FunnelOverview').then(m => m.FunnelOverview),
  { 
    loading: () => <div className="h-[300px] animate-pulse bg-slate-800 rounded" />,
    ssr: false 
  }
);
```

### 3.4 Remover force-dynamic

```typescript
// ❌ ATUAL
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ RECOMENDADO
export const revalidate = 300; // 5 minutos
// Ou usar ISR com tags
export const revalidate = false; // ISR manual
```

### 3.5 Separar Dados por Frequência

```typescript
// Dashboard Principal: Só dados essenciais
async function fetchDashboardData(start: string, end: string) {
  return getCachedData(`dashboard:${start}:${end}`, async () => {
    // Só buscar métricas do período selecionado
    const [google, tiny, meta] = await Promise.all([
      getGA4Data(start, end),
      getTinyOrders(start, end),
      getMetaInsights(start, end)
    ]);
    return calculateMetrics(google, tiny, meta);
  }, 300);
}

// Dados 12 meses: Endpoint separado, cache longo
async function fetch12MonthData() {
  return getCachedData('metrics:12m', async () => {
    // ... buscar e calcular
  }, 3600); // 1 hora
}
```

---

## 📊 SEÇÃO 4: MODELO DE DADOS CONSOLIDADO

### 4.1 Schema Unificado

```typescript
// src/types/metrics.ts

interface DashboardMetrics {
  // Período selecionado
  period: {
    start: string;
    end: string;
  };
  
  // Métricas Financeiras
  financial: {
    investment: number;        // Meta + Google Ads
    revenue: number;           // Tiny (source of truth)
    costPercentage: number;    // investment / revenue * 100
    roi: number;               // (revenue - investment) / investment * 100
  };
  
  // Vendas
  sales: {
    totalOrders: number;
    ticketAvg: number;
    ticketAvgNew: number;
    retentionRevenue: number;
    newRevenue: number;
  };
  
  // Clientes
  customers: {
    acquired: number;          // Primeiras compras no período
    cac: number;               // investment / acquired
    ltv12m: number;            // revenue12m / customers12m
  };
  
  // Funil
  funnel: {
    sessions: number;
    productsViewed: number;
    addToCarts: number;
    checkouts: number;
    transactions: number;
    conversionRate: number;
  };
  
  // 12 Meses (cache separado)
  longTerm: {
    revenue12m: number;
    ltv12m: number;
    roi12m: number;
  };
}

interface Campaign {
  id: string;
  name: string;
  source: 'meta' | 'google';
  
  // Métricas
  impressions: number;
  clicks: number;
  cost: number;
  revenue: number;
  purchases: number;
  
  // Calculados
  ctr: number;      // clicks / impressions * 100
  cpc: number;      // cost / clicks
  roas: number;     // revenue / cost
  cpa: number;      // cost / purchases
}
```

---

## 📝 SEÇÃO 5: PLANO DE IMPLEMENTAÇÃO

### Fase 1: Cache e Performance (1-2 dias)
- [ ] Instalar Upstash Redis
- [ ] Criar `src/lib/cache.ts`
- [ ] Implementar cache em `actions.ts`
- [ ] Remover `force-dynamic` das páginas
- [ ] Separar fetch de 12 meses em endpoint próprio

### Fase 2: Correção de Cálculos (2-3 dias)
- [ ] Corrigir `acquiredCustomers` (usar Tiny, não GA4)
- [ ] Corrigir `ltv12m` (usar purchasers reais)
- [ ] Implementar Retenção correta (clientes recorrentes)
- [ ] Implementar Receita Nova correta
- [ ] Corrigir fórmulas do funil

### Fase 3: Integrações (2-3 dias)
- [ ] Integrar Wake nos cálculos (merge com Tiny)
- [ ] Implementar Google Ads API (página zerada)
- [ ] Normalizar dados entre fontes

### Fase 4: UI/UX (1-2 dias)
- [ ] Lazy loading de gráficos
- [ ] Loading states adequados
- [ ] Debounce em filtros de data

---

## ✅ CHECKLIST FINAL

### Performance
- [ ] Cache Redis implementado
- [ ] Revalidação ISR configurada
- [ ] Lazy loading de componentes pesados
- [ ] Payload de APIs otimizado

### Cálculos
- [ ] CAC = Investimento / Clientes Novos
- [ ] LTV = Receita 12m / Clientes Únicos 12m
- [ ] ROI = (Receita - Investimento) / Investimento
- [ ] Retenção = Receita Recorrente / Receita Total
- [ ] Taxas do funil baseadas em sessões

### Integrações
- [ ] Tiny + Wake consolidados
- [ ] GA4 + Meta + Google Ads precisos
- [ ] Dados normalizados

### Monitoramento
- [ ] Logs estruturados
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
