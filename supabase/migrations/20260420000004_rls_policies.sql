-- Helper: retorna o role do usuário logado (cached, stable)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─── Habilitar RLS em todas as tabelas ───────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.products        enable row level security;
alter table public.stock_movements enable row level security;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Usuário vê o próprio perfil; admin vê todos
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_user_role() = 'admin');

-- Usuário só edita o próprio perfil
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
-- Qualquer usuário autenticado pode visualizar produtos
create policy "products_select_authenticated"
  on public.products for select
  using (auth.role() = 'authenticated');

-- Somente admin e manager podem criar/editar/deletar produtos
create policy "products_write_manager"
  on public.products for all
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────
-- Qualquer usuário autenticado pode ver movimentações
create policy "movements_select_authenticated"
  on public.stock_movements for select
  using (auth.role() = 'authenticated');

-- Qualquer usuário autenticado pode registrar movimentações (assinado via performed_by)
create policy "movements_insert_authenticated"
  on public.stock_movements for insert
  with check (performed_by = auth.uid());
