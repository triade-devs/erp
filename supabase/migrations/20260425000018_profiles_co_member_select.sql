-- Permite que usuários vejam perfis de co-membros (mesma empresa)
-- Necessário para listCompanyMembers exibir nomes de outros membros
create policy "profiles_select_co_member"
  on public.profiles for select
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m1
      join public.memberships m2 on m1.company_id = m2.company_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
    )
  );
