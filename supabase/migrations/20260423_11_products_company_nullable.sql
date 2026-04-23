-- Subfase A: adiciona company_id NULLABLE (zero-downtime — código antigo continua funcionando)
alter table public.products
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.stock_movements
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

create index if not exists idx_products_company     on public.products(company_id);
create index if not exists idx_movements_company    on public.stock_movements(company_id);
