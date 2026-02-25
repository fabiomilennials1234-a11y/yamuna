import {
    Card,
    CardHeader,
    CardDescription,
    CardTitle,
    CardAction,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

export function KPICard({
    label,
    value,
    prefix = "",
    suffix = "",
    trend,
    invertTrend = false,
    format = 'currency',
    delay = 0,
    className = ""
}: any) {
    const isPositive = trend > 0;
    const isGood = invertTrend ? !isPositive : isPositive;
    const gradientClass = "data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card dark:data-[slot=card]:bg-card data-[slot=card]:shadow-xs";

    return (
        <Card className={`@container/card ${gradientClass} ${className}`}>
            <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl flex items-center gap-1">
                    {prefix && <span className="text-lg text-muted-foreground font-medium">{prefix}</span>}
                    <AnimatedNumber value={value} format={format} />
                    {suffix && <span className="text-sm text-muted-foreground font-medium">{suffix}</span>}
                </CardTitle>
                {/* Trend Badge if available */}
                {trend !== undefined && (
                    <CardAction>
                        <Badge variant="outline" className={isGood ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-rose-500 border-rose-500/20 bg-rose-500/10"}>
                            {isPositive ? <IconTrendingUp className="size-3 mr-1" /> : <IconTrendingDown className="size-3 mr-1" />}
                            {Math.abs(trend)}%
                        </Badge>
                    </CardAction>
                )}
            </CardHeader>
        </Card>
    );
}
