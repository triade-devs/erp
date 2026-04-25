-- ============================================================
-- EXTENSÕES (idempotente)
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. COMPANIES (Tenants)
-- ============================================================
create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  document     text,
  plan         text not null default 'starter',
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_companies_slug on public.companies(slug);

-- ============================================================
-- 2. PLATFORM ADMINS
-- ============================================================
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

-- ============================================================
-- 3. MODULES (catálogo declarativo)
-- ============================================================
create table public.modules (
  code        text primary key,
  name        text not null,
  description text,
  icon        text,
  is_system   boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 4. PERMISSIONS (catálogo global de permissões atômicas)
-- ============================================================
create table public.permissions (
  code        text primary key,
  module_code text not null references public.modules(code) on delete cascade,
  resource    text not null,
  action      text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index idx_permissions_module on public.permissions(module_code);

-- ============================================================
-- 5. COMPANY_MODULES (provisionamento)
-- ============================================================
create table public.company_modules (
  company_id  uuid not null references public.companies(id) on delete cascade,
  module_code text not null references public.modules(code) on delete restrict,
  enabled_at  timestamptz not null default now(),
  enabled_by  uuid references auth.users(id),
  primary key (company_id, module_code)
);

-- ============================================================
-- 6. ROLES (por empresa)
-- ============================================================
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, code)
);
create index idx_roles_company on public.roles(company_id);

-- ============================================================
-- 7. ROLE_PERMISSIONS
-- ============================================================
create table public.role_permissions (
  role_id         uuid not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  granted_at      timestamptz not null default now(),
  primary key (role_id, permission_code)
);

-- ============================================================
-- 8. MEMBERSHIPS (User × Company)
-- ============================================================
create type public.membership_status as enum ('invited', 'active', 'suspended');

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  is_owner    boolean not null default false,
  status      public.membership_status not null default 'active',
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz,
  joined_at   timestamptz default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, company_id)
);
create index idx_memberships_user    on public.memberships(user_id);
create index idx_memberships_company on public.memberships(company_id);

-- ============================================================
-- 9. MEMBERSHIP_ROLES (N↔M)
-- ============================================================
create table public.membership_roles (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  role_id       uuid not null references public.roles(id) on delete cascade,
  assigned_by   uuid references auth.users(id),
  assigned_at   timestamptz not null default now(),
  primary key (membership_id, role_id)
);

-- ============================================================
-- 10. AUDIT_LOGS (append-only)
-- ============================================================
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies(id) on delete set null,
  actor_user_id uuid references auth.users(id),
  actor_email   text,
  action        text not null,
  resource_type text,
  resource_id   text,
  permission    text,
  status        text not null default 'success',
  ip            inet,
  user_agent    text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index idx_audit_logs_company on public.audit_logs(company_id, created_at desc);
create index idx_audit_logs_actor   on public.audit_logs(actor_user_id, created_at desc);

-- audit_logs: imutável — ninguém pode UPDATE/DELETE
revoke update, delete on public.audit_logs from public, authenticated;

-- ============================================================
-- HABILITAR RLS em todas as tabelas (sem policies ainda)
-- ============================================================
alter table public.companies        enable row level security;
alter table public.platform_admins  enable row level security;
alter table public.modules          enable row level security;
alter table public.permissions      enable row level security;
alter table public.company_modules  enable row level security;
alter table public.roles            enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships      enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_logs       enable row level security;
