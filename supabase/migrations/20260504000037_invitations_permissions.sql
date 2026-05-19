-- ============================================================
-- 37 — SMTP-Free Auth: permissões de convite e reset de senha
-- ============================================================

-- Novas permissões no módulo 'core'
insert into public.permissions (code, module_code, resource, action, description) values
  ('core:invitation:create',     'core', 'invitation',    'create',  'Criar convites de membro'),
  ('core:invitation:read',       'core', 'invitation',    'read',    'Ver convites pendentes'),
  ('core:invitation:revoke',     'core', 'invitation',    'revoke',  'Revogar convites'),
  ('core:reset_request:read',    'core', 'reset_request', 'read',    'Ver solicitações de reset'),
  ('core:reset_request:approve', 'core', 'reset_request', 'approve', 'Aprovar resets de senha')
on conflict (code) do nothing;

-- Owner: todas as novas permissões
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.code in (
    'core:invitation:create',
    'core:invitation:read',
    'core:invitation:revoke',
    'core:reset_request:read',
    'core:reset_request:approve'
  )
on conflict do nothing;

-- Admin: mesmas permissões que owner (gerencie membros)
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'admin'
  and p.code in (
    'core:invitation:create',
    'core:invitation:read',
    'core:invitation:revoke',
    'core:reset_request:read',
    'core:reset_request:approve'
  )
on conflict do nothing;
