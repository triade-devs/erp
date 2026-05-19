---
name: erp-server-actions
description: Use when creating or editing Server Actions in the triade-devs/erp project.
---

# ERP Server Actions

## Overview

Every Server Action must follow a strict 6-step skeleton. Skipping any step causes silent failures.

## The Canonical Skeleton

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { getCurrentUser } from "@/modules/auth";
import { getActiveCompanyId } from "@/modules/tenancy";
import type { ActionResult } from "@/lib/errors";
import { mySchema } from "../schemas";

export async function myAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Step 1 — Validate input
  const parsed = mySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Step 2 — Auth check
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  // Step 3 — Company check
  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  // Step 4 — Permission check (NEVER skip this)
  try {
    await requirePermission(companyId, "module:resource:action");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    throw e;
  }

  // Step 5 — DB operation
  const supabase = await createClient();
  const { error } = await supabase.from("table").insert({ ... });
  if (error) return { ok: false, message: error.message };

  // Step 6 — Revalidate + return success
  revalidatePath("/[companySlug]/route", "page");
  return { ok: true, message: "Operação realizada com sucesso" };
}
```

## Checklist — verify every item

- [ ] `"use server"` at top of file
- [ ] `safeParse` with `fieldErrors` on validation failure
- [ ] Auth check (`getCurrentUser` or `supabase.auth.getUser`)
- [ ] Company check (`getActiveCompanyId`)
- [ ] `requirePermission(companyId, "code")` — **NEVER SKIP**
- [ ] `ForbiddenError` caught and returned as `{ ok: false }`
- [ ] DB errors returned as `{ ok: false, message: error.message }`
- [ ] `revalidatePath` scoped to the relevant route (not `"/"`)
- [ ] Returns `{ ok: true, message }` on success

## Red Flags

| You're thinking...                                    | Reality                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Auth check is enough — only the user's own data"     | RLS handles isolation, `requirePermission` handles authorization. Both required.                            |
| "RLS already blocks unauthorized access"              | RLS returns 0 rows silently. The user gets success with no data. `requirePermission` throws a proper error. |
| "I'll add permission check later"                     | Shipping without it = open to privilege escalation. Add it now.                                             |
| "This action has no `permission_code` yet"            | Create the permission in the migration first, then use it.                                                  |
| "I'll cast the Supabase client to bypass type errors" | Missing migration or `npm run db:types` not run. Fix the root cause.                                        |

## `revalidatePath` scope

```ts
// ❌ Too broad — revalidates entire app
revalidatePath("/", "layout");

// ✅ Scoped to the relevant page
revalidatePath("/[companySlug]/announcements", "page");
```

## `ActionResult` variants

```ts
// Validation failure
return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

// Business/auth error
return { ok: false, message: "Mensagem de erro" };

// Success (with optional data)
return { ok: true, message: "Criado com sucesso" };
return { ok: true, message: "Criado", data: { id: record.id } };
```
