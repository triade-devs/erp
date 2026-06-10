-- 20260526000067_set_role_scopes_rpc.sql
-- PR #G: atualização atômica de escopos de role por dimensão.

create or replace function public.set_role_scopes(
  p_company_id uuid,
  p_role_id uuid,
  p_dimension_code text,
  p_scope_values text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(p_company_id, 'core:role:manage') then
    raise exception 'Sem permissão para gerenciar roles' using errcode = 'P0401';
  end if;

  if not exists (
    select 1 from public.roles
    where id = p_role_id and company_id = p_company_id
  ) then
    raise exception 'Role não encontrada' using errcode = 'P0404';
  end if;

  delete from public.role_scopes
  where role_id = p_role_id
    and dimension_code = p_dimension_code;

  if coalesce(array_length(p_scope_values, 1), 0) > 0 then
    insert into public.role_scopes (role_id, dimension_code, scope_value)
    select p_role_id, p_dimension_code, scope_value
    from unnest(p_scope_values) as scope_value;
  end if;
end $$;

comment on function public.set_role_scopes(uuid, uuid, text, text[]) is
  'PR #G: substitui de forma atômica todos os scopes de uma role em uma dimensão.';
