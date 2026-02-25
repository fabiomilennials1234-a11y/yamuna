-- Add modules column if it doesn't exist
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.tenants.modules IS 'List of enabled module keys for this tenant (e.g. ["meta_ads", "tiny_erp"])';

-- Seed Yamuna tenant with full modules
UPDATE public.tenants
SET modules = '["dashboard", "meta_ads", "google_ads", "tiny_erp", "wake_commerce", "finance", "rfm", "ga4", "crm"]'::jsonb
WHERE slug = 'yamuna';

-- Ensure RLS allows reading modules (usually covered by existing SELECT policy but good to verify)
-- Existing policy: "Users can view their own tenant" should cover this as long as they select * or modules.
