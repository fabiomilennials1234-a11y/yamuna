"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ interval = 5000 }: { interval?: number }) {
    const router = useRouter();

    useEffect(() => {
        console.log(`[AutoRefresh] 🔄 Polling enabled (Every ${interval}ms)`);

        const timer = setInterval(() => {
            console.log("[AutoRefresh] 🔄 Refreshing page data...");
            router.refresh(); // Triggers a soft refresh (re-fetches server components)
        }, interval);

        return () => clearInterval(timer);
    }, [interval, router]);

    return null; // This component is invisible
}
