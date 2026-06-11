-- 20260611000051_explicit_table_grants.sql
-- O supabase CLI v2.106.0 (2026-06-11) endureceu os default privileges do
-- banco local: tabelas criadas por migrations deixaram de receber DML para
-- anon/authenticated/service_role (sobram apenas references/trigger/truncate).
-- O projeto dependia do comportamento antigo — nenhuma migration declarava
-- grants de tabela. Esta migration torna os grants explícitos, espelhando o
-- estado do banco hospedado (produção), onde os grants já existem (no-op lá).
-- A segurança de linha continua 100% por RLS — o CI verifica que toda tabela
-- de public tem RLS habilitado.

grant usage on schema public to anon, authenticated, service_role;

-- Tabelas existentes
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

-- Sequences (parity com default da plataforma)
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- Tabelas/sequences futuras criadas pelo papel que aplica migrations
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

-- Reaplica a exceção de imutabilidade do audit log (migration 005):
-- o grant amplo acima não pode reabrir update/delete em audit_logs.
revoke update, delete on public.audit_logs from public, anon, authenticated;
