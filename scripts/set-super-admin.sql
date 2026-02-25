-- Script para tornar "Milennials Web Services" super admin
-- Execute este SQL no Supabase SQL Editor

-- Passo 1: Encontrar o user_id do "Milennials Web Services"
-- (Vamos buscar pelo full_name na tabela profiles)

-- Passo 2: Atualizar o role para super_admin
-- NOTA: Ajuste 'super_admin' para o valor correto do seu enum user_role

-- Opção A: Se você souber o email do usuário (mais seguro)
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id 
  FROM profiles 
  WHERE email = 'seu-email@milennials.com'  -- SUBSTITUA com o email real
  LIMIT 1
);

-- Opção B: Se você souber o full_name exato
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id 
  FROM profiles 
  WHERE full_name = 'Milennials Web Services'
  LIMIT 1
);

-- Passo 3: Verificar se funcionou
SELECT 
  p.id,
  p.full_name,
  p.email,
  up.role,
  up.tenant_id
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
WHERE p.full_name LIKE '%Milennials%'
  OR p.email LIKE '%milennials%';

-- IMPORTANTE: Se o usuário ainda não existir na tabela user_profiles,
-- você precisará INSERIR uma nova linha primeiro:

-- INSERT INTO user_profiles (id, full_name, role, tenant_id)
-- SELECT 
--   id,
--   full_name,
--   'super_admin',
--   NULL  -- ou um tenant_id específico se necessário
-- FROM profiles
-- WHERE full_name = 'Milennials Web Services'
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
