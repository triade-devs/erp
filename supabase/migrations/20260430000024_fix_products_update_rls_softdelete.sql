-- Fix: policy products_update não permitia soft-delete (is_active = false)
-- porque o TS action verifica 'inventory:product:delete' mas o DB exigia
-- 'inventory:product:update'. Soft-delete é semanticamente uma deleção,
-- então a policy agora aceita quem tem update OU delete.
drop policy if exists "products_update" on public.products;

create policy "products_update" on public.products
  for update
  using (
    public.has_permission(company_id, 'inventory:product:update')
    or public.has_permission(company_id, 'inventory:product:delete')
  )
  with check (
    public.has_permission(company_id, 'inventory:product:update')
    or public.has_permission(company_id, 'inventory:product:delete')
  );
