-- ============================================================
-- 39 — SMTP-Free Auth: confirmar email de usuários não-confirmados
-- ============================================================
-- Usuários criados antes do SMTP-free flow têm email_confirmed_at = null
-- (Supabase exige confirmação para login). Este backfill os ativa.
-- IMPORTANTE: verificar que trg_on_auth_user_confirmed não dispara em massa.
-- O trigger handle_new_user_default_membership só dispara em INSERT, não UPDATE.

update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
