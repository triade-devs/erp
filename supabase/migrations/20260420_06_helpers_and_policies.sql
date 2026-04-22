-- ============================================================
-- FUNÇÕES HELPER DE CONTEXTO
-- ============================================================

-- Retorna todas as empresas em que o usuário logado tem membership ativo
create or replace function public.user_company_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.memberships
  where user_id = auth.uid() and status = 'active'
$$;

-- Confirma se o usuário é admin global da plataforma
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- Confirma se o usuário tem uma permissão específica numa empresa
create or replace function public.has_permission(p_company uuid, p_permission text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.user_id = auth.uid()
      and m.company_id = p_company
      and m.status = 'active'
      and rp.permission_code = p_permission
  )
$$;

-- ============================================================
-- FUNÇÃO DE BOOTSTRAP DE RBAC POR EMPRESA
-- ============================================================
create or replace function public.bootstrap_company_rbac(p_company uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner_role    uuid;
  v_manager_role  uuid;
  v_operator_role uuid;
begin
  insert into public.roles (company_id, code, name, is_system)
    values (p_company, 'owner',    'Owner',    true) returning id into v_owner_role;
  insert into public.roles (company_id, code, name, is_system)
    values (p_company, 'manager',  'Gerente',  true) returning id into v_manager_role;
  insert into public.roles (company_id, code, name, is_system)
    values (p_company, 'operator', 'Operador', true) returning id into v_operator_role;

  -- Owner: todas as permissões dos módulos habilitados + core
  insert into public.role_permissions (role_id, permission_code)
  select v_owner_role, p.code
  from public.permissions p
  where p.module_code = 'core'
     or p.module_code in (
       select module_code from public.company_modules where company_id = p_company
     );

  -- Manager: CRUD dos módulos habilitados (sem core:role:manage)
  insert into public.role_permissions (role_id, permission_code)
  select v_manager_role, p.code
  from public.permissions p
  where p.module_code in (
      select module_code from public.company_modules where company_id = p_company
    )
     or p.code in ('core:audit:read', 'core:member:invite');

  -- Operator: somente read + create dos módulos habilitados
  insert into public.role_permissions (role_id, permission_code)
  select v_operator_role, p.code
  from public.permissions p
  where p.action in ('read', 'create')
    and p.module_code in (
      select module_code from public.company_modules where company_id = p_company
    );
end $$;

-- ============================================================
-- POLICIES RLS — COMPANIES
-- ============================================================
create policy "companies_select" on public.companies
  for select using (
    public.is_platform_admin()
    or id in (select public.user_company_ids())
  );

create policy "companies_insert_platform" on public.companies
  for insert with check (public.is_platform_admin());

create policy "companies_update_platform_or_owner" on public.companies
  for update using (
    public.is_platform_admin()
    or exists (
      select 1 from public.memberships
      where user_id = auth.uid() and company_id = companies.id and is_owner
    )
  );

-- ============================================================
-- POLICIES RLS — MEMBERSHIPS
-- ============================================================
create policy "memberships_select" on public.memberships
  for select using (
    public.is_platform_admin()
    or user_id = auth.uid()
    or company_id in (select public.user_company_ids())
  );

create policy "memberships_insert" on public.memberships
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'core:member:invite')
  );

create policy "memberships_update" on public.memberships
  for update using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'core:member:manage')
  );

-- ============================================================
-- POLICIES RLS — ROLES e ROLE_PERMISSIONS
-- ============================================================
create policy "roles_select" on public.roles
  for select using (company_id in (select public.user_company_ids()));

create policy "roles_write" on public.roles
  for all using (public.has_permission(company_id, 'core:role:manage'))
  with check (public.has_permission(company_id, 'core:role:manage'));

create policy "role_permissions_select" on public.role_permissions
  for select using (
    role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
  );

create policy "role_permissions_write" on public.role_permissions
  for all using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  );

-- ============================================================
-- POLICIES RLS — COMPANY_MODULES
-- ============================================================
create policy "company_modules_select" on public.company_modules
  for select using (company_id in (select public.user_company_ids()));

create policy "company_modules_write_platform" on public.company_modules
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================
-- POLICIES RLS — AUDIT_LOGS
-- ============================================================
create policy "audit_logs_select" on public.audit_logs
  for select using (
    public.is_platform_admin()
    or (company_id is not null and public.has_permission(company_id, 'core:audit:read'))
  );

create policy "audit_logs_insert" on public.audit_logs
  for insert with check (true);

-- ============================================================
-- POLICIES RLS — PLATFORM_ADMINS (leitura restrita)
-- ============================================================
create policy "platform_admins_select" on public.platform_admins
  for select using (public.is_platform_admin() or user_id = auth.uid());

create policy "platform_admins_write_platform" on public.platform_admins
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================
-- POLICIES RLS — MODULES e PERMISSIONS (catálogos globais — leitura livre para autenticados)
-- ============================================================
create policy "modules_select" on public.modules
  for select using (auth.uid() is not null);

create policy "permissions_select" on public.permissions
  for select using (auth.uid() is not null);

-- ============================================================
-- POLICIES RLS — MEMBERSHIP_ROLES
-- ============================================================
create policy "membership_roles_select" on public.membership_roles
  for select using (
    membership_id in (
      select id from public.memberships
      where company_id in (select public.user_company_ids())
    )
  );

create policy "membership_roles_write" on public.membership_roles
  for all using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_roles.membership_id
        and public.has_permission(m.company_id, 'core:member:manage')
    )
  );
