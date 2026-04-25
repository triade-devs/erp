-- Backfill: atribui default-company a todos os registros existentes sem company_id
-- Seguro re-executar (WHERE company_id IS NULL)
update public.products
   set company_id = (select id from public.companies where slug = 'default-company' limit 1)
 where company_id is null;

update public.stock_movements
   set company_id = (select id from public.companies where slug = 'default-company' limit 1)
 where company_id is null;
