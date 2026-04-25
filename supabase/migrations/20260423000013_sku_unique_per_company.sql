-- PR #23: SKU único por empresa (não globalmente)
-- Remove a constraint global e adiciona constraint composta (company_id, sku)
alter table public.products drop constraint if exists products_sku_key;
alter table public.products add constraint products_sku_per_company unique (company_id, sku);
