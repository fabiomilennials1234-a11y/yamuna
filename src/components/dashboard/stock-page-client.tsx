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
