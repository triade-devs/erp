-- ============================================================
-- Trigger: cria membership padrão em default-company para novos usuários
-- Ativo apenas enquanto MULTITENANCY_ENABLED = false (fase de migração)
-- ============================================================

create or replace function public.handle_new_user_default_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_company_id uuid;
  v_membership_id      uuid;
  v_operator_role_id   uuid;
begin
  -- Busca a empresa padrão (criada no Sprint 1)
  select id into v_default_company_id
  from public.companies
  where slug = 'default-company'
  limit 1;

  -- Se não existir empresa padrão, não faz nada (ambiente novo)
  if v_default_company_id is null then
    return new;
  end if;

  -- Cria membership como active (não 'invited' — é cadastro próprio)
  insert into public.memberships (user_id, company_id, status, is_owner, joined_at)
  values (new.id, v_default_company_id, 'active', false, now())
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  -- Se o INSERT foi ignorado (conflito), não atribui role novamente
  if v_membership_id is null then
    return new;
  end if;

  -- Busca a role 'operator' da empresa padrão
  select id into v_operator_role_id
  from public.roles
  where company_id = v_default_company_id
    and code = 'operator'
  limit 1;

  -- Atribui a role operator se existir
  if v_operator_role_id is not null then
    insert into public.membership_roles (membership_id, role_id)
    values (v_membership_id, v_operator_role_id)
    on conflict do nothing;
  end if;

  return new;
end $$;

-- Remove trigger anterior se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Cria trigger AFTER INSERT em auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_default_membership();
