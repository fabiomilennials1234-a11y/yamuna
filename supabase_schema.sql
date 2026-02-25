-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Helper Function to create ENUMs safely
do $$ begin
    create type user_role as enum ('super_admin', 'client_owner', 'client_viewer');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type integration_provider as enum ('tiny', 'wake', 'shopify', 'ga4', 'meta_ads', 'google_ads', 'kommo');
exception
    when duplicate_object then null;
end $$;

-- 2. TENANTS (Clientes)
create table if not exists tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. USER PROFILES
create table if not exists user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  tenant_id uuid references tenants(id),
  role user_role not null default 'client_viewer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. INTEGRATIONS
create table if not exists integrations (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  provider integration_provider not null,
  credentials jsonb not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, provider)
);

-- 5. RLS (Row Level Security)
alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table integrations enable row level security;

-- Helper Functions
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer;

create or replace function belongs_to_tenant(tenant_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and tenant_id = tenant_uuid
  );
$$ language sql security definer;

-- DROP OLD POLICIES TO AVOID CONFLICTS
drop policy if exists "Super Admins total access tenants" on tenants;
drop policy if exists "Users view own tenant" on tenants;
drop policy if exists "Super Admins total access profiles" on user_profiles;
drop policy if exists "Users view own profile" on user_profiles;
drop policy if exists "Super Admins total access integrations" on integrations;
drop policy if exists "Clients view own integrations" on integrations;

-- CREATE POLICIES

-- Tenants
create policy "Super Admins total access tenants" on tenants for all using ( is_super_admin() );
create policy "Users view own tenant" on tenants for select using ( belongs_to_tenant(id) );

-- Profiles
create policy "Super Admins total access profiles" on user_profiles for all using ( is_super_admin() );
create policy "Users view own profile" on user_profiles for select using ( auth.uid() = id );

-- Integrations
create policy "Super Admins total access integrations" on integrations for all using ( is_super_admin() );
create policy "Clients view own integrations" on integrations for select using ( belongs_to_tenant(tenant_id) );
