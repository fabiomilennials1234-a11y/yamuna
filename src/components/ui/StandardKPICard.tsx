import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

interface StandardKPICardProps {
    label: string;
    value: number;
    icon?: LucideIcon;
    format?: 'currency' | 'decimal' | 'percent' | 'number';
    prefix?: string;
    suffix?: string;
}

export function StandardKPICard({
    label,
    value,
    icon: Icon,
    format = 'number',
    prefix = '',
    suffix = ''
}: StandardKPICardProps) {
    return (
        <Card className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                    {label}
                </span>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="text-2xl font-bold">
                {prefix && <span className="mr-1">{prefix}</span>}
                <AnimatedNumber value={value} format={format} />
                {suffix && <span className="ml-1 text-lg text-muted-foreground">{suffix}</span>}
            </div>
        </Card>
    );
}
