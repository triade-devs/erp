-- 20260523000051_role_templates_schema.sql
-- PR #D1 da evolução de roles: catálogo global de templates de role + ligação
-- das instâncias por tenant (roles.template_code, roles.template_synced_at).
-- Sem mudança comportamental nesta migration — dados são populados na 052,
-- e bootstrap passa a usar templates na 053.

-- ─── role_templates: catálogo global ─────────────────────────────────────────
create table public.role_templates (
  code         text primary key,
  name         text not null,
  description  text,
  is_system    boolean not null default false,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_role_templates_sort on public.role_templates(sort_order);

alter table public.role_templates enable row level security;

-- Leitura global (autenticados); escrita só platform admin
create policy "role_templates_select" on public.role_templates
  for select using (auth.uid() is not null);

create policy "role_templates_write_platform" on public.role_templates
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.role_templates is
  'PR #D1: catálogo global de templates (perfis-padrão). Instâncias por tenant em public.roles via template_code.';

-- ─── template_permissions: contrato de cada template ─────────────────────────
create table public.template_permissions (
  template_code   text not null references public.role_templates(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (template_code, permission_code)
);
create index idx_template_permissions_template on public.template_permissions(template_code);

alter table public.template_permissions enable row level security;

create policy "template_permissions_select" on public.template_permissions
  for select using (auth.uid() is not null);

create policy "template_permissions_write_platform" on public.template_permissions
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.template_permissions is
  'PR #D1: permissões que compõem cada template. Fonte para apply_template_to_company.';

-- ─── roles: ligação para template ────────────────────────────────────────────
alter table public.roles
  add column template_code text references public.role_templates(code) on delete set null,
  add column template_synced_at timestamptz;

create index idx_roles_template_code on public.roles(template_code);

comment on column public.roles.template_code is
  'PR #D1: template do qual esta role foi instanciada (null = role custom criada do zero).';
comment on column public.roles.template_synced_at is
  'PR #D1: última vez que esta role recebeu apply do template. NULL = divergente (customizada após bootstrap/apply).';
