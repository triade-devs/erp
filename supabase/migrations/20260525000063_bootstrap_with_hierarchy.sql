-- 20260525000063_bootstrap_with_hierarchy.sql
-- PR #F: reescreve bootstrap_company_rbac com 2-pass. Pass 1 cria roles
-- (sem parent); pass 2 popula parent_role_id baseado em parent_template_code.

create or replace function public.bootstrap_company_rbac(p_company uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tpl record;
  v_role_id uuid;
begin
  -- Pass 1: criar/atualizar todas as roles a partir dos templates
  for v_tpl in
    select code, name from public.role_templates where is_system order by sort_order
  loop
    insert into public.roles (company_id, code, name, is_system, template_code, template_synced_at)
      values (p_company, v_tpl.code, v_tpl.name, true, v_tpl.code, now())
      on conflict (company_id, code) do update
        set template_code = excluded.template_code,
            template_synced_at = now()
      returning id into v_role_id;

    if v_role_id is null then
      select id into v_role_id
      from public.roles
      where company_id = p_company and code = v_tpl.code;
    end if;

    insert into public.role_permissions (role_id, permission_code, is_active)
      select v_role_id, tp.permission_code, true
      from public.template_permissions tp
      join public.permissions p on p.code = tp.permission_code
      where tp.template_code = v_tpl.code
        and (
          p.module_code = 'core'
          or p.module_code in (
            select module_code from public.company_modules where company_id = p_company
          )
        )
      on conflict do nothing;
  end loop;

  -- Pass 2: popular parent_role_id baseado em parent_template_code
  update public.roles target
  set parent_role_id = parent_role.id
  from public.role_templates tpl
  join public.roles parent_role
    on parent_role.code = tpl.parent_template_code
  where target.template_code = tpl.code
    and target.company_id = p_company
    and parent_role.company_id = target.company_id
    and tpl.parent_template_code is not null
    and target.parent_role_id is distinct from parent_role.id;
end $$;

comment on function public.bootstrap_company_rbac(uuid) is
  'PR #F: 2-pass — Pass 1 cria roles + perms; Pass 2 popula parent_role_id via parent_template_code.';
