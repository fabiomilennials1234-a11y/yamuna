# Estoque & Demanda — Gráficos de Estoque

**Data:** 2026-04-10
**Status:** Aprovado

## Objetivo

Adicionar visualizações gráficas à página `/estoque` existente, mostrando estoque geral de todos os produtos e permitindo drill-down em produto específico. A página mantém o layout de scroll contínuo: cards de resumo → gráficos → tabela.

## Decisões de Design

- **Layout:** Scroll contínuo na mesma página `/estoque` — cards (existentes), gráficos (novos), tabela (existente)
- **Filtro por produto:** Combobox com busca no topo + clique direto nos gráficos como atalho
- **Evolução temporal:** Snapshots diários de estoque salvos no Supabase (acumulam ao longo do tempo) + dados de vendas existentes como proxy imediato
- **Biblioteca:** Recharts (já no projeto) com wrapper shadcn `ChartContainer`/`ChartConfig`

## Gráficos

### 1. Estoque Atual vs Demanda Mensal

- **Tipo:** `ComposedChart` — barras verticais + linha
- **Barras:** Estoque atual de cada produto, coloridas por status (vermelho=crítico, amarelo=atenção, verde=saudável)
- **Linha:** Média de vendas/mês sobreposta (tracejada, cor indigo)
- **Interação:** Clique na barra seleciona o produto em todos os gráficos
- **Dados:** `StockOverviewData.items` (já disponível via `fetchStockOverview`)
- **Modo geral:** Top 15 produtos ordenados por receita
- **Modo produto:** Destaca a barra selecionada, esmaece as demais

### 2. Cobertura de Estoque (dias)

- **Tipo:** `BarChart` layout=vertical — barras horizontais
- **Barras:** Dias de cobertura por produto, coloridas por status
- **Marcadores:** Linhas de referência em 15d (crítico) e 45d (atenção)
- **Interação:** Clique na barra seleciona o produto
- **Dados:** `StockOverviewData.items` (campo `coverageDays`)
- **Modo geral:** Todos os produtos ordenados por cobertura (críticos primeiro)
- **Modo produto:** Mostra apenas o produto selecionado com destaque

### 3. Evolução Temporal

- **Tipo:** `ComposedChart` — `Area` (vendas) + `Scatter` ou `Line` (snapshots de estoque)
- **Área:** Vendas mensais (gradiente indigo), dados existentes via `getTopProductsByPeriod`
- **Pontos/Linha:** Snapshots de estoque do Supabase (verde), acumulam a partir da implementação
- **Interação:** Selector geral/produto no header do card
- **Modo geral:** Soma total de estoque + vendas agregadas
- **Modo produto:** Série individual do SKU selecionado

## Data Layer

### Nova tabela Supabase: `stock_snapshots`

```sql
CREATE TABLE stock_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  stock_level INTEGER NOT NULL,
  avg_monthly_sales INTEGER NOT NULL DEFAULT 0,
  coverage_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown',
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_stock_snapshots_sku_date ON stock_snapshots (sku, snapshot_date);
CREATE INDEX idx_stock_snapshots_date ON stock_snapshots (snapshot_date);
```

### Fluxo de captura (warmup)

1. No `instrumentation-warmup.ts`, step 4 após produtos: `saveStockSnapshots()`
2. Chama `fetchStockOverview()` (já retorna estoque, cobertura, status)
3. Upsert batch em `stock_snapshots` — um registro por SKU por dia
4. Controle: só executa se último snapshot do dia não existe (evita duplicatas)
5. Frequência: roda junto do warmup principal (1x/hora), mas só insere 1x/dia

### Novo service: `src/lib/services/stock-snapshots.ts`

Responsabilidades:
- `saveStockSnapshots(items: StockOverviewItem[])` — upsert batch no Supabase
- `getStockHistory(sku?: string, months?: number)` — query série temporal
- `getLastSnapshotDate()` — verifica se já salvou hoje

### Nova server action em `stock-actions.ts`

- `fetchStockHistory(sku?: string, months?: number)` — combina dados de `stock_snapshots` + vendas por período

Retorna:
```typescript
interface StockHistoryData {
  timeline: Array<{
    date: string;          // YYYY-MM-DD
    salesQuantity: number; // vendas no período (sempre disponível)
    stockLevel: number | null; // snapshot (null se não existe ainda)
  }>;
  hasSnapshots: boolean;   // indica se já tem dados de snapshot acumulados
}
```

## Componentes

### Novo: `src/components/dashboard/stock-charts.tsx`

Client component container com:

- **Estado:** `selectedProduct: string | null` (null = modo geral)
- **`ProductCombobox`** — shadcn Combobox com busca, lista os produtos do `StockOverviewData`
- **`StockVsDemandChart`** — `ComposedChart` (barras + linha)
- **`CoverageChart`** — `BarChart` horizontal
- **`StockTimelineChart`** — `ComposedChart` (área + scatter/line)

Todos sub-componentes recebem `selectedProduct` e `onProductSelect` callback.

### Novo: `src/components/dashboard/stock-page-client.tsx`

Client wrapper que gerencia o estado compartilhado `selectedProduct` entre gráficos e tabela. A page server component faz os fetches e passa os dados pra esse wrapper, que renderiza `StockCharts` + `StockTable` com estado sincronizado.

### Modificado: `src/app/(dashboard)/estoque/page.tsx`

- Adiciona chamada a `fetchStockHistory()` em paralelo com `fetchStockOverview()`
- Renderiza `StockPageClient` (novo wrapper) em vez de `StockTable` direto
- Server component: só faz data fetching, delega renderização pro client wrapper

### Modificado: `src/components/dashboard/stock-table.tsx`

- Aceita prop `selectedProduct` para highlight da row + scroll automático
- Aceita prop `onProductClick` callback que propaga seleção para os gráficos

### Modificado: `src/instrumentation-warmup.ts`

- Adiciona step 4: `saveStockSnapshots()` após fetch de produtos
- Controle: verifica `getLastSnapshotDate()` antes de executar

## Interação de Seleção de Produto

```
ProductCombobox → setSelectedProduct(sku)
                    ↓
    ┌───────────────┼───────────────────┐
    ↓               ↓                   ↓
StockVsDemand   CoverageChart    TimelineChart
(destaca barra) (destaca barra)  (filtra série)
    ↓               ↓
    └───── onClick → setSelectedProduct(sku)
                    ↓
              StockTable
         (highlight row + scroll)
```

Botão "Limpar filtro" ao lado do combobox → `setSelectedProduct(null)` → volta ao modo geral.

## Padrões e Convenções

- Recharts via `ChartContainer` + `ChartConfig` (shadcn, padrão existente)
- Dark-first: fundos `#050510`, bordas `#1e293b`, texto `slate-300/400`
- Cores de status: `#ef4444` (crítico), `#f59e0b` (atenção), `#10b981` (saudável), `#818cf8` (indigo, linhas/áreas)
- Cache: `fetchStockHistory` usa `CACHE_TTL.HOUR`
- Server actions com `"use server"`
