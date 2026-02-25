'use client';

import { useEffect } from 'react';

/**
 * Fallback client-side: dispara warm-up apenas uma vez ao abrir o app.
 * O warm-up principal roda no servidor via instrumentation.ts a cada hora.
 * Este componente serve apenas para garantir que o cache está quente
 * caso o usuário acesse logo após um restart do servidor.
 */
export function CacheWarmer() {
    useEffect(() => {
        fetch('/api/warm-cache').catch(() => {});
    }, []);

    return null;
}
