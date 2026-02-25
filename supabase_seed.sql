-- 1. Cria/Garante o Tenant Yamuna
INSERT INTO tenants (name, slug, logo_url)
VALUES ('Yamuna', 'yamuna', 'https://yamuna.com.br/logo.png')
ON CONFLICT (slug) DO NOTHING;

-- 2. Define caiomilennials@gmail.com como Super Admin
DO $$
DECLARE
  v_user_email text := 'caiomilennials@gmail.com';
BEGIN
  -- Tenta inserir ou atualizar o perfil
  INSERT INTO user_profiles (id, full_name, tenant_id, role)
  SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Caio Milennials'), 
    NULL, 
    'super_admin'::user_role
  FROM auth.users
  WHERE email = v_user_email
  ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin', tenant_id = NULL; 
END $$;
