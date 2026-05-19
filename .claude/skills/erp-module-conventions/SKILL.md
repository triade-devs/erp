---
name: erp-module-conventions
description: Use when creating or modifying modules in the triade-devs/erp project — actions, queries, services, migrations, permissions, or barrel exports.
---

# ERP Module Conventions

## Overview

Every module lives in `src/modules/<domain>/` and MUST follow this structure and checklist without exception.

## Required Structure

```
modules/<domain>/
├── actions/     # Server Actions — "use server", return ActionResult
├── queries/     # Server reads — start with `import "server-only"`
├── components/  # React components (omit if truly backend-only)
├── services/    # Pure business logic only — NO Supabase, NO Next.js
├── schemas/     # Zod validation schemas
├── types/       # Types derived from Database (Row/Insert/Update)
└── index.ts     # Barrel — ONLY public API of the module
```

## Checklist — verify every item before finishing

### Actions (`actions/*.ts`)

- [ ] `"use server"` at top
- [ ] Returns `ActionResult` from `@/lib/errors`
- [ ] Calls `requirePermission(companyId, "module:resource:action")` before any DB write
- [ ] Returns `fieldErrors` from `safeParse` on validation failure
- [ ] Calls `revalidatePath` on success
- [ ] Handles auth check: returns `{ ok: false }` if no user or no companyId

```ts
// ✅ Correct action skeleton
"use server";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

export async function myAction(...): Promise<ActionResult> {
  const parsed = mySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "mymodule:resource:write");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    throw e;
  }

  // ... DB operation ...
  revalidatePath("/...");
  return { ok: true };
}
```

### Queries (`queries/*.ts`)

- [ ] `import "server-only"` at top of file
- [ ] No `requirePermission` (queries rely on RLS — read-only)
- [ ] Return typed results using types from `../types`

### Services (`services/*.ts`)

- [ ] **Pure functions only** — no Supabase client, no `next/headers`, no `getActiveCompanyId`
- [ ] Easily unit-testable with no mocks
- [ ] Infra helpers (context, supabase client) belong in `queries/` or `actions/`, NOT `services/`

```ts
// ❌ WRONG — service importing infrastructure
import { createClient } from "@/lib/supabase/server"; // NOT here

// ✅ CORRECT — pure domain logic
export function calculateUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length;
}
```

### Types (`types/index.ts`)

- [ ] Derived from `Database` type: `Database["public"]["Tables"]["x"]["Row"]`
- [ ] No hand-written interfaces duplicating DB columns

### Migration (`supabase/migrations/<timestamp>_<module>.sql`)

- [ ] Create table with correct references
- [ ] Enable RLS + create policies
- [ ] Insert into `public.modules`
- [ ] Insert into `public.company_modules` (for all existing companies)
- [ ] **Insert into `public.permissions`** for each permission code
- [ ] **Insert into `public.role_permissions`** for each role using `r.code` (NOT UUIDs)

```sql
-- ✅ Required permissions block
insert into public.permissions (code, description, module_code)
values
  ('mymodule:resource:read',  'Ver recursos',    'mymodule'),
  ('mymodule:resource:write', 'Editar recursos',  'mymodule')
on conflict (code) do nothing;

-- Assign to all existing roles by code
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r cross join public.permissions p
where r.code in ('owner', 'admin', 'member')
  and p.module_code = 'mymodule'
on conflict do nothing;
```

> ⚠️ Missing `role_permissions` = silent failure. RLS returns 0 rows, no error. Companies created BEFORE the migration get no access.

### Barrel (`index.ts`)

- [ ] Exports ALL public symbols (actions, queries, types, schemas, components)
- [ ] **No implementation code** — only re-exports
- [ ] External code MUST import via barrel: `import { x } from "@/modules/mymodule"`

## Red Flags — stop and verify

| You're thinking...                                                       | Reality                                                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| "RLS already protects this, `requirePermission` is redundant"            | `requirePermission` enforces TS-layer authz. RLS is DB layer. Both are required. |
| "This module has no granular permissions, I'll skip `permissions` table" | Every module needs at least a read permission. Silent failure if missing.        |
| "It's a simple context helper, I'll put it in `services/`"               | Services = pure logic. Infra helpers go in `queries/` or `actions/`.             |
| "I'll export from the file directly, not the barrel"                     | ESLint blocks deep imports. Everything goes through `index.ts`.                  |
| "I'll assign permissions by role UUID"                                   | UUIDs break across envs. Always use `r.code`.                                    |
