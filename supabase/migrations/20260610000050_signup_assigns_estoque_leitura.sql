-- 20260610000050_signup_assigns_estoque_leitura.sql
-- Redesign de roles (spec 2026-06-10): novos signups recebem 'estoque-leitura'
-- na empresa padrão (antes: 'operator', que deixa de existir).

create or replace function public.handle_new_user_default_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_company_id uuid;
  v_membership_id      uuid;
  v_default_role_id    uuid;
begin
  -- 1. Cria ou ignora o profile público do usuário
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- 2. Busca a empresa padrão
  select id into v_default_company_id
  from public.companies
  where slug = 'default-company'
  limit 1;

  if v_default_company_id is null then
    return new;
  end if;

  -- 3. Cria membership como active
  insert into public.memberships (user_id, company_id, status, joined_at)
  values (new.id, v_default_company_id, 'active', now())
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  if v_membership_id is null then
    return new;
  end if;

  -- 4. Atribui role 'estoque-leitura' da empresa padrão (se existir)
  select id into v_default_role_id
  from public.roles
  where company_id = v_default_company_id
    and code = 'estoque-leitura'
  limit 1;

  if v_default_role_id is not null then
    insert into public.membership_roles (membership_id, role_id)
    values (v_membership_id, v_default_role_id)
    on conflict do nothing;
  end if;

  return new;
end $$;
