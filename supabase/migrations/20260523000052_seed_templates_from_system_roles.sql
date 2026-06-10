-- 20260523000052_seed_templates_from_system_roles.sql
-- PR #D1: popula role_templates e template_permissions a partir do estado
-- atual das system roles (owner/manager/operator). Marca instâncias existentes
-- como sincronizadas (template_synced_at = now()).
--
-- Lógica de seed:
--   - Para cada role.code distinto com is_system=true: cria template.
--   - Permissões do template: união das permissões observadas em todas as
--     instâncias daquela role.code. Tenant que diverge em uma perm específica
--     vai aparecer divergente após apply do template no futuro.

-- 1. Inserir templates (idempotente)
insert into public.role_templates (code, name, description, is_system, sort_order)
select distinct
  r.code,
  initcap(r.name),
  case r.code
    when 'owner'    then 'Acesso total à empresa'
    when 'manager'  then 'Gestão operacional de módulos habilitados'
    when 'operator' then 'Leitura e criação em módulos habilitados'
    else null
  end,
  true,
  case r.code
    when 'owner' then 0
    when 'manager' then 10
    when 'operator' then 20
    else 100
  end
from public.roles r
where r.is_system
on conflict (code) do nothing;

-- 2. Inserir template_permissions (união das perms observadas)
insert into public.template_permissions (template_code, permission_code)
select distinct r.code, rp.permission_code
from public.roles r
join public.role_permissions rp on rp.role_id = r.id
where r.is_system
  and rp.is_active = true
on conflict do nothing;

-- 3. Vincular instâncias existentes ao template e marcar sincronizadas
update public.roles
  set template_code = code,
      template_synced_at = now()
  where is_system
    and template_code is null;
