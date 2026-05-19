---
name: erp-supabase-queries
description: Use when creating query files (server-side data fetching) in the triade-devs/erp project.
---

# ERP Supabase Queries

## Overview

Queries são leituras server-only. Três regras não-negociáveis: `import "server-only"`, tipos do módulo (nunca inline), `createClient()` sem cast.

## Canonical Patterns

### List query

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MyItem } from "../types"; // types from module, never inline

export async function listMyItems(
  companyId: string,
  opts?: { page?: number; pageSize?: number },
): Promise<MyItem[]> {
  const limit = Math.min(opts?.pageSize ?? 20, 100);
  const offset = ((opts?.page ?? 1) - 1) * limit;

  const supabase = await createClient(); // no cast, no <any>
  const { data, error } = await supabase
    .from("my_items")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

### Single-fetch query (get or null)

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MyItem } from "../types";

export async function getMyItem(companyId: string, id: string): Promise<MyItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("my_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single(); // .single() is correct — returns error when not found

  if (error) return null; // swallow "not found" error → return null
  return data;
}
```

## Checklist

- [ ] `import "server-only"` at top of file
- [ ] `await createClient()` — no type cast, no `as SupabaseClient<any>`
- [ ] Return type uses types from `../types` (never define types inline in query files)
- [ ] List queries: cap `pageSize` at 100
- [ ] List queries: `throw new Error(error.message)` on DB error
- [ ] Single queries: `if (error) return null` (swallows "not found", re-throw unexpected errors if needed)
- [ ] No `requirePermission` in queries — RLS handles read authorization

## Types: always from `../types`, never inline

```ts
// ❌ WRONG — defining types in the query file
export type Announcement = {
  id: string;
  company_id: string;
  title: string;
};

// ✅ CORRECT — types defined once in types/index.ts, imported here
import type { Announcement } from "../types";
```

`types/index.ts` should derive from `Database`:

```ts
import type { Database } from "@/types/database.types";
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
```

## Red Flags

| You're thinking...                                        | Reality                                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `(await createClient()) as SupabaseClient<any>`           | The table isn't in DB types because migration wasn't applied or `npm run db:types` wasn't run. Fix the root cause.   |
| Defining `type X = { id: string; ... }` in the query file | Types belong in `types/index.ts`. Inline types can't be reused and drift from the schema.                            |
| `.maybeSingle()` for a single-fetch                       | The project uses `.single()` + `if (error) return null`. Both work, but `.single()` is the established pattern here. |
| `requirePermission` in a query                            | Queries are protected by RLS. `requirePermission` belongs in actions only.                                           |
