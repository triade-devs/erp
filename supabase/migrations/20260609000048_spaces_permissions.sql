-- ============================================================
-- 48 — ALUGUEL DE ESPAÇOS — Módulo e Permissões
-- ============================================================

-- Módulo declarativo
insert into public.modules (code, name, is_system, sort_order) values
  ('spaces', 'Aluguel de Espaços', false, 40)
on conflict (code) do nothing;

-- Permissões atômicas
insert into public.permissions (code, module_code, resource, action, description) values
  ('spaces:space:read',    'spaces', 'space',  'read',    'Listar espaços'),
  ('spaces:space:manage',  'spaces', 'space',  'manage',  'Cadastrar, editar e desativar espaços'),
  ('spaces:rental:read',   'spaces', 'rental', 'read',    'Ver aluguéis'),
  ('spaces:rental:create', 'spaces', 'rental', 'create',  'Alugar um espaço'),
  ('spaces:rental:cancel', 'spaces', 'rental', 'cancel',  'Cancelar aluguel de qualquer locatário')
on conflict (code) do nothing;

-- Habilita o módulo para todas as empresas existentes
insert into public.company_modules (company_id, module_code)
select id, 'spaces' from public.companies
on conflict do nothing;

-- Owner: todas as permissões do módulo
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'owner'
  and p.module_code = 'spaces'
on conflict do nothing;

-- Manager: gere espaços + gere e cancela aluguéis
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'manager'
  and p.code in (
    'spaces:space:read',
    'spaces:space:manage',
    'spaces:rental:read',
    'spaces:rental:create',
    'spaces:rental:cancel'
  )
on conflict do nothing;

-- Operator: vê espaços, vê e cria aluguéis (cancela apenas os próprios via RLS)
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'operator'
  and p.code in (
    'spaces:space:read',
    'spaces:rental:read',
    'spaces:rental:create'
  )
on conflict do nothing;
