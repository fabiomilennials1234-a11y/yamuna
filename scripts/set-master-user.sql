-- Script para configurar gabriegipp04@gmail.com como super_admin (master)
-- 
-- IMPORTANTE: O usuário precisa existir primeiro em auth.users.
-- Se ainda não criou: Supabase Dashboard > Authentication > Users > Add user
--   Email: gabriegipp04@gmail.com
--   Password: Aurelio01@
--
-- Depois execute este SQL no Supabase SQL Editor:
-- Supabase Dashboard > SQL Editor > New query > Cole e execute

INSERT INTO user_profiles (id, full_name, tenant_id, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Master Admin'), 
  NULL, 
  'super_admin'::user_role
FROM auth.users
WHERE email = 'gabriegipp04@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin', tenant_id = NULL, full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);
