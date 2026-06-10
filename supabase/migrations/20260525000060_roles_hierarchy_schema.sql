-- 20260525000060_roles_hierarchy_schema.sql
-- PR #F da evolução de roles: hierarquia opcional entre roles via
-- parent_role_id (self-ref). hierarchy_level mantido via trigger.
-- Controla 'quem gerencia quem'; NÃO propaga permissões.

alter table public.roles
  add column parent_role_id uuid references public.roles(id) on delete set null,
  add column hierarchy_level int not null default 0;

create index idx_roles_parent on public.roles(parent_role_id);

comment on column public.roles.parent_role_id is
  'PR #F: role pai na hierarquia. NULL = flat. Hierarquia controla gestão (can_manage_role), não autorização de recurso.';
comment on column public.roles.hierarchy_level is
  'PR #F: denormalizado via trigger. 0 = raiz; aumenta a cada nível. Max 10.';

-- Trigger anti-ciclo + auto-set hierarchy_level
create or replace function public.check_role_hierarchy()
returns trigger
language plpgsql as $$
declare
  v_current uuid := new.parent_role_id;
  v_depth int := 0;
begin
  if new.parent_role_id is null then
    new.hierarchy_level := 0;
    return new;
  end if;

  -- Parent precisa estar na mesma empresa
  if not exists (
    select 1 from public.roles r
    where r.id = new.parent_role_id and r.company_id = new.company_id
  ) then
    raise exception 'parent_role_id deve referenciar role na mesma empresa' using errcode = 'P0001';
  end if;

  while v_current is not null loop
    if v_current = new.id then
      raise exception 'Ciclo detectado em hierarquia de roles' using errcode = 'P0001';
    end if;
    v_depth := v_depth + 1;
    if v_depth > 10 then
      raise exception 'Profundidade máxima de hierarquia excedida (10)' using errcode = 'P0001';
    end if;
    select parent_role_id into v_current from public.roles where id = v_current;
  end loop;

  new.hierarchy_level := v_depth;
  return new;
end $$;

create trigger trg_check_role_hierarchy
  before insert or update of parent_role_id on public.roles
  for each row execute function public.check_role_hierarchy();

comment on function public.check_role_hierarchy() is
  'PR #F: valida parent_role_id (mesma empresa, sem ciclo, max depth 10) e seta hierarchy_level automaticamente.';
