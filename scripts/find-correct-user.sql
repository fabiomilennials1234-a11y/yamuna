-- Passo 1: Verificar se o usuário existe em auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%milennials%'
  OR email LIKE '%webservices%';

-- Se não retornar nada, o usuário NÃO está registrado no sistema de autenticação!

-- Passo 2: Verificar todos os usuários que PODEM ter permissões
SELECT 
  u.id,
  u.email,
  p.full_name,
  up.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at DESC
LIMIT 20;

-- Passo 3: Se encontrar o usuário correto na lista acima,
-- copie o ID e use este comando:

-- INSERT INTO user_profiles (id, full_name, role, tenant_id)
-- VALUES (
--   'COLE-O-ID-CORRETO-AQUI',
--   'Milennials Web Services',
--   'super_admin',
--   NULL
-- )
-- ON CONFLICT (id) DO UPDATE 
-- SET role = 'super_admin';
