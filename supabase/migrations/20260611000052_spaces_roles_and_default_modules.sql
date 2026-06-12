-- 20260611000052_spaces_roles_and_default_modules.sql
-- Auditoria pós-redesign de roles (spec 2026-06-10):
-- 1. O módulo spaces estava habilitado em empresas sem nenhuma role dedicada
--    (somente admin alcançava as permissões). Cria templates espacos-gestao e
--    espacos-leitura e instancia as roles em toda empresa com spaces ativo.
-- 2. Remove os módulos hospitalares (medical-records, anestesia) da empresa
--    Default — sobra de testes; ela é perfil estoque. Dados não são apagados.
-- Idempotente: joins fazem os inserts virarem no-op onde os pré-requisitos
-- (role admin, módulo ativo, permissões no catálogo) não existem.

-- ─── 1. Templates de spaces ──────────────────────────────────────────────────
insert into public.role_templates (code, name, description, is_system, sort_order) values
  ('espacos-gestao',  'Gestão de Espaços',  'Gerencia espaços, locações e cancelamentos', true, 60),
  ('espacos-leitura', 'Leitura de Espaços', 'Consulta espaços e locações',                true, 70)
on conflict (code) do nothing;

update public.role_templates set parent_template_code = 'admin'
 where code in ('espacos-gestao', 'espacos-leitura');

insert into public.template_permissions (template_code, permission_code)
select 'espacos-gestao', code from public.permissions where module_code = 'spaces'
on conflict do nothing;

insert into public.template_permissions (template_code, permission_code)
select 'espacos-leitura', p.code
from public.permissions p
where p.code in ('spaces:space:read', 'spaces:rental:read')
on conflict do nothing;

-- ─── 2. Instancia as roles nas empresas com módulo spaces ativo ──────────────
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at, parent_role_id)
select cm.company_id, t.code, t.name, t.description, true, t.code, now(), a.id
from public.company_modules cm
join public.roles a on a.company_id = cm.company_id and a.code = 'admin'
join public.role_templates t on t.code in ('espacos-gestao', 'espacos-leitura')
where cm.module_code = 'spaces'
on conflict (company_id, code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, tp.permission_code, true
from public.roles r
join public.template_permissions tp on tp.template_code = r.template_code
where r.code in ('espacos-gestao', 'espacos-leitura')
on conflict (role_id, permission_code) do nothing;

-- ─── 3. Desabilita módulos hospitalares na Default ──────────────────────────
delete from public.company_modules
where module_code in ('medical-records', 'anestesia')
  and company_id in (select id from public.companies where slug = 'default-company');
