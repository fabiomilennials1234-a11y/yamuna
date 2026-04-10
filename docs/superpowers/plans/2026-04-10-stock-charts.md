# Stock Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive stock charts (Estoque vs Demanda, Cobertura, Evolução Temporal) to the `/estoque` page with product filtering, backed by daily Supabase snapshots for historical data.

**Architecture:** Server component fetches stock data + history, passes to a client wrapper (`StockPageClient`) that manages shared `selectedProduct` state between `StockCharts` (3 Recharts charts) and the existing `StockTable`. A new `stock_snapshots` Supabase table stores daily stock levels, populated by the existing warmup cron. Product filtering works via a searchable Select dropdown + click-on-chart.

**Tech Stack:** Next.js 14 App Router, Recharts (existing), shadcn/ui `ChartContainer`/`ChartConfig` (existing), Supabase (existing), TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-10-stock-charts-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/services/stock-snapshots.ts` | Create | Supabase CRUD for `stock_snapshots` table — upsert batch, query history, check last snapshot date |
| `src/app/stock-actions.ts` | Modify | Add `fetchStockHistory()` server action + `saveStockSnapshots()` |
| `src/components/dashboard/stock-charts.tsx` | Create | Client component with 3 Recharts charts + product search filter |
| `src/components/dashboard/stock-page-client.tsx` | Create | Client wrapper managing shared `selectedProduct` state between charts and table |
| `src/components/dashboard/stock-table.tsx` | Modify | Accept `selectedProduct` + `onProductClick` props |
| `src/app/(dashboard)/estoque/page.tsx` | Modify | Fetch history data, render `StockPageClient` wrapper |
| `src/instrumentation-warmup.ts` | Modify | Add step 4: save stock snapshots daily |

---

### Task 1: Create `stock_snapshots` Supabase Table

**Files:**
- Run SQL migration on Supabase project `ppnyrufzkicurwtyjtmr`

- [ ] **Step 1: Run the migration SQL on Supabase**

Open the Supabase SQL Editor for project `ppnyrufzkicurwtyjtmr` and run:

```sql
CREATE TABLE IF NOT EXISTS stock_snapshots (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_snapshots_sku_date
  ON stock_snapshots (sku, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_date
  ON stock_snapshots (snapshot_date);

-- Enable RLS but allow service-role full access
ALTER TABLE stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read stock_snapshots"
  ON stock_snapshots FOR SELECT
  TO anon USING (true);

CREATE POLICY "Allow anon insert stock_snapshots"
  ON stock_snapshots FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update stock_snapshots"
  ON stock_snapshots FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Verify the table was created**

Run in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_snapshots'
ORDER BY ordinal_position;
```

Expected: 9 columns (id, sku, product_name, stock_level, avg_monthly_sales, coverage_days, status, snapshot_date, created_at).

- [ ] **Step 3: Commit a note about the migration**

No code to commit — this is a manual Supabase step. Proceed to next task.

---

### Task 2: Create `stock-snapshots.ts` Service

**Files:**
- Create: `src/lib/services/stock-snapshots.ts`

- [ ] **Step 1: Create the stock snapshots service**

```typescript
// src/lib/services/stock-snapshots.ts
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    )
    : null;

export interface StockSnapshotRow {
    sku: string;
    product_name: string;
    stock_level: number;
    avg_monthly_sales: number;
    coverage_days: number;
    status: string;
    snapshot_date: string;
}

/**
 * Check if snapshots have already been saved today.
 * Returns the latest snapshot_date or null.
 */
export async function getLastSnapshotDate(): Promise<string | null> {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('snapshot_date')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;
        return data.snapshot_date;
    } catch {
        return null;
    }
}

/**
 * Upsert stock snapshot rows for today.
 * Uses ON CONFLICT (sku, snapshot_date) to avoid duplicates.
 */
