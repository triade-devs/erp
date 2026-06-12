-- ============================================================
-- 46 — ALUGUEL DE ESPAÇOS
-- Espaços alugáveis por empresa + reservas (diárias ou por hora)
-- com prevenção de sobreposição garantida no banco.
-- ============================================================

-- Permite índices GiST combinando igualdade (=) com operador de range (&&)
create extension if not exists btree_gist;

-- Enums
create type public.space_booking_mode as enum ('daily', 'hourly', 'both');
create type public.rental_kind        as enum ('daily', 'hourly');
create type public.rental_status      as enum ('confirmed', 'cancelled');

-- 1) Espaços
create table public.spaces (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  description   text,
  location      text,
  capacity      int check (capacity is null or capacity > 0),
  default_price numeric(12,2) not null default 0 check (default_price >= 0), -- 0 = grátis
  booking_mode  public.space_booking_mode not null default 'both',
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_spaces_company on public.spaces(company_id);
create index idx_spaces_name on public.spaces
  using gin (to_tsvector('portuguese', name));

-- 2) Aluguéis / reservas
create table public.space_rentals (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  space_id        uuid not null references public.spaces(id) on delete restrict,
  renter_user_id  uuid not null references auth.users(id),         -- responsável pelo aluguel
  booking_kind    public.rental_kind not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  -- Range usado para detectar sobreposição (reserva por dia vira um intervalo de timestamps)
  period          tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  price           numeric(12,2) not null default 0 check (price >= 0), -- 0 = alugado de graça
  status          public.rental_status not null default 'confirmed',
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint space_rentals_period_valid check (ends_at > starts_at)
);

create index idx_space_rentals_space on public.space_rentals(space_id, starts_at);
create index idx_space_rentals_company on public.space_rentals(company_id);
create index idx_space_rentals_renter on public.space_rentals(renter_user_id);
create index idx_space_rentals_period on public.space_rentals using gist (period);

-- Fonte da verdade: dois aluguéis confirmados do mesmo espaço não podem se sobrepor.
-- Tentativa de inserir período ocupado falha com erro 23P01 (exclusion_violation).
alter table public.space_rentals
  add constraint space_rentals_no_overlap
  exclude using gist (space_id with =, period with &&)
  where (status = 'confirmed');
