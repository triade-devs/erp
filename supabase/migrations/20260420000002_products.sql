-- Tabela de produtos
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique,
  name         text not null,
  description  text,
  unit         text not null default 'UN',              -- UN, KG, L, CX, M
  cost_price   numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price   numeric(12,2) not null default 0 check (sale_price >= 0),
  stock        numeric(12,3) not null default 0,        -- Saldo calculado via trigger
  min_stock    numeric(12,3) not null default 0,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índice para busca por SKU
create index idx_products_sku on public.products(sku);

-- Índice full-text para busca por nome em português
create index idx_products_name on public.products
  using gin (to_tsvector('portuguese', name));
