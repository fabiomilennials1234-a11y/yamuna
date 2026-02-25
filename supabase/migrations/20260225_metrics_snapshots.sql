-- Migration: Metrics Snapshots — Persistent Cache Layer
-- Purpose: Sobrevive a restarts do servidor/container, garante dados instantâneos ao usuário
-- Data: 2026-02-25

-- Tabela principal de cache persistente
CREATE TABLE IF NOT EXISTS metrics_snapshots (
    cache_key   TEXT        PRIMARY KEY,
    data        JSONB       NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas rápidas por expiração (limpeza automática)
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_expires
    ON metrics_snapshots(expires_at);

-- Índice de texto para buscas por prefixo de chave (ex.: 'dashboard:%')
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_key_prefix
    ON metrics_snapshots USING btree (cache_key text_pattern_ops);

-- Função de atualização automática do updated_at
CREATE OR REPLACE FUNCTION update_metrics_snapshots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-atualizar updated_at
DROP TRIGGER IF EXISTS metrics_snapshots_update_timestamp ON metrics_snapshots;
CREATE TRIGGER metrics_snapshots_update_timestamp
    BEFORE UPDATE ON metrics_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_metrics_snapshots_timestamp();

-- Desabilitar RLS: dados de cache não são sensíveis e precisam ser acessados por processo background
ALTER TABLE metrics_snapshots DISABLE ROW LEVEL SECURITY;

-- Conceder acesso à role anon (usada pela chave pública do Supabase em background)
GRANT SELECT, INSERT, UPDATE, DELETE ON metrics_snapshots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON metrics_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON metrics_snapshots TO service_role;

-- Comentário na tabela
COMMENT ON TABLE metrics_snapshots IS
    'Cache persistente de métricas computadas. Sobrevive a restarts do servidor. TTL controlado pelo campo expires_at.';

-- Função utilitária para limpeza de entradas expiradas (rodar via cron ou manualmente)
CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics_snapshots WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
