-- Novas colunas (nullable primeiro para não quebrar linhas existentes)
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists location text;
alter table public.products add column if not exists classification_id uuid
  references public.product_classifications(id) on delete set null;
alter table public.products add column if not exists supplier_id uuid
  references public.suppliers(id);

-- Backfill supplier_id com o fornecedor default de cada empresa
update public.products p
set supplier_id = s.id
from public.suppliers s
where s.company_id = p.company_id
  and s.name = 'FORNECEDOR NÃO INFORMADO'
  and p.supplier_id is null;

alter table public.products alter column supplier_id set not null;

-- Data-fix dos campos existentes antes de apertar constraints
update public.products set name = upper(name);
update public.products set sku = left(sku, 20) where length(sku) > 20;
update public.products set description = '—' where description is null or btrim(description) = '';
update public.products set description = left(description, 100) where length(description) > 100;
update public.products set min_stock = round(min_stock);

-- Apertar constraints
alter table public.products alter column description set not null;
alter table public.products add constraint products_sku_len_chk check (char_length(sku) <= 20);
alter table public.products add constraint products_name_len_chk check (char_length(name) <= 60);
alter table public.products add constraint products_desc_len_chk check (char_length(description) <= 100);
alter table public.products add constraint products_location_len_chk
  check (location is null or char_length(location) <= 40);
alter table public.products add constraint products_barcode_chk
  check (barcode is null or barcode ~ '^[0-9]{8}$' or barcode ~ '^[0-9]{13}$');
alter table public.products add constraint products_min_stock_int_chk
  check (min_stock = round(min_stock));

-- barcode unique por empresa (partial index)
create unique index if not exists uq_products_company_barcode
  on public.products(company_id, barcode) where barcode is not null;
