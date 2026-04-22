-- =============================================================================
-- SNAPSHOT: baseline pre-multitenant
-- Data: 2026-04-22
-- Propósito: Referência de rollback antes da migração multi-tenant (Sprint 0).
--            Este arquivo consolida o estado das migrations existentes como
--            ponto de restauração. Para reverter ao estado single-tenant,
--            aplique as migrations listadas abaixo em ordem.
-- Tag git: pre-multitenant
-- =============================================================================
--
-- Migrations incluídas neste baseline (em ordem de aplicação):
--
--   1. supabase/migrations/20260420_00_init.sql
--   2. supabase/migrations/20260420_01_profiles.sql
--   3. supabase/migrations/20260420_02_products.sql
--   4. supabase/migrations/20260420_03_stock_movements.sql
--   5. supabase/migrations/20260420_04_rls_policies.sql
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 20260420_00_init.sql — Extensões base
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";


-- -----------------------------------------------------------------------------
-- 20260420_01_profiles.sql — Enum de roles e tabela de perfis
-- -----------------------------------------------------------------------------

-- Enum de roles
create type public.user_role as enum ('admin', 'manager', 'operator');

-- Tabela de perfis (espelha auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  role         public.user_role not null default 'operator',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger: cria perfil automaticamente ao criar usuário em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'operator'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 20260420_02_products.sql — Tabela de produtos
-- -----------------------------------------------------------------------------

-- Tabela de produtos
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique,
  name         text not null,
  description  text,
  unit         text not null default 'UN',              -- UN, KG, L, CX, M
  cost_price   numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price   numeric(12,2) not null default 0 check (sale_price >= 0),
  stock        numeric(12,3) not null default 0,        -- Saldo calculado via trigger
  min_stock    numeric(12,3) not null default 0,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índice para busca por SKU
create index idx_products_sku on public.products(sku);

-- Índice full-text para busca por nome em português
create index idx_products_name on public.products
  using gin (to_tsvector('portuguese', name));


-- -----------------------------------------------------------------------------
-- 20260420_03_stock_movements.sql — Movimentações de estoque e trigger
-- -----------------------------------------------------------------------------

-- Enum de tipo de movimentação
create type public.movement_type as enum ('in', 'out', 'adjustment');

-- Tabela de movimentações de estoque
create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete restrict,
  movement_type  public.movement_type not null,
  quantity       numeric(12,3) not null check (quantity > 0),
  unit_cost      numeric(12,2),
  reason         text,
  performed_by   uuid not null references auth.users(id),
  created_at     timestamptz not null default now()
);

-- Índice para histórico por produto
create index idx_stock_movements_product
  on public.stock_movements(product_id, created_at desc);

-- Trigger: atualiza products.stock de forma atômica após cada movimentação
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
as $$
begin
  if new.movement_type = 'in' then
    update public.products
      set stock = stock + new.quantity, updated_at = now()
      where id = new.product_id;

  elsif new.movement_type = 'out' then
    update public.products
      set stock = stock - new.quantity, updated_at = now()
      where id = new.product_id;

    -- Valida saldo negativo no banco (segunda linha de defesa após o service)
    if (select stock from public.products where id = new.product_id) < 0 then
      raise exception 'Estoque insuficiente para o produto %', new.product_id;
    end if;

  elsif new.movement_type = 'adjustment' then
    -- Ajuste absoluto: define o saldo diretamente
    update public.products
      set stock = new.quantity, updated_at = now()
      where id = new.product_id;
  end if;

  return new;
end $$;

create trigger trg_apply_stock_movement
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();


-- -----------------------------------------------------------------------------
-- 20260420_04_rls_policies.sql — RLS e políticas de segurança
-- -----------------------------------------------------------------------------

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
