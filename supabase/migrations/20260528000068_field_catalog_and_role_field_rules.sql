-- 20260528000068_field_catalog_and_role_field_rules.sql
-- PR #H da evolução de roles: field-level masking. Catálogo de colunas
-- mascaráveis em field_catalog (global). Atribuição em role_field_rules
-- (por role × coluna). Sem rule = editable (backward-compat).

-- ─── field_catalog: catálogo global ──────────────────────────────────────────
create table public.field_catalog (
  table_name   text not null,
  column_name  text not null,
  label        text not null,
  description  text,
  module_code  text references public.modules(code) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (table_name, column_name)
);

create index idx_field_catalog_module on public.field_catalog(module_code);

alter table public.field_catalog enable row level security;

create policy "field_catalog_select" on public.field_catalog
  for select using (auth.uid() is not null);

create policy "field_catalog_write_platform" on public.field_catalog
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.field_catalog is
  'PR #H: catálogo de colunas mascaráveis. (table_name, column_name) PK. Apenas platform admin escreve.';

-- ─── role_field_rules: atribuição de modo a (role × column) ──────────────────
create table public.role_field_rules (
  role_id      uuid not null references public.roles(id) on delete cascade,
  table_name   text not null,
  column_name  text not null,
  mode         text not null check (mode in ('hidden','readonly','editable')),
  granted_at   timestamptz not null default now(),
  primary key (role_id, table_name, column_name),
  foreign key (table_name, column_name)
    references public.field_catalog(table_name, column_name)
    on delete cascade
);

create index idx_role_field_rules_role on public.role_field_rules(role_id);
create index idx_role_field_rules_table on public.role_field_rules(table_name);

alter table public.role_field_rules enable row level security;

create policy "role_field_rules_select" on public.role_field_rules
  for select using (
    role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
    or public.is_platform_admin()
  );

create policy "role_field_rules_write" on public.role_field_rules
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_field_rules.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_field_rules.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  );

comment on table public.role_field_rules is
  'PR #H: atribuição de modo (hidden/readonly/editable) por role × coluna. Sem row = editable.';

-- ─── Seed inicial: colunas sensíveis de products ─────────────────────────────
insert into public.field_catalog (table_name, column_name, label, description, module_code) values
  ('products', 'cost_price', 'Preço de custo', 'Custo de aquisição/produção. Visível apenas a roles autorizadas.', 'inventory'),
  ('products', 'sale_price', 'Preço de venda', 'Preço final ao cliente. Mascarável por role.', 'inventory')
on conflict (table_name, column_name) do nothing;
