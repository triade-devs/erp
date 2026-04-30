-- ============================================================
-- FIX: Permissões do módulo Estoque (inventory) para todas as empresas
-- ============================================================
-- Problema: a migration inicial de permissões de inventory só
-- seeded companies específicas. Empresas criadas posteriormente
-- não receberam as permissões inventory:product:* nos seus roles.
-- Este migration resolve isso de forma idempotente, usando
-- o padrão já estabelecido em 20260425000021_kb_permissions.sql.
-- ============================================================

-- 1. Habilita o módulo inventory para todas as empresas existentes
insert into public.company_modules (company_id, module_code)
select id, 'inventory' from public.companies
on conflict do nothing;

-- 2. Owner: todas as permissões do módulo inventory
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.module_code = 'inventory'
on conflict do nothing;

-- 3. Manager: todas as permissões do módulo inventory
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'manager'
  and p.module_code = 'inventory'
on conflict do nothing;

-- 4. Operator: apenas read e create
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'operator'
  and p.code in ('inventory:product:read', 'inventory:product:create')
on conflict do nothing;
