-- PR #24: Torna company_id obrigatório após backfill completo
alter table public.products alter column company_id set not null;
alter table public.stock_movements alter column company_id set not null;
