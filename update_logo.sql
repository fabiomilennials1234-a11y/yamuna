-- Update the logo for Yamuna tenant
UPDATE public.tenants
SET logo_url = '/logos/yamuna_logo.png'
WHERE slug = 'yamuna';

-- Verify the update
SELECT slug, logo_url FROM public.tenants WHERE slug = 'yamuna';
