'use client';

import { useEffect } from 'react';

// Aquece o cache ao abrir o app e refresca automaticamente a cada 1 hora
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export function CacheWarmer() {
    useEffect(() => {
        fetch('/api/warm-cache').catch(() => {});

        const interval = setInterval(() => {
            fetch('/api/warm-cache').catch(() => {});
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    return null;
}
