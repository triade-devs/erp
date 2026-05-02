-- memberships_update WITH CHECK tinha subquery em memberships durante UPDATE:
--   is_owner = (SELECT m.is_owner FROM memberships m WHERE m.id = memberships.id)
-- Isso cria recursão infinita: UPDATE → WITH CHECK → SELECT memberships → SELECT policy → recursão.
-- Fix: WITH CHECK igual ao USING (sem subquery). Proteção de is_owner vive no TypeScript.
drop policy if exists "memberships_update" on public.memberships;

create policy "memberships_update"
  on public.memberships for update
  using (
    is_platform_admin()
    or has_permission(company_id, 'core:member:manage')
  )
  with check (
    is_platform_admin()
    or has_permission(company_id, 'core:member:manage')
  );
