-- RPC SECURITY DEFINER: substitui roles de um membership atomicamente.
-- Resolve o deadlock lógico na policy membership_roles_write (FOR ALL USING):
-- o DELETE remove os roles do usuário e o INSERT subsequente falha porque
-- has_permission() retorna false após o DELETE.
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
    if exists (
      select 1 from unnest(p_role_ids) rid
      where not exists (
        select 1 from public.roles r
        where r.id = rid and r.company_id = p_company_id
      )
    ) then
      raise exception 'Uma ou mais roles são inválidas' using errcode = 'P0422';
    end if;
  end if;

  delete from public.membership_roles where membership_id = p_membership_id;

  if array_length(p_role_ids, 1) > 0 then
    insert into public.membership_roles (membership_id, role_id)
    select p_membership_id, rid from unnest(p_role_ids) rid;
  end if;
end $$;
