-- Adiciona is_platform_admin() às policies de SELECT em roles e role_permissions.
-- Sem isso, um platform admin sem membership em todas as empresas vê dados
-- incompletos em /admin/platform/roles, causando propagações incorretas.

drop policy "roles_select" on public.roles;
create policy "roles_select" on public.roles
  for select using (
    public.is_platform_admin()
    or company_id in (select public.user_company_ids())
  );

drop policy "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select" on public.role_permissions
  for select using (
    public.is_platform_admin()
    or role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
  );
