-- 20260523000049_products_update_accepts_delete_perm.sql
-- Restaura a intenção da migration 20260430000024_fix_products_update_rls_softdelete.sql:
-- products_update precisa aceitar a permissão 'delete' também, porque o soft-delete
-- (deactivate-product action) faz UPDATE com is_active=false gateado pela perm 'delete'.
-- Migration 044 silenciosamente removeu a cláusula 'OR delete' ao adicionar o
-- OR is_platform_admin; cleanup do PR #B (migration 048) perpetuou. Aqui restauramos.

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
