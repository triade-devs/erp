-- 20260525000058_platform_roles_seed_and_backfill.sql
-- PR #E: seed da role default 'platform_admin' (permissions=['*']) e
-- backfill 1:1 de platform_admins → platform_role_assignments.

-- 1. Seed do role default
insert into public.platform_roles (code, name, description, permissions)
values (
  'platform_admin',
  'Administrador da Plataforma',
  'Bypass total — acesso a todos os dados e RPCs administrativos.',
  array['*']
)
on conflict (code) do nothing;

-- 2. Backfill: todo platform_admin atual vira assignment de 'platform_admin'
insert into public.platform_role_assignments (user_id, role_code, granted_by, granted_at)
select pa.user_id, 'platform_admin', pa.granted_by, pa.granted_at
from public.platform_admins pa
on conflict (user_id, role_code) do nothing;
