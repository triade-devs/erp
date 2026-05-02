-- supabase/migrations/20260502000027_fix_platform_admin_rpcs_security.sql
-- Fix: adiciona guard is_platform_admin(), guard role desconhecida,
--      guard permission_codes null, e revoke correto de anon/authenticated.

create or replace function public.update_system_role_permissions(
  role_code text,
  permission_codes text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito a platform admins' using errcode = 'P0401';
  end if;

  if not exists (select 1 from public.roles where code = role_code and is_system = true) then
    raise exception 'Role de sistema não encontrada: %', role_code using errcode = 'P0404';
  end if;

  if permission_codes is null then
    raise exception 'permission_codes não pode ser null' using errcode = 'P0422';
  end if;

  delete from public.role_permissions
  where role_id in (
    select id from public.roles
    where code = role_code and is_system = true
  );

  insert into public.role_permissions (role_id, permission_code)
  select r.id, unnest(permission_codes)
  from public.roles r
  where r.code = role_code and r.is_system = true
  on conflict do nothing;
end;
$$;

revoke all on function public.update_system_role_permissions(text, text[]) from public, anon, authenticated;
grant execute on function public.update_system_role_permissions(text, text[]) to authenticated;
