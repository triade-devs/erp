-- 20260522000046_role_permissions_is_active.sql
-- PR #A da evolução de roles: soft-deactivate de role_permissions
-- quando módulo é desligado. has_permission() ainda não filtra por isto
-- (próxima PR #B). Default true mantém retrocompatibilidade.

alter table public.role_permissions
  add column is_active boolean not null default true;

-- Index parcial: queries quentes filtram por is_active=true. Index parcial
-- reduz tamanho mantendo benefício para o caso comum.
create index if not exists idx_role_permissions_active
  on public.role_permissions (role_id, permission_code)
  where is_active = true;

comment on column public.role_permissions.is_active is
  'Marca lógica de ativação. false = preservado mas ignorado por has_permission a partir do PR #B.';
