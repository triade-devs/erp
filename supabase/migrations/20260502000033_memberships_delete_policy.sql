-- Faltava política DELETE em memberships.
-- Sem ela, RLS nega silenciosamente: error=null mas 0 rows deletadas.
-- A action interpretava isso como sucesso — toast "Membro removido" mas nada mudava.
create policy "memberships_delete"
  on public.memberships for delete
  using (
    not is_owner
    and (
      is_platform_admin()
      or has_permission(company_id, 'core:member:manage')
    )
  );
