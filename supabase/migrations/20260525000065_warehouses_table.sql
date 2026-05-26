-- PR #G: Primeira dimensão concreta de escoping.
-- Tabela warehouses com RLS (permissão core:inventory:manage).
-- Seed scope_dimensions com 'warehouse'.
-- Backward-compat: companies pode ter 0 warehouses (nil = global).

-- ─── Permissão ───────────────────────────────────────────────────────────────
insert into public.permissions (code, module_code, resource, action, description) values
  ('core:inventory:manage', 'core', 'inventory', 'manage', 'Gerenciar módulo de estoque (depósitos, etc)')
on conflict do nothing;

-- Atribui a nova permissão às roles existentes de todas as empresas
-- Owner: já tem tudo, então garante a permissão
insert into public.role_permissions (role_id, permission_code)
select r.id, 'core:inventory:manage'
from public.roles r
where r.code = 'owner'
on conflict do nothing;

-- Manager: acesso a core:inventory:manage
insert into public.role_permissions (role_id, permission_code)
select r.id, 'core:inventory:manage'
from public.roles r
where r.code = 'manager'
on conflict do nothing;

-- Operator: leitura apenas (sem permissão de manage)
-- (Operator não recebe core:inventory:manage)

-- ─── scope_dimensions: seed warehouse ────────────────────────────────────────
insert into public.scope_dimensions (code, name, description, resolver_fn)
values
  ('warehouse', 'Depósito', 'Escopo por depósito/warehouse', null)
on conflict do nothing;

-- ─── warehouses: primeira dimensão concreta ──────────────────────────────────
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_warehouses_company on public.warehouses(company_id);
create index if not exists idx_warehouses_active on public.warehouses(is_active) where is_active;

alter table public.warehouses enable row level security;

-- Leitura: qualquer membro ativo da empresa
create policy if not exists "warehouses_select" on public.warehouses
  for select using (company_id in (select public.user_company_ids()));

-- Criação: requer permissão core:inventory:manage
create policy if not exists "warehouses_insert" on public.warehouses
  for insert with check (public.has_permission(company_id, 'core:inventory:manage'));

-- Atualização: requer permissão core:inventory:manage (USING + WITH CHECK para evitar escalação)
create policy if not exists "warehouses_update" on public.warehouses
  for update
  using (public.has_permission(company_id, 'core:inventory:manage'))
  with check (public.has_permission(company_id, 'core:inventory:manage'));

-- Exclusão (soft delete via is_active = false): requer permissão core:inventory:manage
create policy if not exists "warehouses_delete" on public.warehouses
  for delete using (public.has_permission(company_id, 'core:inventory:manage'));

-- ─── Comments ────────────────────────────────────────────────────────────────
comment on table public.warehouses is
  'Depósitos/warehouses. PR #G: primeira dimensão concreta de role scoping. Role sem warehouse_id em role_scopes = acesso irrestrito.';

comment on column public.warehouses.company_id is
  'Empresa proprietária do depósito.';

comment on column public.warehouses.name is
  'Nome do depósito (ex: "Matriz", "Filial SP").';

comment on column public.warehouses.location is
  'Localização/endereço do depósito (opcional).';

comment on column public.warehouses.is_active is
  'Soft-delete: false = depósito deletado logicamente, não aparece em queries normais.';