export async function saveStockSnapshots(
    items: Array<{
        code: string;
        name: string;
        currentStock: number;
        avgMonthlySales: number;
        coverageDays: number;
        status: string;
    }>
): Promise<number> {
    if (!supabase || items.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];

    const rows: StockSnapshotRow[] = items
        .filter(item => item.code && item.code !== 'N/A')
        .map(item => ({
            sku: item.code,
            product_name: item.name,
            stock_level: item.currentStock,
            avg_monthly_sales: item.avgMonthlySales,
            coverage_days: Math.min(item.coverageDays, 999),
            status: item.status,
            snapshot_date: today,
        }));

    try {
        const { error } = await supabase
            .from('stock_snapshots')
            .upsert(rows, { onConflict: 'sku,snapshot_date' });

        if (error) {
            console.error('[StockSnapshots] Upsert error:', error.message);
            return 0;
        }

        console.log(`[StockSnapshots] Saved ${rows.length} snapshots for ${today}`);
        return rows.length;
    } catch (err) {
        console.error('[StockSnapshots] Error:', err);
        return 0;
    }
}

/**
 * Query stock history for timeline chart.
 * If sku is provided, returns series for that product.
 * If not, returns aggregated totals per date.
 */
export async function getStockHistory(
    sku?: string,
    months: number = 6
): Promise<StockSnapshotRow[]> {
    if (!supabase) return [];

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    try {
        let query = supabase
            .from('stock_snapshots')
            .select('sku, product_name, stock_level, avg_monthly_sales, coverage_days, status, snapshot_date')
            .gte('snapshot_date', cutoffStr)
            .order('snapshot_date', { ascending: true });

        if (sku) {
            query = query.eq('sku', sku);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[StockSnapshots] Query error:', error.message);
            return [];
        }

        return (data as StockSnapshotRow[]) || [];
    } catch {
        return [];
    }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx tsc --noEmit src/lib/services/stock-snapshots.ts 2>&1 | head -20`

If there are import issues with the project's tsconfig, verify with:

Run: `npx next build --no-lint 2>&1 | tail -20`

Expected: No TypeScript errors in `stock-snapshots.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/stock-snapshots.ts
git commit -m "feat(stock): add stock-snapshots Supabase service for daily snapshot CRUD"
```

---

### Task 3: Add `fetchStockHistory` Server Action

**Files:**
- Modify: `src/app/stock-actions.ts`

This task adds the `fetchStockHistory()` server action and the `saveStockSnapshotsFromOverview()` wrapper used by warmup.

- [ ] **Step 1: Add imports and types at the top of `stock-actions.ts`**

After the existing imports, add:

```typescript
import { getStockHistory, saveStockSnapshots, getLastSnapshotDate } from "@/lib/services/stock-snapshots";
```

Add the new interface after `StockOverviewData`:

```typescript
export interface StockHistoryPoint {
    date: string;
    salesQuantity: number;
    stockLevel: number | null;
}

export interface StockHistoryData {
    timeline: StockHistoryPoint[];
    hasSnapshots: boolean;
}
```

- [ ] **Step 2: Add `fetchStockHistory` function at the bottom of the file**

After the existing `fetchStockOverview` function, add:

```typescript
/**
 * Fetch stock history for timeline chart.
 * Combines: stock snapshots (Supabase) + sales data (Tiny).
 * If sku is provided, returns data for that specific product.
 */
export async function fetchStockHistory(
    sku?: string,
    months: number = 6
): Promise<StockHistoryData> {
    const cacheKey = `stock:history:v1:${sku || 'all'}:${months}`;
    return withCache(cacheKey, async () => {
        const snapshots = await getStockHistory(sku, months);

        // Group snapshots by date
        const byDate = new Map<string, { stockLevel: number; salesQty: number }>();

        for (const snap of snapshots) {
            const existing = byDate.get(snap.snapshot_date);
            if (sku) {
                // Single product: direct values
                byDate.set(snap.snapshot_date, {
                    stockLevel: snap.stock_level,
                    salesQty: snap.avg_monthly_sales,
                });
            } else {
                // Aggregate: sum across all SKUs
                byDate.set(snap.snapshot_date, {
                    stockLevel: (existing?.stockLevel || 0) + snap.stock_level,
                    salesQty: (existing?.salesQty || 0) + snap.avg_monthly_sales,
                });
            }
        }

        const timeline: StockHistoryPoint[] = Array.from(byDate.entries())
            .map(([date, vals]) => ({
                date,
                salesQuantity: vals.salesQty,
                stockLevel: vals.stockLevel,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            timeline,
            hasSnapshots: snapshots.length > 0,
        };
    }, CACHE_TTL.HOUR);
}

/**
 * Save current stock data as daily snapshots.
 * Called by warmup — only saves once per day.
 */
export async function saveStockSnapshotsFromOverview(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = await getLastSnapshotDate();

    if (lastDate === today) {
        console.log(`[StockSnapshots] Already saved today (${today}), skipping`);
        return;
    }

    console.log(`[StockSnapshots] Saving daily snapshots for ${today}...`);
    const overview = await fetchStockOverview("30daysAgo", "today", 50);

    const saved = await saveStockSnapshots(overview.items);
    console.log(`[StockSnapshots] Done: ${saved} snapshots saved`);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/stock-actions.ts
git commit -m "feat(stock): add fetchStockHistory + saveStockSnapshotsFromOverview actions"
```

---

### Task 4: Add Snapshot Step to Warmup

**Files:**
- Modify: `src/instrumentation-warmup.ts`

- [ ] **Step 1: Add stock snapshot step to `runMainWarmup`**

In `src/instrumentation-warmup.ts`, inside the `runMainWarmup` function, add the import after the existing dynamic imports (line ~17):

```typescript
const { saveStockSnapshotsFromOverview } = await import("@/app/stock-actions");
```

Add a 4th step to the `steps` array (after the "Produtos" step):

```typescript
{
  name: "Stock Snapshots",
  fn: () => saveStockSnapshotsFromOverview(),
},
```

Update the success log template from `${ok}/3 ok` to `${ok}/${steps.length} ok`.

- [ ] **Step 2: Verify it compiles**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/instrumentation-warmup.ts
git commit -m "feat(stock): add daily stock snapshot to warmup cron"
```

---

### Task 5: Create `StockCharts` Component

**Files:**
- Create: `src/components/dashboard/stock-charts.tsx`

This is the main chart component containing all 3 charts + product search.

- [ ] **Step 1: Create the stock charts component**

```typescript
// src/components/dashboard/stock-charts.tsx
"use client";

import { useMemo } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    BarChart, Cell, ReferenceLine, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import type { StockOverviewData, StockOverviewItem, StockHistoryData } from "@/app/stock-actions";

/* ── Chart Configs ─────────────────────────────────────────── */

const stockDemandConfig = {
    stock: { label: "Estoque Atual", color: "hsl(142 76% 36%)" },
    avgSales: { label: "Média Vendas/Mês", color: "hsl(234 89% 74%)" },
};

const coverageConfig = {
    coverage: { label: "Cobertura (dias)", color: "hsl(142 76% 36%)" },
};

const timelineConfig = {
    salesQuantity: { label: "Vendas Mensais", color: "hsl(234 89% 74%)" },
    stockLevel: { label: "Estoque (snapshot)", color: "hsl(142 76% 36%)" },
};

/* ── Status Colors ─────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    ok: "#10b981",
    unknown: "#64748b",
};

/* ── Props ─────────────────────────────────────────────────── */

interface StockChartsProps {
    data: StockOverviewData;
    history: StockHistoryData;
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}

/* ── Main Component ────────────────────────────────────────── */

export function StockCharts({ data, history, selectedProduct, onProductSelect }: StockChartsProps) {
    // Product list for the search dropdown
    const productList = useMemo(() =>
        data.items.map(item => ({ code: item.code, name: item.name })),
        [data.items]
    );

    return (
        <div className="space-y-4">
            {/* Product Search Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <Select
                        value={selectedProduct || "__all__"}
                        onValueChange={(v) => onProductSelect(v === "__all__" ? null : v)}
                    >
                        <SelectTrigger className="pl-9 bg-[#050510] border-white/10">
                            <SelectValue placeholder="Buscar produto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="__all__">Todos os produtos</SelectItem>
                            {productList.map(p => (
                                <SelectItem key={p.code} value={p.code}>
                                    <span className="font-mono text-xs text-slate-500 mr-2">{p.code}</span>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedProduct && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-slate-400 hover:text-white"
                        onClick={() => onProductSelect(null)}
                    >
                        <X size={14} className="mr-1" />
                        Limpar filtro
                    </Button>
                )}
            </div>

            {/* Chart 1: Estoque vs Demanda */}
            <StockVsDemandChart
                items={data.items}
                selectedProduct={selectedProduct}
                onProductSelect={onProductSelect}
            />

            {/* Chart 2: Cobertura de Estoque */}
            <CoverageChart
                items={data.items}
                selectedProduct={selectedProduct}
                onProductSelect={onProductSelect}
            />

            {/* Chart 3: Evolução Temporal */}
            <StockTimelineChart
                history={history}
                selectedProduct={selectedProduct}
            />
        </div>
    );
}

/* ── Chart 1: Estoque Atual vs Demanda Mensal ──────────────── */

function StockVsDemandChart({
    items,
    selectedProduct,
    onProductSelect,
}: {
    items: StockOverviewItem[];
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}) {
    const chartData = useMemo(() => {
        const sorted = [...items]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 15);

        return sorted.map(item => ({
            name: item.name.length > 18 ? item.name.substring(0, 18) + '…' : item.name,
            fullName: item.name,
            code: item.code,
            stock: item.currentStock,
            avgSales: item.avgMonthlySales,
            status: item.status,
            isSelected: selectedProduct === item.code,
        }));
    }, [items, selectedProduct]);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">
                            Estoque Atual vs Demanda Mensal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Barras = estoque atual | Linha = média de vendas/mês
                        </p>
                    </div>
                    <span className="text-xs text-muted-foreground">Top 15 por receita</span>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={stockDemandConfig} className="h-[280px] w-full">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis
                            yAxisId="left"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullName || '';
                                    }}
                                />
                            }
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="stock"
                            radius={[4, 4, 0, 0]}
                            onClick={(entry) => {
                                if (entry?.code) {
                                    onProductSelect(
                                        selectedProduct === entry.code ? null : entry.code
                                    );
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((entry, idx) => (
                                <Cell
                                    key={idx}
                                    fill={STATUS_COLORS[entry.status] || STATUS_COLORS.unknown}
                                    opacity={selectedProduct && !entry.isSelected ? 0.25 : 1}
                                />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="left"
                            dataKey="avgSales"
                            type="monotone"
                            stroke="var(--color-avgSales)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </ComposedChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ── Chart 2: Cobertura de Estoque (Horizontal Bars) ───────── */

function CoverageChart({
    items,
    selectedProduct,
    onProductSelect,
}: {
    items: StockOverviewItem[];
    selectedProduct: string | null;
    onProductSelect: (sku: string | null) => void;
}) {
    const chartData = useMemo(() => {
        const filtered = items
            .filter(item => item.coverageDays < 999 && item.coverageDays > 0)
            .sort((a, b) => a.coverageDays - b.coverageDays)
            .slice(0, 20);

        return filtered.map(item => ({
            name: item.name.length > 25 ? item.name.substring(0, 25) + '…' : item.name,
            fullName: item.name,
            code: item.code,
            coverage: item.coverageDays,
            status: item.status,
            isSelected: selectedProduct === item.code,
        }));
    }, [items, selectedProduct]);

    const chartHeight = Math.max(200, chartData.length * 32 + 40);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div>
                    <CardTitle className="text-sm font-semibold">
                        Cobertura de Estoque (dias)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Quanto tempo o estoque atual dura com a demanda atual
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={coverageConfig} className="w-full" style={{ height: chartHeight }}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 120, bottom: 5 }}
                    >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={115}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullName || '';
                                    }}
                                    formatter={(value) => [`${value} dias`, 'Cobertura']}
                                />
                            }
                        />
                        <ReferenceLine x={15} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                        <ReferenceLine x={45} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                        <Bar
                            dataKey="coverage"
                            radius={[0, 4, 4, 0]}
                            onClick={(entry) => {
                                if (entry?.code) {
                                    onProductSelect(
                                        selectedProduct === entry.code ? null : entry.code
                                    );
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((entry, idx) => (
                                <Cell
                                    key={idx}
                                    fill={STATUS_COLORS[entry.status] || STATUS_COLORS.unknown}
                                    opacity={selectedProduct && !entry.isSelected ? 0.25 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ── Chart 3: Evolução Temporal ────────────────────────────── */

function StockTimelineChart({
    history,
    selectedProduct,
}: {
    history: StockHistoryData;
    selectedProduct: string | null;
}) {
    const chartData = useMemo(() => {
        if (!history.hasSnapshots || history.timeline.length === 0) return [];

        return history.timeline.map(point => ({
            date: new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            rawDate: point.date,
            salesQuantity: point.salesQuantity,
            stockLevel: point.stockLevel,
        }));
    }, [history]);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">
                            Evolução Temporal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Vendas mensais + snapshots de estoque
                            {selectedProduct ? ` — ${selectedProduct}` : ' — Geral'}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center">
                        <p className="text-sm text-muted-foreground">
                            Snapshots de estoque começam a ser salvos a partir de hoje.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            O gráfico temporal vai ganhando corpo automaticamente.
                        </p>
                    </div>
                ) : (
                    <ChartContainer config={timelineConfig} className="h-[250px] w-full">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="fillSalesTimeline" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-salesQuantity)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-salesQuantity)" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                                dataKey="salesQuantity"
                                type="monotone"
                                fill="url(#fillSalesTimeline)"
                                stroke="var(--color-salesQuantity)"
                                strokeWidth={2}
                            />
                            <Line
                                dataKey="stockLevel"
                                type="monotone"
                                stroke="var(--color-stockLevel)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "var(--color-stockLevel)", strokeWidth: 2, stroke: "#050510" }}
                                connectNulls={false}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </ComposedChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds. Fix any type issues if they appear.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/stock-charts.tsx
git commit -m "feat(stock): add StockCharts component with 3 interactive charts"
```

---

### Task 6: Create `StockPageClient` Wrapper

**Files:**
- Create: `src/components/dashboard/stock-page-client.tsx`

This client component manages the shared `selectedProduct` state between `StockCharts` and `StockTable`.

- [ ] **Step 1: Create the client wrapper**

```typescript
// src/components/dashboard/stock-page-client.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { StockCharts } from "./stock-charts";
import { StockTable } from "./stock-table";
import type { StockOverviewData, StockHistoryData } from "@/app/stock-actions";

interface StockPageClientProps {
    data: StockOverviewData;
    history: StockHistoryData;
}

export function StockPageClient({ data, history }: StockPageClientProps) {
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const handleProductSelect = useCallback((sku: string | null) => {
        setSelectedProduct(sku);

        // Scroll to product row in table when selecting
        if (sku && tableRef.current) {
            const row = tableRef.current.querySelector(`[data-sku="${sku}"]`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, []);

    return (
        <div className="space-y-6">
            <StockCharts
                data={data}
                history={history}
                selectedProduct={selectedProduct}
                onProductSelect={handleProductSelect}
            />

            <div ref={tableRef}>
                <StockTable
                    data={data}
                    selectedProduct={selectedProduct}
                    onProductClick={handleProductSelect}
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify it compiles**

This will fail until we update `StockTable` props in the next task. That's expected — proceed to Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/stock-page-client.tsx
git commit -m "feat(stock): add StockPageClient wrapper for shared product selection state"
```

---

### Task 7: Update `StockTable` to Accept Selection Props

**Files:**
- Modify: `src/components/dashboard/stock-table.tsx`

- [ ] **Step 1: Update the `StockTableProps` interface**

In `src/components/dashboard/stock-table.tsx`, replace the existing `StockTableProps`:

```typescript
interface StockTableProps {
    data: StockOverviewData;
    selectedProduct?: string | null;
    onProductClick?: (sku: string | null) => void;
}
```

- [ ] **Step 2: Update the `StockTable` function signature and add click handler**

Update the destructuring to include new props:

```typescript
export function StockTable({ data, selectedProduct, onProductClick }: StockTableProps) {
```

- [ ] **Step 3: Add `data-sku` attribute and highlight to table rows**

In the `<tr>` element inside `filteredItems.map(...)`, add the `data-sku` attribute and conditional highlight. Replace the existing `<tr key={i} className=...>` with:

```typescript
<tr
    key={i}
    data-sku={item.code}
    className={`transition-all duration-200 group ${rowHighlight} ${
        selectedProduct === item.code
            ? 'ring-1 ring-indigo-500/50 bg-indigo-500/5'
            : ''
    }`}
    onClick={() => onProductClick?.(
        selectedProduct === item.code ? null : item.code
    )}
    style={{ cursor: onProductClick ? 'pointer' : undefined }}
>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/stock-table.tsx
git commit -m "feat(stock): add product selection + highlight props to StockTable"
```

---

### Task 8: Update Estoque Page to Use New Components

**Files:**
- Modify: `src/app/(dashboard)/estoque/page.tsx`

- [ ] **Step 1: Replace the page contents**

Replace the entire file content:

```typescript
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { fetchStockOverview, fetchStockHistory } from "@/app/stock-actions";
import { StockPageClient } from "@/components/dashboard/stock-page-client";

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{
        start?: string;
        end?: string;
    }>;
}

export default async function EstoquePage(props: Props) {
    const searchParams = await props.searchParams;

    const startDate = searchParams.start || "30daysAgo";
    const endDate = searchParams.end || "today";

    // Fetch stock overview + history in parallel
    const [data, history] = await Promise.all([
        fetchStockOverview(startDate, endDate, 30),
        fetchStockHistory(undefined, 6),
    ]);

    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <div className="flex items-center justify-between py-6">
                <div>
                    <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
                        Estoque e Demanda
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Cobertura de estoque, demanda projetada e alertas por SKU
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            <main className="w-full">
                <StockPageClient data={data} history={history} />

                <div className="mt-4 p-4 bg-[#050510]/50 border rounded-lg border-white/5 text-xs text-slate-400 flex flex-wrap gap-4">
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <strong>Critico:</strong> Menos de 15 dias de cobertura
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        <strong>Atencao:</strong> 15 a 45 dias de cobertura
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <strong>Saudavel:</strong> Mais de 45 dias de cobertura
                    </p>
                    <p className="text-slate-500 ml-auto">
                        * Media mensal e demanda baseadas no periodo selecionado
                    </p>
                </div>
            </main>
        </div>
    );
}
```

- [ ] **Step 2: Verify the full build**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npx next build --no-lint 2>&1 | tail -30`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\\(dashboard\\)/estoque/page.tsx
git commit -m "feat(stock): integrate charts + table via StockPageClient on /estoque"
```

---

### Task 9: Visual Verification and Polish

**Files:**
- Possibly adjust: `src/components/dashboard/stock-charts.tsx`

- [ ] **Step 1: Start the dev server and verify**

Run: `cd /Volumes/Untitled/yamuna_dashboard-main && npm run dev`

Open `http://localhost:3000/estoque` in the browser.

Verify:
1. Summary cards render at top (existing)
2. Product search dropdown appears
3. Chart 1 (Estoque vs Demanda) renders bars with status colors + avg sales line
4. Chart 2 (Cobertura) renders horizontal bars with reference lines at 15d and 45d
5. Chart 3 (Evolução Temporal) shows empty state message (no snapshots yet)
6. Table renders below charts
7. Clicking a bar in any chart selects the product — filter updates, other charts dim
8. Clicking a table row selects the product
9. "Limpar filtro" button resets to general view
10. Date range filter still works

- [ ] **Step 2: Fix any visual issues found**

If charts need spacing, color, or sizing adjustments, edit `stock-charts.tsx` directly.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix(stock): visual polish for stock charts"
```

---

## Execution Order

Tasks 1-4 are sequential (data layer). Tasks 5-7 can be done in parallel (components). Task 8 integrates everything. Task 9 is manual verification.

```
Task 1 (Supabase migration)
  → Task 2 (stock-snapshots service)
    → Task 3 (server actions)
      → Task 4 (warmup)

Task 5 (StockCharts) ─┐
Task 6 (PageClient) ──┼→ Task 8 (page integration) → Task 9 (verify)
Task 7 (StockTable) ──┘
```
