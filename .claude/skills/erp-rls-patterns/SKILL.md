---
name: erp-rls-patterns
description: Use when creating RLS policies, writing migrations with permissions, or verifying that table access works correctly for different user types in the triade-devs/erp project.
---

# ERP RLS Patterns

## Overview

RLS failures are **completely silent** — a blocked query returns 0 rows, not an error. Writing policies is not enough; you must verify them for every user type.

## Platform Admins: `has_permission()` Already Covers Them

Since migration `20260523000047_has_permission_absorbs_platform_admin.sql`, `has_permission()` starts with `select public.is_platform_admin() or ...` — platform admins pass every `has_permission()` check automatically. It also requires `role_permissions.is_active = true` (migration 046).

```sql
-- ✅ Correct — has_permission() alone covers regular users AND platform admins
create policy "my_select"
  on public.my_table for select
  using (public.has_permission(company_id, 'module:resource:read'));

-- ❌ Redundant — do NOT add the OR; migration 048 removed it from all policies
create policy "my_select"
  on public.my_table for select
  using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:read')
  );
```

Use `is_platform_admin()` **alone** only for platform-gated tables (no company permission involved), e.g. `role_templates`, `platform_roles`. Since migration 059 it reads `platform_role_assignments → platform_roles` (the old `platform_admins` table is deprecated).

## Policy Skeleton

```sql
-- SELECT
create policy "table_select"
  on public.my_table for select
  using (public.has_permission(company_id, 'module:resource:read'));

-- INSERT
create policy "table_insert"
  on public.my_table for insert
  with check (
    public.has_permission(company_id, 'module:resource:write')
    and created_by = auth.uid()  -- enforce authorship when applicable
  );

-- UPDATE
create policy "table_update"
  on public.my_table for update
  using (public.has_permission(company_id, 'module:resource:write'))
  with check (public.has_permission(company_id, 'module:resource:write'));

-- DELETE
create policy "table_delete"
  on public.my_table for delete
  using (public.has_permission(company_id, 'module:resource:write'));
```

## Migration Checklist

- [ ] `alter table ... enable row level security`
- [ ] Policies use `has_permission(...)` alone (no redundant `is_platform_admin() OR`)
- [ ] INSERT `with check` includes `created_by = auth.uid()` when applicable
- [ ] UPDATE has both `using` AND `with check` clauses
- [ ] Permission codes inserted into `public.permissions`
- [ ] Permissions assigned via `role_permissions` using `r.code` (not UUIDs)
- [ ] `company_modules` populated for existing companies

## Permission Code Conventions

```sql
-- Code format: module:resource:action
-- action field must match the code's intent

-- ✅ Consistent
insert into public.permissions (code, module_code, resource, action) values
  ('mymodule:item:read',   'mymodule', 'item', 'read'),
  ('mymodule:item:create', 'mymodule', 'item', 'create'),  -- action = 'create', not 'write'
  ('mymodule:item:update', 'mymodule', 'item', 'update'),
  ('mymodule:item:delete', 'mymodule', 'item', 'delete');

-- ❌ Inconsistent — code says 'create' but action says 'write'
insert into public.permissions (code, ..., action) values
  ('mymodule:item:create', ..., 'write');
```

## Verification Checklist (run after applying migration)

After `npm run db:push`, verify manually or in tests:

- [ ] **Regular user WITH permission** → gets rows / operation succeeds
- [ ] **Regular user WITHOUT permission** → gets 0 rows / insert blocked (no error thrown)
- [ ] **Platform admin** → gets rows across ALL companies
- [ ] **Unauthenticated** → gets 0 rows

> Silent 0 rows on INSERT/UPDATE means the `with check` failed. Add `returning *` to your test query to confirm.

## Red Flags

| You're thinking...                                   | Reality                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "I wrote the policies, RLS is done"                  | Unverified policies may be silently broken. Run the verification checklist.                                   |
| "I should add `is_platform_admin() OR` to be safe"   | Redundant since migration 047 — `has_permission()` already absorbs it. Migration 048 removed the old ORs.     |
| "Permission is in role_permissions, so it's granted" | `has_permission()` requires `role_permissions.is_active = true` (migration 046). Inactive = silently blocked. |
| "UPDATE only needs `using`, not `with check`"        | Without `with check`, a user can update values to bypass the `using` predicate. Always include both.          |
| "The user gets an error if blocked"                  | RLS returns 0 rows on SELECT/UPDATE/DELETE. Only INSERT raises an error (policy violation).                   |
