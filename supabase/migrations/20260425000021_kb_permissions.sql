-- ============================================================
-- 21 — KNOWLEDGE BASE — Módulo e Permissões
-- ============================================================

-- Módulo declarativo
insert into public.modules (code, name, is_system, sort_order) values
  ('knowledge-base', 'Base de Conhecimento', false, 30);

-- Permissões atômicas
insert into public.permissions (code, module_code, resource, action, description) values
  ('kb:article:read',    'knowledge-base', 'article', 'read',    'Ver artigos do manual'),
  ('kb:article:write',   'knowledge-base', 'article', 'write',   'Criar e editar artigos'),
  ('kb:article:publish', 'knowledge-base', 'article', 'publish', 'Publicar e despublicar artigos'),
  ('kb:doc:read',        'knowledge-base', 'doc',     'read',    'Ver documentação técnica'),
  ('kb:ai:use',          'knowledge-base', 'ai',      'use',     'Usar copiloto de IA');

-- Habilita o módulo para todas as empresas existentes
insert into public.company_modules (company_id, module_code)
select id, 'knowledge-base' from public.companies
on conflict do nothing;

-- Atribui permissões às roles de todas as empresas existentes
-- Owner: todas as permissões do módulo
update public.role_permissions rp
set role_id = rp.role_id  -- no-op update para acionar ON CONFLICT
from public.roles r
where rp.role_id = r.id
  and r.code = 'owner';

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.module_code = 'knowledge-base'
on conflict do nothing;

-- Manager: write + publish + read + doc:read
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'manager'
  and p.code in ('kb:article:read', 'kb:article:write', 'kb:article:publish', 'kb:doc:read', 'kb:ai:use')
on conflict do nothing;

-- Operator: read + ai:use
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'operator'
  and p.code in ('kb:article:read', 'kb:ai:use')
on conflict do nothing;
