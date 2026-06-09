-- ============================================================
-- 47 — RLS: spaces e space_rentals
-- Policies baseadas em permissão RBAC (has_permission) + tenant.
-- ============================================================

-- ---------- spaces ----------
alter table public.spaces enable row level security;

-- Leitura: qualquer membro ativo da empresa
create policy "spaces_select" on public.spaces
  for select using (company_id in (select public.user_company_ids()));

-- Criação / edição / exclusão: requer permissão de gestão
create policy "spaces_insert" on public.spaces
  for insert with check (public.has_permission(company_id, 'spaces:space:manage'));

create policy "spaces_update" on public.spaces
  for update
  using (public.has_permission(company_id, 'spaces:space:manage'))
  with check (public.has_permission(company_id, 'spaces:space:manage'));

create policy "spaces_delete" on public.spaces
  for delete using (public.has_permission(company_id, 'spaces:space:manage'));

-- ---------- space_rentals ----------
alter table public.space_rentals enable row level security;

-- Leitura: qualquer membro ativo da empresa
create policy "space_rentals_select" on public.space_rentals
  for select using (company_id in (select public.user_company_ids()));

-- Criação (alugar): requer permissão explícita
create policy "space_rentals_insert" on public.space_rentals
  for insert with check (public.has_permission(company_id, 'spaces:rental:create'));

-- Atualização (cancelar/editar): gestor com permissão OU o próprio locatário
create policy "space_rentals_update" on public.space_rentals
  for update
  using (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or renter_user_id = auth.uid()
  )
  with check (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or renter_user_id = auth.uid()
  );
