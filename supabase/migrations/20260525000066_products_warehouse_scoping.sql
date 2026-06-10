-- 20260525000066_products_warehouse_scoping.sql
-- PR #G: products.warehouse_id (nullable) + RLS atualizada + trigger valida write
-- Produtos sem warehouse_id (NULL) permanecem acessíveis sem scope check (backward-compat).

-- ─── Adiciona coluna warehouse_id ──────────────────────────────────────────
alter table public.products
  add column warehouse_id uuid references public.warehouses(id) on delete set null;

create index idx_products_warehouse on public.products(warehouse_id);

comment on column public.products.warehouse_id is
  'PR #G: dimensão warehouse para scope filtering. NULL = produto sem dimensão (acessível por todos).';

-- ─── RLS atualizada ───────────────────────────────────────────────────────────
-- products_select: incluir scope check além de has_permission
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (
    public.is_platform_admin()
    or (
      company_id in (select public.user_company_ids())
      and public.has_permission(company_id, 'inventory:product:read')
      and (
        warehouse_id is null
        or public.user_has_scope(company_id, 'warehouse', warehouse_id::text)
      )
    )
  );

-- ─── Trigger: valida write fora do scope ──────────────────────────────────────
create or replace function public.check_product_warehouse_scope()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.warehouse_id is not null
     and not public.user_has_scope(new.company_id, 'warehouse', new.warehouse_id::text)
  then
    raise exception 'Sem acesso ao depósito informado' using errcode = 'P0403';
  end if;
  return new;
end $$;

create trigger trg_product_warehouse_scope
  before insert or update of warehouse_id on public.products
  for each row execute function public.check_product_warehouse_scope();

comment on function public.check_product_warehouse_scope() is
  'PR #G: bloqueia INSERT/UPDATE em warehouse_id fora do scope do user.';
