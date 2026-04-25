-- PR #25: Ativa RLS em products com policies baseadas em permissão RBAC
-- Remove policy permissiva do single-tenant (criada na migration 04) se existir
drop policy if exists "Authenticated users can manage products" on public.products;
drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;

alter table public.products enable row level security;

-- Leitura: qualquer membro ativo da empresa
create policy "products_select" on public.products
  for select using (company_id in (select public.user_company_ids()));

-- Criação: requer permissão explícita
create policy "products_insert" on public.products
  for insert with check (public.has_permission(company_id, 'inventory:product:create'));

-- Atualização: requer permissão explícita (USING + WITH CHECK para evitar escalação)
create policy "products_update" on public.products
  for update
  using (public.has_permission(company_id, 'inventory:product:update'))
  with check (public.has_permission(company_id, 'inventory:product:update'));

-- Exclusão (soft delete via is_active = false): requer permissão explícita
create policy "products_delete" on public.products
  for delete using (public.has_permission(company_id, 'inventory:product:delete'));
