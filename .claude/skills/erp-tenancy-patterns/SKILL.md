---
name: erp-tenancy-patterns
description: Use when accessing the current company context in Server Components, Server Actions, or query functions in this multi-tenant ERP.
---

# ERP Tenancy Patterns

## Overview

O ERP é multi-tenant. Cada camada (Page, Action, Query) acessa o contexto de empresa de forma diferente. Misturar os padrões causa bugs silenciosos ou quebra o isolamento de dados.

## Regra de Ouro

```
Page          → resolveCompany(companySlug) → company.id → passa para queries
Action        → getActiveCompanyId()
Query         → recebe companyId: string como parâmetro
```

**Nunca** chame `getActiveCompanyId()` dentro de uma query.

## Padrão por Camada

### Page (Server Component)

```tsx
// src/app/(dashboard)/[companySlug]/anestesia/page.tsx
import { resolveCompany } from "@/modules/tenancy";
import { listSessions } from "@/modules/anestesia";

type Props = { params: Promise<{ companySlug: string }> };

export default async function AnestesiaPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug); // valida slug → company.id
  const sessions = await listSessions(company.id); // passa company.id para query
  return <SessionList sessions={sessions} />;
}
```

### Action (Server Action)

```ts
// src/modules/anestesia/actions/create-session.ts
"use server";
import { getActiveCompanyId } from "@/modules/tenancy"; // ← aqui está o getActiveCompanyId
import { requirePermission, ForbiddenError } from "@/modules/authz";

export async function createSessionAction(_prev: ActionResult, formData: FormData) {
  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "anestesia:session:create");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: "Acesso negado" };
    throw e;
  }
  // ...
}
```

### Query (Server-only function)

```ts
// src/modules/anestesia/queries/list-sessions.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AnestesiaSession } from "../types";

// ✅ companyId vem como parâmetro — nunca chamado internamente
export async function listSessions(companyId: string): Promise<AnestesiaSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anestesia_sessions")
    .select("*")
    .eq("company_id", companyId) // filtro explícito + RLS como defense in depth
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

## Não faça

| ❌ Erro                                           | ✅ Correto                                   |
| ------------------------------------------------- | -------------------------------------------- |
| `getActiveCompanyId()` dentro de uma query        | Receber `companyId` como parâmetro           |
| `getActiveCompanyId()` em Page                    | `resolveCompany(companySlug)` → `company.id` |
| Confiar só em RLS sem filtro explícito em queries | Usar `.eq("company_id", companyId)` + RLS    |
| `requirePermission` dentro de queries             | `requirePermission` só em actions            |
| Usar `companySlug` como `companyId`               | `resolveCompany(slug)` retorna o UUID real   |

## Red Flags

- Query com `import { getActiveCompanyId }` → **errado**, mova para a action/page
- Page usando `getActiveCompanyId()` em vez de `params.companySlug` → bug: ignora o slug da URL
- Query recebendo `slug: string` em vez de `id: string` → slug não é UUID, `.eq("company_id", slug)` retorna vazio
