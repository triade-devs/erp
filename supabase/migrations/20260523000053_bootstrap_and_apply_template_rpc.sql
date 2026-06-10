-- 20260523000053_bootstrap_and_apply_template_rpc.sql
-- PR #D1: substitui bootstrap_company_rbac por versão que itera templates.
-- Cria apply_template_to_company para resync per role. Trigger zera
-- template_synced_at quando role_permissions divergem do template.

-- ─── bootstrap_company_rbac: reescrita usando templates ──────────────────────
create or replace function public.bootstrap_company_rbac(p_company uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tpl record;
  v_role_id uuid;
begin
  for v_tpl in
    select code, name from public.role_templates where is_system order by sort_order
  loop
    -- Cria/recupera instância
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

    -- Aplica permissões do template, filtradas pelos módulos habilitados
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
end $$;

comment on function public.bootstrap_company_rbac(uuid) is
  'PR #D1: itera role_templates(is_system) e instancia roles + permissions por empresa, filtrando perms por module_code em company_modules.';

-- ─── apply_template_to_company: resync de uma role específica ────────────────
create or replace function public.apply_template_to_company(
  p_company uuid,
  p_template_code text,
  p_force boolean default false
) returns table (role_id uuid, perms_added int, perms_removed int)
language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
  v_synced_at timestamptz;
  v_added int := 0;
  v_removed int := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito a platform admins' using errcode = 'P0401';
  end if;

  if not exists (select 1 from public.role_templates where code = p_template_code) then
    raise exception 'Template % não existe', p_template_code using errcode = 'P0404';
  end if;

  select r.id, r.template_synced_at into v_role_id, v_synced_at
  from public.roles r
  where r.company_id = p_company and r.code = p_template_code;

  if v_role_id is null then
    raise exception 'Empresa % não tem instância da role %', p_company, p_template_code
      using errcode = 'P0404';
  end if;

  -- Se divergente e sem force, pular
  if v_synced_at is null and not p_force then
    raise exception 'Role % divergiu do template; use p_force=true para sobrescrever',
      p_template_code using errcode = 'P0409';
  end if;

  -- Calcula diff: remove perms que não estão mais no template + filtradas
  with target_perms as (
    select tp.permission_code
    from public.template_permissions tp
    join public.permissions p on p.code = tp.permission_code
    where tp.template_code = p_template_code
      and (
        p.module_code = 'core'
        or p.module_code in (
          select module_code from public.company_modules where company_id = p_company
        )
      )
  ),
  current_perms as (
    select permission_code from public.role_permissions
    where role_id = v_role_id and is_active = true
  ),
  removed as (
    delete from public.role_permissions
    where role_id = v_role_id
      and permission_code in (
        select permission_code from current_perms
        except select permission_code from target_perms
      )
    returning 1
  ),
  added as (
    insert into public.role_permissions (role_id, permission_code, is_active)
      select v_role_id, permission_code, true
      from target_perms
      where permission_code not in (select permission_code from current_perms)
      on conflict (role_id, permission_code) do update set is_active = true
      returning 1
  )
  select (select count(*) from added), (select count(*) from removed)
  into v_added, v_removed;

  -- Marca como sincronizada (atualização explícita após trigger zerar)
  update public.roles set template_synced_at = now() where id = v_role_id;

  return query select v_role_id, v_added, v_removed;
end $$;

revoke all on function public.apply_template_to_company(uuid, text, boolean) from public, anon;
grant execute on function public.apply_template_to_company(uuid, text, boolean) to authenticated;

comment on function public.apply_template_to_company(uuid, text, boolean) is
  'PR #D1: resync de uma role com seu template. Pula se divergente (synced_at IS NULL) salvo p_force=true. Retorna (role_id, perms_added, perms_removed).';

-- ─── Trigger: zera template_synced_at quando role_permissions diverge ────────
create or replace function public.mark_template_divergence()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
begin
  v_role_id := coalesce(new.role_id, old.role_id);

  -- Só zera se a role aponta para um template
  update public.roles
    set template_synced_at = null
    where id = v_role_id and template_code is not null;

  return coalesce(new, old);
end $$;

create trigger trg_role_permissions_mark_divergence
  after insert or update or delete on public.role_permissions
  for each row execute function public.mark_template_divergence();

comment on function public.mark_template_divergence() is
  'PR #D1: zera roles.template_synced_at quando role_permissions é alterado, sinalizando divergência. apply_template_to_company re-marca synced ao final.';
