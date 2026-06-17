-- ============================================================
-- Anestesia — Módulo e Permissões (sem dados, apenas permissões)
-- ============================================================

INSERT INTO public.modules (code, name, is_system, sort_order) VALUES
  ('anestesia', 'Anestesia', false, 40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (code, module_code, resource, action, description) VALUES
  ('anestesia:ficha:read',  'anestesia', 'ficha', 'read',  'Visualizar e acessar fichas de anestesia'),
  ('anestesia:ficha:write', 'anestesia', 'ficha', 'write', 'Preencher e editar fichas de anestesia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.company_modules (company_id, module_code)
SELECT id, 'anestesia' FROM public.companies
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code IN ('owner', 'manager')
  AND p.module_code = 'anestesia'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'operator'
  AND p.code = 'anestesia:ficha:read'
ON CONFLICT DO NOTHING;
