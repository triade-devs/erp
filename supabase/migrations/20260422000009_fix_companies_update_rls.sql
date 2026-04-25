-- ============================================================
-- FIX: Separa a policy de update de companies em duas policies
-- para impedir que owners alterem is_active e plan.
-- ============================================================

-- Remove a policy combinada que não restringia colunas para owners
drop policy if exists "companies_update_platform_or_owner" on public.companies;

-- Apenas platform admin pode criar/atualizar qualquer campo (plano, is_active, etc.)
create policy "companies_update_platform" on public.companies
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Owner pode atualizar apenas name, document e updated_at — não is_active nem plan
create policy "companies_update_owner" on public.companies
  for update
  using (
    exists (
      select 1 from public.memberships
      where user_id = auth.uid() and company_id = companies.id and is_owner
    )
  )
  with check (
    is_active = (select c2.is_active from public.companies c2 where c2.id = companies.id)
    and plan   = (select c2.plan   from public.companies c2 where c2.id = companies.id)
  );
