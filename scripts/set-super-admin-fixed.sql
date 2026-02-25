-- Script corrigido: INSERIR usuário na tabela user_profiles
-- Baseado no ID retornado: b0695ddf-3af7-44dd-add3-5ccad0ba223e

-- Passo 1: INSERIR o usuário "Milennials Web Services" na tabela user_profiles
INSERT INTO user_profiles (id, full_name, role, tenant_id)
VALUES (
  'b0695ddf-3af7-44dd-add3-5ccad0ba223e',  -- ID do usuário
  'Milennials Web Services',                -- Nome
  'super_admin',                             -- Role desejado
  NULL                                       -- Sem tenant específico (super admin global)
)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin';

-- Passo 2: Verificar se funcionou
SELECT 
  p.id,
  p.full_name,
  p.email,
  up.role,
  up.tenant_id
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.id
WHERE p.id = 'b0695ddf-3af7-44dd-add3-5ccad0ba223e';

-- Resultado esperado:
-- role deve mostrar "super_admin" agora
