-- 20260525000057_platform_roles_schema.sql
-- PR #E da evolução de roles: substitui platform_admins boolean por
-- sistema role-based. Abre caminho pra "support staff" read-only sem
-- mudar schema futuramente. Sem mudança comportamental nesta migration
-- (function is_platform_admin reescrita na 059).

-- ─── platform_roles: catálogo global ─────────────────────────────────────────
create table public.platform_roles (
  code         text primary key,
  name         text not null,
  description  text,
  permissions  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.platform_roles enable row level security;

create policy "platform_roles_select" on public.platform_roles
  for select using (auth.uid() is not null);

create policy "platform_roles_write_platform" on public.platform_roles
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.platform_roles is
  'PR #E: catálogo global de platform roles. Permissions é array de codes; ''*'' ou ''platform:*'' = full bypass.';

-- ─── platform_role_assignments: user × role ──────────────────────────────────
create table public.platform_role_assignments (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_code   text not null references public.platform_roles(code) on delete restrict,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role_code)
);
create index idx_pra_user on public.platform_role_assignments(user_id);
create index idx_pra_role on public.platform_role_assignments(role_code);

alter table public.platform_role_assignments enable row level security;

-- Usuário vê próprias atribuições; platform admin vê tudo
create policy "platform_role_assignments_select" on public.platform_role_assignments
  for select using (
    user_id = auth.uid()
    or public.is_platform_admin()
  );

create policy "platform_role_assignments_write_platform" on public.platform_role_assignments
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.platform_role_assignments is
  'PR #E: atribuição N×N user→platform_role. Substitui platform_admins. Drop da tabela antiga em follow-up.';
