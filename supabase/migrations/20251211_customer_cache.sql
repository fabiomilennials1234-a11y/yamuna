-- Migration: Customer Order Cache for Revenue Segmentation
-- Purpose: Cache customer email/ID from Tiny enriched orders to avoid repeated API calls

-- Create customer_orders_cache table
CREATE TABLE IF NOT EXISTS customer_orders_cache (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    order_date DATE NOT NULL,
    customer_email TEXT,
    customer_name TEXT,
    customer_id TEXT,
    order_total DECIMAL(10, 2),
    source TEXT NOT NULL, -- 'tiny' or 'wake'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_customer_orders_email ON customer_orders_cache(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX idx_customer_orders_date ON customer_orders_cache(order_date);
CREATE INDEX idx_customer_orders_source ON customer_orders_cache(source);
CREATE INDEX idx_customer_orders_created ON customer_orders_cache(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER customer_cache_update_timestamp
    BEFORE UPDATE ON customer_orders_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_cache_timestamp();

-- Add comment
COMMENT ON TABLE customer_orders_cache IS 'Caches customer data from Tiny/Wake orders to enable fast revenue segmentation without repeated API calls';
