-- 20260528000069_field_mode_helpers.sql
-- PR #H: helpers para resolver modo efetivo de campo por user.
-- Regra de combinação: para um user com N roles, o modo mais restritivo
-- vence. Ordem: hidden > readonly > editable. Sem rule em nenhuma
-- role = editable (backward-compat).

create or replace function public.user_field_mode(
  p_company uuid, p_table text, p_column text
) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_modes text[];
begin
  if public.is_platform_admin() then
    return 'editable';
  end if;

  select array_agg(distinct rfr.mode) into v_modes
  from public.memberships m
  join public.membership_roles mr on mr.membership_id = m.id
  join public.role_field_rules rfr on rfr.role_id = mr.role_id
  where m.user_id = auth.uid()
    and m.company_id = p_company
    and m.status = 'active'
    and rfr.table_name = p_table
    and rfr.column_name = p_column;

  if v_modes is null then return 'editable'; end if;
  if 'hidden'   = any(v_modes) then return 'hidden';   end if;
  if 'readonly' = any(v_modes) then return 'readonly'; end if;
  return 'editable';
end $$;

comment on function public.user_field_mode(uuid, text, text) is
  'PR #H: resolve modo efetivo (hidden/readonly/editable) por user×company×coluna. Mais restritivo vence.';

create or replace function public.visible_columns(p_company uuid, p_table text)
returns setof text
language sql stable security definer set search_path = public as $$
  select column_name from public.field_catalog
  where table_name = p_table
    and public.user_field_mode(p_company, p_table, column_name) <> 'hidden';
$$;

comment on function public.visible_columns(uuid, text) is
  'PR #H: setof colunas do catálogo que NÃO estão hidden para o user atual.';
