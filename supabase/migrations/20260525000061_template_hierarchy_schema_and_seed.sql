-- 20260525000061_template_hierarchy_schema_and_seed.sql
-- PR #F: role_templates ganha parent_template_code. Default hierarchy:
-- owner → manager → operator. Backfill aplica parent_role_id nas
-- instâncias existentes baseado no template.

alter table public.role_templates
  add column parent_template_code text references public.role_templates(code) on delete set null;

comment on column public.role_templates.parent_template_code is
  'PR #F: template pai. Bootstrap propaga essa estrutura para parent_role_id em instâncias.';

-- Seed da hierarquia default: owner > manager > operator
update public.role_templates set parent_template_code = 'owner' where code = 'manager';
update public.role_templates set parent_template_code = 'manager' where code = 'operator';

-- Backfill: aplica parent_role_id nas instâncias existentes
-- Para cada role com template_code definido, busca o parent_template_code,
-- encontra a role correspondente na MESMA empresa, e seta parent_role_id.
update public.roles target
set parent_role_id = parent_role.id
from public.role_templates tpl,
     public.roles parent_role
where target.template_code = tpl.code
  and tpl.parent_template_code is not null
  and parent_role.code = tpl.parent_template_code
  and parent_role.company_id = target.company_id
  and target.parent_role_id is null;
