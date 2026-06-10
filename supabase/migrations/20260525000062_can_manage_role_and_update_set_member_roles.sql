-- 20260525000062_can_manage_role_and_update_set_member_roles.sql
-- PR #F: helper can_manage_role + atualização do RPC set_member_roles
-- para validar a hierarquia antes de atribuir.

-- Helper: actor pode gerenciar target_role?
-- Regra: target é descendente (transitivo) de alguma role do actor, OU actor
-- é platform admin. Roles sem parent (flat) só são "gerenciáveis" por quem
-- tem perm core:role:manage E também é membership_role do mesmo company —
-- mas neste helper focamos só na hierarquia. A perm geral é checada pela
-- policy/RPC caller.
create or replace function public.can_manage_role(p_company uuid, p_target_role uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with recursive actor_roles as (
    select r.id, r.parent_role_id, r.company_id
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.roles r on r.id = mr.role_id
    where m.user_id = auth.uid()
      and m.company_id = p_company
      and m.status = 'active'
  ),
  descendants as (
    select id, parent_role_id from public.roles
    where parent_role_id in (select id from actor_roles)
      and company_id = p_company
    union all
    select r.id, r.parent_role_id from public.roles r
    join descendants d on r.parent_role_id = d.id
    where r.company_id = p_company
  )
  select public.is_platform_admin()
      or exists(select 1 from descendants where id = p_target_role);
$$;

comment on function public.can_manage_role(uuid, uuid) is
  'PR #F: actor pode gerenciar target_role? True se platform admin OU target é descendente transitivo de alguma role do actor. Hierarquia controla gestão, não autorização.';

-- Atualizar set_member_roles para validar can_manage_role para cada role
-- antes do delete/insert.
create or replace function public.set_member_roles(
  p_company_id    uuid,
  p_membership_id uuid,
  p_role_ids      uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(p_company_id, 'core:member:manage') then
    raise exception 'Sem permissão para gerenciar membros' using errcode = 'P0401';
  end if;

  if not exists (
    select 1 from public.memberships
    where id = p_membership_id and company_id = p_company_id
  ) then
    raise exception 'Membro não encontrado' using errcode = 'P0404';
  end if;

  if array_length(p_role_ids, 1) > 0 then
    -- Validar que todas as roles são da empresa
    if exists (
      select 1 from unnest(p_role_ids) rid
      where not exists (
        select 1 from public.roles r
        where r.id = rid and r.company_id = p_company_id
      )
    ) then
      raise exception 'Uma ou mais roles são inválidas' using errcode = 'P0422';
    end if;

    -- PR #F: validar que actor pode gerenciar cada role na hierarquia
    if exists (
      select 1 from unnest(p_role_ids) rid
      where not public.can_manage_role(p_company_id, rid)
    ) then
      raise exception 'Sem permissão hierárquica para atribuir uma ou mais roles'
        using errcode = 'P0403';
    end if;
  end if;

  delete from public.membership_roles where membership_id = p_membership_id;

  if array_length(p_role_ids, 1) > 0 then
    insert into public.membership_roles (membership_id, role_id)
    select p_membership_id, rid from unnest(p_role_ids) rid;
  end if;
end $$;
