-- PR #36: Remove profiles.role, current_user_role() e o enum user_role (legado single-tenant)
-- As policies de products e stock_movements já foram substituídas pelas migrations S5
-- (20260423_15_products_rls.sql e 20260423_16_movements_rls.sql) com RBAC multitenant.

-- ─── 1. Dropar policies que dependem de current_user_role() ──────────────────
-- products_write_manager: substituída pelas policies products_insert/update/delete da migration 15
drop policy if exists "products_write_manager" on public.products;

-- products_select_authenticated: substituída pela policy products_select da migration 15
drop policy if exists "products_select_authenticated" on public.products;

-- movements_select_authenticated / movements_insert_authenticated: substituídas pela migration 16
drop policy if exists "movements_select_authenticated" on public.stock_movements;
drop policy if exists "movements_insert_authenticated" on public.stock_movements;

-- profiles_select_own_or_admin: depende de current_user_role(), será recriada abaixo
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

-- ─── 2. Recriar policy de profiles sem current_user_role() ───────────────────
-- No modelo multitenant, cada usuário vê apenas o próprio perfil.
-- Admins de empresa enxergam membros via memberships (não via profiles diretamente).
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- ─── 3. Dropar a função helper legada ────────────────────────────────────────
drop function if exists public.current_user_role();

-- ─── 4. Dropar a coluna role de profiles ─────────────────────────────────────
alter table public.profiles drop column if exists role;

-- ─── 5. Dropar o enum user_role (não é mais usado em lugar algum) ─────────────
drop type if exists public.user_role;

-- ─── 6. Recriar profiles_update_own sem alteração semântica ─────────────────
-- Policy não usava current_user_role(), mas é recriada aqui para documentar
-- que foi revisada neste PR e mantida intencionalmente.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── 7. Recriar trigger handle_new_user sem o campo role ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end $$;
