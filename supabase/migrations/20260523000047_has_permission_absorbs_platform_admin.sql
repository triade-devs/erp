-- 20260523000047_has_permission_absorbs_platform_admin.sql
-- PR #B da evolução de roles: has_permission() agora retorna true para
-- platform admins (paridade com requirePermission no TS) e filtra
-- role_permissions.is_active = true (consome flag do PR #A).
--
-- Substitui a function definida em 20260420000006_helpers_and_policies.sql.
-- Backward-compatible para todos os consumidores: ninguém precisa mudar.

create or replace function public.has_permission(p_company uuid, p_permission text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists (
        select 1
        from public.memberships m
        join public.membership_roles mr on mr.membership_id = m.id
        join public.role_permissions rp on rp.role_id = mr.role_id
        where m.user_id = auth.uid()
          and m.company_id = p_company
          and m.status = 'active'
          and rp.permission_code = p_permission
          and rp.is_active = true
      )
$$;

comment on function public.has_permission(uuid, text) is
  'PR #B: absorve is_platform_admin() (paridade com requirePermission) e filtra is_active=true.';
