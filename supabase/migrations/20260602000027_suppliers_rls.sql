alter table public.suppliers enable row level security;

create policy "suppliers_select" on public.suppliers
  for select using (company_id in (select public.user_company_ids()));

create policy "suppliers_insert" on public.suppliers
  for insert with check (public.has_permission(company_id, 'suppliers:supplier:create'));

create policy "suppliers_update" on public.suppliers
  for update
  using (public.has_permission(company_id, 'suppliers:supplier:update'))
  with check (public.has_permission(company_id, 'suppliers:supplier:update'));

create policy "suppliers_delete" on public.suppliers
  for delete using (public.has_permission(company_id, 'suppliers:supplier:delete'));
