-- 20260525000064_scope_dimensions_and_role_scopes.sql
-- PR #G da evolução de roles: scopes dimensionais.
-- Role sem scope = irrestrita; role com scope = restrita ao conjunto.
-- Múltiplas dimensões = interseção. User com N roles = união.
-- Catálogo de dimensões em scope_dimensions; atribuições em role_scopes.

-- ─── scope_dimensions: catálogo global ───────────────────────────────────────
create table public.scope_dimensions (
  code         text primary key,
  name         text not null,
  description  text,
  resolver_fn  text,
  created_at   timestamptz not null default now()
);

alter table public.scope_dimensions enable row level security;

create policy "scope_dimensions_select" on public.scope_dimensions
  for select using (auth.uid() is not null);

create policy "scope_dimensions_write_platform" on public.scope_dimensions
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.scope_dimensions is
  'Catálogo global de dimensões de escopo (warehouse, cost_center, etc.). Fonte única de verdade.';

-- ─── role_scopes: atribuição de scope a role ─────────────────────────────────
create table public.role_scopes (
  role_id        uuid not null references public.roles(id) on delete cascade,
  dimension_code text not null references public.scope_dimensions(code) on delete restrict,
  scope_value    text not null,
  granted_at     timestamptz not null default now(),
  primary key (role_id, dimension_code, scope_value)
);

create index idx_role_scopes_role on public.role_scopes(role_id);
create index idx_role_scopes_dim_value on public.role_scopes(dimension_code, scope_value);

alter table public.role_scopes enable row level security;

create policy "role_scopes_select" on public.role_scopes
  for select using (
    role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
    or public.is_platform_admin()
  );

create policy "role_scopes_write" on public.role_scopes
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_scopes.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_scopes.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  );

comment on table public.role_scopes is
  'Atribuições de scope a roles. Role sem linhas em role_scopes(dim=X) = acesso irrestrito a X. Múltiplas dimensões = interseção.';

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.user_scope_values(p_company uuid, p_dimension text)
returns setof text language plpgsql stable security definer set search_path = public as $$
declare v_has_unrestricted boolean;
begin
  if is_platform_admin() then return query select '*'::text; return; end if;

  select exists (
    select 1 from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
      and not exists (
        select 1 from role_scopes rs
        where rs.role_id = mr.role_id and rs.dimension_code = p_dimension
      )
  ) into v_has_unrestricted;

  if v_has_unrestricted then return query select '*'::text; return; end if;

  return query
    select distinct rs.scope_value from memberships m
    join membership_roles mr on mr.membership_id = m.id
    join role_scopes rs on rs.role_id = mr.role_id
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
      and rs.dimension_code = p_dimension;
end $$;

comment on function public.user_scope_values(uuid, text) is
  'Retorna os valores de scope acessíveis ao usuário atual em uma dimensão de uma empresa. Se uma role não tem scopes nessa dimensão, acesso é irrestrito ('*'). User com múltiplas roles = união.';

create or replace function public.user_has_scope(p_company uuid, p_dimension text, p_value text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists(select 1 from user_scope_values(p_company, p_dimension) v
                where v = '*' or v = p_value);
$$;

comment on function public.user_has_scope(uuid, text, text) is
  'Verifica se usuário atual tem acesso a um valor específico em uma dimensão. Usado em RLS policies e triggers de validação.';
