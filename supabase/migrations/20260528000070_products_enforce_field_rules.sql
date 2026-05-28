-- 20260528000070_products_enforce_field_rules.sql
-- PR #H: trigger BEFORE UPDATE em products. Compara to_jsonb(new) vs
-- to_jsonb(old) por coluna do catálogo; se mudou e modo é hidden/readonly,
-- bloqueia com P0403. Garante que mascaramento client não pode ser burlado
-- via PostgREST direto.

create or replace function public.enforce_field_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_col record;
  v_mode text;
  v_company uuid;
begin
  -- assume NEW tem coluna company_id (tabelas mascaradas precisam ter)
  v_company := new.company_id;

  for v_col in
    select column_name
    from public.field_catalog
    where table_name = TG_TABLE_NAME
  loop
    if to_jsonb(new) -> v_col.column_name
       is distinct from to_jsonb(old) -> v_col.column_name
    then
      v_mode := public.user_field_mode(v_company, TG_TABLE_NAME, v_col.column_name);
      if v_mode in ('hidden','readonly') then
        raise exception 'Coluna % é somente leitura para este usuário', v_col.column_name
          using errcode = 'P0403';
      end if;
    end if;
  end loop;

  return new;
end $$;

comment on function public.enforce_field_rules() is
  'PR #H: trigger handler genérico. Bloqueia UPDATE em coluna readonly/hidden por user.';

create trigger trg_enforce_field_rules_products
  before update on public.products
  for each row execute function public.enforce_field_rules();

comment on trigger trg_enforce_field_rules_products on public.products is
  'PR #H: enforce field-level masking em products.';
