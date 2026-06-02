-- Tabela de fornecedores (multi-tenant)
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  document    text,
  phone       text,
  email       text,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_suppliers_company on public.suppliers(company_id);
create index idx_suppliers_name on public.suppliers
  using gin (to_tsvector('portuguese', name));
