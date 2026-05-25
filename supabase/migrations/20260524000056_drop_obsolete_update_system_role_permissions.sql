-- 20260524000056_drop_obsolete_update_system_role_permissions.sql
-- PR #D3: RPC update_system_role_permissions é obsoleta. Workflow novo:
-- editar template_permissions e aplicar via apply_template_to_company.

drop function if exists public.update_system_role_permissions(text, text[]);
