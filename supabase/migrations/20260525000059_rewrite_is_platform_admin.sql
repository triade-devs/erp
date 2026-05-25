-- 20260525000059_rewrite_is_platform_admin.sql
-- PR #E: is_platform_admin agora consulta platform_role_assignments + permissions.
-- Backward-compatible: todo platform_admin atual já foi backfilled na 058.
-- Tabela platform_admins mantida como deprecated (drop em follow-up).

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.platform_role_assignments pra
    join public.platform_roles pr on pr.code = pra.role_code
    where pra.user_id = auth.uid()
      and ('*' = any(pr.permissions) or 'platform:*' = any(pr.permissions))
  )
$$;

comment on function public.is_platform_admin() is
  'PR #E: lê platform_role_assignments. Retorna true se user tem role com permissions contendo ''*'' ou ''platform:*''.';

comment on table public.platform_admins is
  'PR #E DEPRECATED: substituída por platform_role_assignments. Mantida 1 release para rollback; drop em follow-up. is_platform_admin não lê mais daqui.';
