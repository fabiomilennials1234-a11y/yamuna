import { Skeleton } from "@/components/ui/Skeleton";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <>
            <Header title="Configurações" />
            <main className="p-6 space-y-6">
                {/* Settings sections */}
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-6">
                        <CardContent className="p-0 space-y-4">
                            <Skeleton className="h-5 w-40 mb-4" />
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </main>
        </>
    );
}
