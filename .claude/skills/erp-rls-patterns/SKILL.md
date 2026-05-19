---
name: erp-rls-patterns
description: Use when creating RLS policies, writing migrations with permissions, or verifying that table access works correctly for different user types in the triade-devs/erp project.
---

# ERP RLS Patterns

## Overview

RLS failures are **completely silent** — a blocked query returns 0 rows, not an error. Writing policies is not enough; you must verify them for every user type.

## ⚠️ The Platform Admin Trap

`has_permission()` in Postgres checks `memberships → role_permissions` only. It has **no knowledge of `platform_admins`**. If you write:

```sql
-- ❌ Platform admins are silently blocked
create policy "my_select"
  on public.my_table for select
  using (public.has_permission(company_id, 'module:resource:read'));
```

Platform admins get 0 rows. No error. No warning.

**Always include both:**

```sql
-- ✅ Correct
create policy "my_select"
  on public.my_table for select
  using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:read')
  );
```

## Policy Skeleton

```sql
-- SELECT
create policy "table_select"
  on public.my_table for select
  using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:read')
  );

-- INSERT
create policy "table_insert"
  on public.my_table for insert
  with check (
    (
      public.is_platform_admin()
      or public.has_permission(company_id, 'module:resource:write')
    )
    and created_by = auth.uid()  -- enforce authorship when applicable
  );

-- UPDATE
create policy "table_update"
  on public.my_table for update
  using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:write')
  )
  with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:write')
  );

-- DELETE
create policy "table_delete"
  on public.my_table for delete
  using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'module:resource:write')
  );
```

## Migration Checklist

- [ ] `alter table ... enable row level security`
- [ ] SELECT policy with `is_platform_admin() OR has_permission(...)`
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

| You're thinking...                                           | Reality                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| "I wrote the policies, RLS is done"                          | Unverified policies may be silently broken. Run the verification checklist.                                   |
| "Platform admins have `*` permissions in TS so they're fine" | `has_permission()` in Postgres doesn't know about platform_admins. Add `is_platform_admin()` to every policy. |
| "UPDATE only needs `using`, not `with check`"                | Without `with check`, a user can update values to bypass the `using` predicate. Always include both.          |
| "The user gets an error if blocked"                          | RLS returns 0 rows on SELECT/UPDATE/DELETE. Only INSERT raises an error (policy violation).                   |
