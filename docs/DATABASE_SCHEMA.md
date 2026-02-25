# 📊 Estrutura do Banco de Dados - Yamuna Dashboard

## Visão Geral das Tabelas

### 🔐 **1. `auth.users`** (Gerenciada pelo Supabase)
**NÃO aparece na lista porque está no schema `auth`**

**Propósito:** Tabela de autenticação padrão do Supabase, gerencia login/senha.

**Campos principais:**
- `id` (UUID): Identificador único do usuário
- `email`: Email de login
- `encrypted_password`: Senha criptografada
- `created_at`: Data de criação

**Uso:**
- ✅ Criada automaticamente quando usuário faz sign up
- ✅ Supabase gerencia tudo (login, reset de senha, etc)
- ✅ Você NUNCA edita diretamente

---

### 👤 **2. `profiles`**
**Propósito:** Informações públicas/básicas do usuário (complementa `auth.users`)

**Campos:**
- `id` (UUID): Mesmo ID de `auth.users` (FK)
- `username`: Nome de usuário único
- `full_name`: Nome completo
- `email`: Email (duplicado para fácil acesso)
- `avatar_url`: URL da foto de perfil
- `website`: Site pessoal
- `updated_at`: Última atualização

**Uso:**
- ✅ Perfil com informações visíveis publicamente
- ✅ Criado automaticamente após signup
- ✅ Usuário pode editar seu próprio perfil

**Relação:** `profiles.id` → `auth.users.id` (1:1)

---

### 🎫 **3. `user_profiles`**
**Propósito:** **Permissões e roles** (quem pode ver o quê)

**Campos:**
- `id` (UUID): Mesmo ID de `auth.users` (FK)
- `full_name`: Nome completo (pode diferir de `profiles`)
- `tenant_id` (UUID, nullable): A qual cliente pertence
- `role` (enum): Tipo de permissão
  - `super_admin`: Vê tudo (agência)
  - `client_admin`: Admin de um cliente específico
  - `client_viewer`: Read-only de um cliente
- `created_at`: Data de criação

**Uso:**
- ✅ **Define quem pode acessar quais dashboards**
- ✅ `tenant_id = NULL` → Super admin (agência)
- ✅ `tenant_id = UUID` → Usuário de um cliente específico

**Relação:** 
- `user_profiles.id` → `auth.users.id` (1:1)
- `user_profiles.tenant_id` → `tenants.id` (N:1)

**Exemplo:**
```sql
-- Super Admin (agência, vê tudo)
tenant_id = NULL, role = 'super_admin'

-- Admin do cliente Milennials
tenant_id = 'uuid-milennials', role = 'client_admin'
```

---

### 🏢 **4. `tenants`**
**Propósito:** Representa cada **cliente da agência**

**Campos principais:**
- `id` (UUID): Identificador único do tenant
- `name`: Nome do cliente (ex: "Milennials", "Outro Cliente")
- `created_at`: Data de criação

**Uso:**
- ✅ Cada cliente da agência tem um tenant
- ✅ Isola dados entre clientes
- ✅ Exemplo: "Milennials", "Cliente X", "Cliente Y"

**Relação:** 
- `user_profiles.tenant_id` → `tenants.id` (1:N)
- `dashboards.tenant_id` → `tenants.id` (1:N)

---

### 📊 **5. `dashboards`**
**Propósito:** Configurações de dashboards personalizados por tenant

**Campos principais:**
- `id` (UUID): ID do dashboard
- `tenant_id` (UUID): Qual cliente é dono
- `name`: Nome do dashboard
- `config` (JSON): Configuração (widgets, filtros, etc)
- `created_at`: Data de criação

**Uso:**
- ✅ Cada tenant pode ter múltiplos dashboards
- ✅ Armazena configurações personalizadas
- ✅ Super admins veem todos, clientes veem só os seus

**Relação:** `dashboards.tenant_id` → `tenants.id` (N:1)

---

### 🔌 **6. `integrations`**
**Propósito:** Credenciais de APIs externas (Tiny, Google Ads, Meta, etc)

**Campos principais:**
- `id` (UUID): ID da integração
- `tenant_id` (UUID): Qual cliente é dono
- `provider`: Nome da API (ex: "tiny", "google_ads", "meta")
- `credentials` (JSON encrypted): Tokens/chaves de API
- `is_active`: Se está ativa
- `created_at`: Data de criação

**Uso:**
- ✅ Cada tenant tem suas próprias credenciais de API
- ✅ Tokens armazenados de forma segura (encrypted)
- ✅ Permite múltiplas integrações por tenant

**Relação:** `integrations.tenant_id` → `tenants.id` (N:1)

**Exemplo:**
```json
{
  "provider": "tiny",
  "credentials": {
    "api_token": "encrypted_token_here"
  }
}
```

---

### 🎯 **7. `monthly_goals`**
**Propósito:** Metas mensais de performance (receita, ROI, etc)

**Campos principais:**
- `id` (UUID): ID da meta
- `tenant_id` (UUID): Qual cliente
- `month`: Mês/Ano (ex: "2025-01")
- `revenue_goal`: Meta de receita
- `roi_goal`: Meta de ROI
- `created_at`: Data de criação

**Uso:**
- ✅ Define metas mensais para cada cliente
- ✅ Dashboard compara performance real vs meta
- ✅ Permite tracking de progresso

**Relação:** `monthly_goals.tenant_id` → `tenants.id` (N:1)

---

## 🔄 Relacionamentos (Resumo Visual)

```
auth.users (Supabase)
    ↓ (1:1)
profiles (Info pública)
    ↓ (1:1)
user_profiles (Permissões)
    ↓ (N:1)
tenants (Clientes)
    ↓ (1:N)
    ├─ dashboards (Dashboards personalizados)
    ├─ integrations (APIs) 
    └─ monthly_goals (Metas)
```

---

## 📝 Fluxo de Criação de Novo Usuário

### 1. **Criar conta (automático via Supabase Auth)**
```sql
-- auth.users é criado automaticamente no signup
```

### 2. **Criar perfil básico (trigger automático)**
```sql
INSERT INTO profiles (id, email, full_name)
VALUES ('user-id', 'email@example.com', 'Nome');
```

### 3. **Definir permissões**
```sql
-- Super Admin (agência)
INSERT INTO user_profiles (id, role, tenant_id)
VALUES ('user-id', 'super_admin', NULL);

-- OU Cliente específico
INSERT INTO user_profiles (id, role, tenant_id)
VALUES ('user-id', 'client_admin', 'tenant-uuid');
```

---

## ❓ FAQ

**P: Por que `profiles` E `user_profiles`?**
R: `profiles` = dados públicos (nome, avatar). `user_profiles` = permissões (role, tenant).

**P: Todos os usuários precisam de tenant_id?**
R: NÃO. Super admins têm `tenant_id = NULL` e veem tudo.

**P: Como adicionar novo cliente?**
R:
1. Criar tenant: `INSERT INTO tenants (name) VALUES ('Nome Cliente')`
2. Criar user: `INSERT INTO user_profiles (id, role, tenant_id) VALUES (...)`
3. Configurar integrations para o tenant

**P: Posso deletar um tenant?**
R: SIM, mas vai deletar em cascata todos os dashboards, integrations e goals desse cliente.
