-- ============================================================
-- 35 — SMTP-Free Auth: tabelas company_invitations, password_reset_requests
-- ============================================================

create extension if not exists citext;

-- Tabela de convites por empresa
create table public.company_invitations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  email           citext not null,
  token_hash      bytea not null,
  short_code      text not null,
  role_ids        uuid[] not null default '{}',
  invited_by      uuid not null references auth.users(id),
  status          text not null default 'pending'
                  check (status in ('pending','accepted','revoked','expired')),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id),
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create unique index ux_company_invitations_short_code
  on public.company_invitations(short_code);
create index idx_company_invitations_company
  on public.company_invitations(company_id);
create index idx_company_invitations_email
  on public.company_invitations(email);
create index idx_company_invitations_token
  on public.company_invitations(token_hash);

-- Garante 1 convite pendente ativo por (company, email)
create unique index ux_company_invitations_pending_unique
  on public.company_invitations(company_id, email)
  where status = 'pending';

alter table public.company_invitations enable row level security;

-- Tabela de solicitações de reset de senha
create table public.password_reset_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           citext not null,
  token_hash      bytea,
  short_code      text,
  status          text not null default 'pending_review'
                  check (status in ('pending_review','approved','consumed','revoked','expired')),
  source          text not null check (source in ('user_request','owner_initiated')),
  requested_at    timestamptz not null default now(),
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  consumed_at     timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users(id),
  metadata        jsonb not null default '{}'::jsonb
);

create index idx_password_reset_user
  on public.password_reset_requests(user_id);
create index idx_password_reset_status
  on public.password_reset_requests(status);
create unique index ux_password_reset_short_code
  on public.password_reset_requests(short_code) where short_code is not null;
create unique index ux_password_reset_active_per_user
  on public.password_reset_requests(user_id)
  where status in ('pending_review','approved');

alter table public.password_reset_requests enable row level security;
