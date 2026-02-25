"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
    name: string;
    quantity: number;
    revenue: number;
}

interface TopProductsProps {
    products: Product[];
}

export function TopProducts({ products }: TopProductsProps) {
    if (!products || products.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Top 5 Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        Nenhum produto encontrado no período
                    </p>
                </CardContent>
            </Card>
        );
    }

    const topProducts = products.slice(0, 5);
    const maxRevenue = Math.max(...topProducts.map(p => p.revenue));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top 5 Produtos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {topProducts.map((product, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between pb-3 border-b last:border-0"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {product.quantity} vendas
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm">
                                    R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="w-16 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                    <div
                                        className="bg-primary h-full"
                                        style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
