# Platform Admin: Gestão Global de Módulos e Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar área `/admin/platform` onde o platform admin pode gerenciar o catálogo global de módulos e permissões, além de visualizar e editar roles (sistema com propagação global, e por empresa).

**Architecture:** Novas queries/actions no módulo `tenancy` seguindo padrões existentes (`is_platform_admin()` check, `ActionResult`, `revalidatePath`). Páginas em `app/(dashboard)/admin/platform/` herdam proteção do `AdminLayout` pai. Um RPC Postgres com `security definer` garante atomicidade ao propagar permissões de roles-sistema para todas as empresas.

**Tech Stack:** Next.js 15 App Router + Server Actions · Supabase (RLS, RPC security definer) · Zod · Shadcn/UI (Table, Switch, Badge, Form, Dialog) · Tailwind · TypeScript strict

---

## File Map

### Criados (novos)

```
supabase/migrations/20260502000026_platform_admin_rpcs.sql
src/modules/tenancy/schemas/create-module.ts
src/modules/tenancy/schemas/update-module.ts
src/modules/tenancy/schemas/create-permission.ts
src/modules/tenancy/queries/list-modules-with-stats.ts
src/modules/tenancy/queries/get-module-with-permissions.ts
src/modules/tenancy/queries/list-all-roles.ts
src/modules/tenancy/queries/get-system-role-permissions.ts
src/modules/tenancy/actions/create-module.ts
src/modules/tenancy/actions/update-module.ts
src/modules/tenancy/actions/toggle-module-active.ts
src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts
src/modules/tenancy/actions/create-permission.ts
src/modules/tenancy/actions/delete-permission.ts
src/modules/tenancy/actions/update-system-role-permissions.ts
src/modules/tenancy/actions/__tests__/create-module.test.ts
src/modules/tenancy/actions/__tests__/update-module.test.ts
src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts
src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
src/modules/tenancy/actions/__tests__/create-permission.test.ts
src/modules/tenancy/actions/__tests__/delete-permission.test.ts
src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
src/modules/tenancy/components/admin-modules-table.tsx
src/modules/tenancy/components/create-module-form.tsx
src/modules/tenancy/components/edit-module-form.tsx
src/modules/tenancy/components/module-permissions-table.tsx
src/modules/tenancy/components/admin-system-roles-tab.tsx
src/modules/tenancy/components/admin-all-roles-tab.tsx
src/app/(dashboard)/admin/platform/layout.tsx
src/app/(dashboard)/admin/platform/modules/page.tsx
src/app/(dashboard)/admin/platform/modules/new/page.tsx
src/app/(dashboard)/admin/platform/modules/[code]/page.tsx
src/app/(dashboard)/admin/platform/roles/page.tsx
```

### Modificados (existentes)

```
src/modules/tenancy/index.ts          — novos exports
src/modules/tenancy/schemas/index.ts  — novos schemas
src/core/navigation/menu.ts           — 2 novos itens em ADMIN_MENU
src/types/database.types.ts           — regenerado após migration
```

---

## Task 1: Migration — RLS write policies + RPC update_system_role_permissions

**Files:**

- Create: `supabase/migrations/20260502000026_platform_admin_rpcs.sql`
- Modify: `src/types/database.types.ts` (regenerado)

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260502000026_platform_admin_rpcs.sql

-- ============================================================
-- RLS write policies para platform admin em modules e permissions
-- ============================================================
create policy "modules_write_platform" on public.modules
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "permissions_write_platform" on public.permissions
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================
-- RPC: update_system_role_permissions
-- Propaga permissões de um role-sistema para TODAS as empresas.
-- security definer para bypass de RLS em role_permissions
-- (a policy existente só permite quem tem core:role:manage).
-- ============================================================
create or replace function public.update_system_role_permissions(
  role_code text,
  permission_codes text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.role_permissions
  where role_id in (
    select id from public.roles
    where code = role_code and is_system = true
  );

  insert into public.role_permissions (role_id, permission_code)
  select r.id, unnest(permission_codes)
  from public.roles r
  where r.code = role_code and r.is_system = true
  on conflict do nothing;
end;
$$;

-- Apenas platform_admins podem chamar esta RPC via service_role/autenticado
revoke execute on function public.update_system_role_permissions(text, text[]) from public;
grant execute on function public.update_system_role_permissions(text, text[]) to authenticated;
```

- [ ] **Step 2: Aplicar migration e regenerar tipos**

```bash
npm run db:push && npm run db:types
```

Esperado: sem erros; `src/types/database.types.ts` atualizado com `update_system_role_permissions` em `Functions`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260502000026_platform_admin_rpcs.sql src/types/database.types.ts
git commit -m "feat(migration): RLS write para modules/permissions + RPC update_system_role_permissions"
```

---

## Task 2: Zod Schemas

**Files:**

- Create: `src/modules/tenancy/schemas/create-module.ts`
- Create: `src/modules/tenancy/schemas/update-module.ts`
- Create: `src/modules/tenancy/schemas/create-permission.ts`
- Modify: `src/modules/tenancy/schemas/index.ts`

- [ ] **Step 1: Criar create-module.ts**

```typescript
// src/modules/tenancy/schemas/create-module.ts
import { z } from "zod";

export const createModuleSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Somente letras minúsculas, números e hífens"),
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
  is_system: z.boolean().default(false),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
```

- [ ] **Step 2: Criar update-module.ts**

```typescript
// src/modules/tenancy/schemas/update-module.ts
import { z } from "zod";

export const updateModuleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
});

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
```

- [ ] **Step 3: Criar create-permission.ts**

```typescript
// src/modules/tenancy/schemas/create-permission.ts
import { z } from "zod";

export const createPermissionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/, "Use somente letras minúsculas, números, :, _ e -"),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
```

- [ ] **Step 4: Atualizar schemas/index.ts**

Adicionar ao final do arquivo `src/modules/tenancy/schemas/index.ts`:

```typescript
export { createModuleSchema } from "./create-module";
export type { CreateModuleInput } from "./create-module";
export { updateModuleSchema } from "./update-module";
export type { UpdateModuleInput } from "./update-module";
export { createPermissionSchema } from "./create-permission";
export type { CreatePermissionInput } from "./create-permission";
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/modules/tenancy/schemas/
git commit -m "feat(tenancy): schemas para criação de módulos e permissões"
```

---

## Task 3: Queries — módulos

**Files:**

- Create: `src/modules/tenancy/queries/list-modules-with-stats.ts`
- Create: `src/modules/tenancy/queries/get-module-with-permissions.ts`

- [ ] **Step 1: Criar list-modules-with-stats.ts**

```typescript
// src/modules/tenancy/queries/list-modules-with-stats.ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ModuleWithStats = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  permissionCount: number;
  activeCompanyCount: number;
};

export async function listModulesWithStats(): Promise<ModuleWithStats[]> {
  const supabase = await createClient();

  const [
    { data: modules, error: modErr },
    { data: permRows, error: permErr },
    { data: companyRows, error: coErr },
  ] = await Promise.all([
    supabase.from("modules").select("*").order("sort_order"),
    supabase.from("permissions").select("module_code"),
    supabase.from("company_modules").select("module_code"),
  ]);

  if (modErr) throw modErr;
  if (permErr) throw permErr;
  if (coErr) throw coErr;

  const permMap = new Map<string, number>();
  for (const p of permRows ?? []) {
    permMap.set(p.module_code, (permMap.get(p.module_code) ?? 0) + 1);
  }

  const companyMap = new Map<string, number>();
  for (const c of companyRows ?? []) {
    companyMap.set(c.module_code, (companyMap.get(c.module_code) ?? 0) + 1);
  }

  return (modules ?? []).map((m) => ({
    ...m,
    permissionCount: permMap.get(m.code) ?? 0,
    activeCompanyCount: companyMap.get(m.code) ?? 0,
  }));
}
```

- [ ] **Step 2: Criar get-module-with-permissions.ts**

```typescript
// src/modules/tenancy/queries/get-module-with-permissions.ts
import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ModulePermission = Tables<"permissions">;
export type ModuleWithPermissions = Tables<"modules"> & { permissions: ModulePermission[] };

export async function getModuleWithPermissions(
  code: string,
): Promise<ModuleWithPermissions | null> {
  const supabase = await createClient();

  const [{ data: module, error: modErr }, { data: permissions, error: permErr }] =
    await Promise.all([
      supabase.from("modules").select("*").eq("code", code).maybeSingle(),
      supabase
        .from("permissions")
        .select("*")
        .eq("module_code", code)
        .order("resource")
        .order("action"),
    ]);

  if (modErr) throw modErr;
  if (permErr) throw permErr;
  if (!module) return null;

  return { ...module, permissions: permissions ?? [] };
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/tenancy/queries/list-modules-with-stats.ts src/modules/tenancy/queries/get-module-with-permissions.ts
git commit -m "feat(tenancy): queries listModulesWithStats e getModuleWithPermissions"
```

---

## Task 4: Queries — roles

**Files:**

- Create: `src/modules/tenancy/queries/list-all-roles.ts`
- Create: `src/modules/tenancy/queries/get-system-role-permissions.ts`

- [ ] **Step 1: Criar list-all-roles.ts**

```typescript
// src/modules/tenancy/queries/list-all-roles.ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RoleWithCompany = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  companyId: string;
  companyName: string;
  permissionCount: number;
};

export async function listAllRoles(): Promise<RoleWithCompany[]> {
  const supabase = await createClient();

  const [{ data: roles, error: rolesErr }, { data: rpRows, error: rpErr }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, code, name, description, is_system, company_id, companies(name)")
      .order("company_id")
      .order("is_system", { ascending: false })
      .order("name"),
    supabase.from("role_permissions").select("role_id"),
  ]);

  if (rolesErr) throw rolesErr;
  if (rpErr) throw rpErr;

  const countMap = new Map<string, number>();
  for (const rp of rpRows ?? []) {
    countMap.set(rp.role_id, (countMap.get(rp.role_id) ?? 0) + 1);
  }

  return (roles ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    isSystem: r.is_system,
    companyId: r.company_id,
    companyName: (r.companies as { name: string } | null)?.name ?? r.company_id,
    permissionCount: countMap.get(r.id) ?? 0,
  }));
}
```

- [ ] **Step 2: Criar get-system-role-permissions.ts**

```typescript
// src/modules/tenancy/queries/get-system-role-permissions.ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SystemRolePermission = {
  code: string;
  moduleCode: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
  inconsistent: boolean;
};

export type SystemRoleMatrix = {
  moduleCode: string;
  moduleName: string;
  permissions: SystemRolePermission[];
};

export async function getSystemRolePermissions(roleCode: string): Promise<SystemRoleMatrix[]> {
  const supabase = await createClient();

  const { data: roles, error: rolesErr } = await supabase
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .eq("is_system", true);

  if (rolesErr) throw rolesErr;
  if (!roles || roles.length === 0) return [];

  const roleIds = roles.map((r) => r.id);
  const totalRoles = roleIds.length;

  const [{ data: granted, error: grantErr }, { data: allPerms, error: permErr }] =
    await Promise.all([
      supabase.from("role_permissions").select("role_id, permission_code").in("role_id", roleIds),
      supabase
        .from("permissions")
        .select("code, module_code, resource, action, description, modules(name)")
        .order("module_code")
        .order("resource")
        .order("action"),
    ]);

  if (grantErr) throw grantErr;
  if (permErr) throw permErr;

  const grantCountMap = new Map<string, number>();
  for (const rp of granted ?? []) {
    grantCountMap.set(rp.permission_code, (grantCountMap.get(rp.permission_code) ?? 0) + 1);
  }

  const moduleMap = new Map<string, { moduleName: string; permissions: SystemRolePermission[] }>();

  for (const p of allPerms ?? []) {
    if (!moduleMap.has(p.module_code)) {
      const moduleName = (p.modules as { name: string } | null)?.name ?? p.module_code;
      moduleMap.set(p.module_code, { moduleName, permissions: [] });
    }
    const count = grantCountMap.get(p.code) ?? 0;
    moduleMap.get(p.module_code)!.permissions.push({
      code: p.code,
      moduleCode: p.module_code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      granted: count > 0,
      inconsistent: count > 0 && count < totalRoles,
    });
  }

  return Array.from(moduleMap.entries()).map(([moduleCode, { moduleName, permissions }]) => ({
    moduleCode,
    moduleName,
    permissions,
  }));
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/tenancy/queries/list-all-roles.ts src/modules/tenancy/queries/get-system-role-permissions.ts
git commit -m "feat(tenancy): queries listAllRoles e getSystemRolePermissions"
```

---

## Task 5: Actions — createModule, updateModule, toggleModuleActive

**Files:**

- Create: `src/modules/tenancy/actions/create-module.ts`
- Create: `src/modules/tenancy/actions/update-module.ts`
- Create: `src/modules/tenancy/actions/toggle-module-active.ts`
- Create: `src/modules/tenancy/actions/__tests__/create-module.test.ts`
- Create: `src/modules/tenancy/actions/__tests__/update-module.test.ts`
- Create: `src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts`

- [ ] **Step 1: Escrever testes para createModule**

```typescript
// src/modules/tenancy/actions/__tests__/create-module.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createModuleAction } from "../create-module";

// Sequência de produção:
//   1. supabase.rpc("is_platform_admin")
//   2. modules.insert(data)

function makeSupabaseMock({
  isPlatformAdmin = true,
  rpcError = null as { message: string } | null,
  insertError = null as { message: string; code?: string } | null,
} = {}) {
  const modulesInsert = vi
    .fn()
    .mockResolvedValue(
      insertError ? { data: null, error: insertError } : { data: null, error: null },
    );

  const mockClient = {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: rpcError }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { insert: modulesInsert };
      return {};
    }),
  };
  return mockClient;
}

function fd(fields: Record<string, string | number | boolean>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return form;
}

describe("createModuleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: false } quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      createModuleAction(
        { ok: true },
        fd({ code: "test", name: "Teste", sort_order: 100, is_system: false }),
      ),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna fieldErrors quando code é inválido", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "INVALID CODE!", name: "Teste", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.code).toBeDefined();
  });

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "my-module", name: "Meu Módulo", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: false } em conflito de código único", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ insertError: { message: "dup", code: "23505" } }) as never,
    );
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "my-module", name: "Meu Módulo", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/código/i);
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/create-module.test.ts
```

Esperado: FAIL — `createModuleAction` não existe ainda.

- [ ] **Step 3: Implementar createModule**

```typescript
// src/modules/tenancy/actions/create-module.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { createModuleSchema } from "../schemas/create-module";

export async function createModuleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = createModuleSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    sort_order: formData.get("sort_order"),
    is_system: formData.get("is_system") === "true",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("modules").insert(parsed.data);

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Já existe um módulo com este código" };
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/platform/modules");
  return { ok: true, message: `Módulo "${parsed.data.name}" criado com sucesso` };
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/create-module.test.ts
```

Esperado: PASS (4 testes).

- [ ] **Step 5: Escrever testes para updateModule**

```typescript
// src/modules/tenancy/actions/__tests__/update-module.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { updateModuleAction } from "../update-module";

function makeSupabaseMock({
  isPlatformAdmin = true,
  updateError = null as { message: string } | null,
} = {}) {
  const modulesEq = vi
    .fn()
    .mockResolvedValue(
      updateError ? { data: null, error: updateError } : { data: null, error: null },
    );
  const modulesUpdate = vi.fn().mockReturnValue({ eq: modulesEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { update: modulesUpdate };
      return {};
    }),
  };
}

function fd(fields: Record<string, string | number>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return form;
}

describe("updateModuleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateModuleAction(
      "inventory",
      { ok: true },
      fd({ name: "Estoque v2", sort_order: 10 }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: false } quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      updateModuleAction("inventory", { ok: true }, fd({ name: "Estoque", sort_order: 10 })),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna fieldErrors quando name é muito curto", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateModuleAction(
      "inventory",
      { ok: true },
      fd({ name: "A", sort_order: 10 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.name).toBeDefined();
  });
});
```

- [ ] **Step 6: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/update-module.test.ts
```

Esperado: FAIL.

- [ ] **Step 7: Implementar updateModule**

```typescript
// src/modules/tenancy/actions/update-module.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { updateModuleSchema } from "../schemas/update-module";

export async function updateModuleAction(
  code: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = updateModuleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("modules").update(parsed.data).eq("code", code);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/platform/modules");
  revalidatePath(`/admin/platform/modules/${code}`);
  return { ok: true, message: "Módulo atualizado" };
}
```

- [ ] **Step 8: Rodar teste — deve passar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/update-module.test.ts
```

Esperado: PASS (3 testes).

- [ ] **Step 9: Escrever testes para toggleModuleActive**

```typescript
// src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { toggleModuleActiveAction } from "../toggle-module-active";

function makeSupabaseMock({
  isPlatformAdmin = true,
  updateError = null as { message: string } | null,
} = {}) {
  const modulesEq = vi
    .fn()
    .mockResolvedValue(updateError ? { error: updateError } : { error: null });
  const modulesUpdate = vi.fn().mockReturnValue({ eq: modulesEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { update: modulesUpdate };
      return {};
    }),
  };
}

describe("toggleModuleActiveAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } ao ativar", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await toggleModuleActiveAction("inventory", true);
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: true } ao desativar", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await toggleModuleActiveAction("inventory", false);
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(toggleModuleActiveAction("inventory", true)).rejects.toThrow("Acesso negado");
  });
});
```

- [ ] **Step 10: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts
```

Esperado: FAIL.

- [ ] **Step 11: Implementar toggleModuleActive**

```typescript
// src/modules/tenancy/actions/toggle-module-active.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";

export async function toggleModuleActiveAction(
  code: string,
  isActive: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { error } = await supabase.from("modules").update({ is_active: isActive }).eq("code", code);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/platform/modules");
  return { ok: true, message: `Módulo ${isActive ? "ativado" : "desativado"} no catálogo` };
}
```

- [ ] **Step 12: Rodar todos os testes desta task**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts src/modules/tenancy/actions/__tests__/create-module.test.ts src/modules/tenancy/actions/__tests__/update-module.test.ts
```

Esperado: PASS (10 testes total).

- [ ] **Step 13: Commit**

```bash
git add src/modules/tenancy/actions/create-module.ts src/modules/tenancy/actions/update-module.ts src/modules/tenancy/actions/toggle-module-active.ts src/modules/tenancy/actions/__tests__/create-module.test.ts src/modules/tenancy/actions/__tests__/update-module.test.ts src/modules/tenancy/actions/__tests__/toggle-module-active.test.ts
git commit -m "feat(tenancy): actions createModule, updateModule, toggleModuleActive"
```

---

## Task 6: Actions — bulkToggleModuleForCompanies, createPermission, deletePermission

**Files:**

- Create: `src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts`
- Create: `src/modules/tenancy/actions/create-permission.ts`
- Create: `src/modules/tenancy/actions/delete-permission.ts`
- Create: `src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts`
- Create: `src/modules/tenancy/actions/__tests__/create-permission.test.ts`
- Create: `src/modules/tenancy/actions/__tests__/delete-permission.test.ts`

- [ ] **Step 1: Escrever testes para bulkToggleModuleForCompanies**

```typescript
// src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { bulkToggleModuleForCompaniesAction } from "../bulk-toggle-module-for-companies";

// Sequência enable=true:
//   rpc is_platform_admin → auth.getUser → companies.select("id") → company_modules.upsert(rows)
// Sequência enable=false:
//   rpc is_platform_admin → auth.getUser → company_modules.delete().eq("module_code")

function makeEnableMock({
  isPlatformAdmin = true,
  companies = [{ id: "c1" }, { id: "c2" }],
  upsertError = null as { message: string } | null,
} = {}) {
  const companiesSelect = vi.fn().mockResolvedValue({ data: companies, error: null });
  const companiesFrom = { select: companiesSelect };

  const cmUpsert = vi
    .fn()
    .mockResolvedValue(upsertError ? { error: upsertError } : { error: null });
  const cmFrom = { upsert: cmUpsert };

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "companies") return companiesFrom;
      if (table === "company_modules") return cmFrom;
      return {};
    }),
  };
}

function makeDisableMock({ deleteError = null as { message: string } | null } = {}) {
  const cmDeleteEq = vi
    .fn()
    .mockResolvedValue(deleteError ? { error: deleteError } : { error: null });
  const cmDelete = vi.fn().mockReturnValue({ eq: cmDeleteEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules") return { delete: cmDelete };
      return {};
    }),
  };
}

describe("bulkToggleModuleForCompaniesAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ativa para todas as empresas — { ok: true }", async () => {
    vi.mocked(createClient).mockResolvedValue(makeEnableMock() as never);
    const result = await bulkToggleModuleForCompaniesAction("knowledge-base", true);
    expect(result.ok).toBe(true);
  });

  it("desativa para todas as empresas — { ok: true }", async () => {
    vi.mocked(createClient).mockResolvedValue(makeDisableMock() as never);
    const result = await bulkToggleModuleForCompaniesAction("knowledge-base", false);
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(makeEnableMock({ isPlatformAdmin: false }) as never);
    await expect(bulkToggleModuleForCompaniesAction("knowledge-base", true)).rejects.toThrow(
      "Acesso negado",
    );
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar bulkToggleModuleForCompanies**

```typescript
// src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";

export async function bulkToggleModuleForCompaniesAction(
  moduleCode: string,
  enable: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  if (enable) {
    const { data: companies, error: compErr } = await supabase.from("companies").select("id");

    if (compErr) return { ok: false, message: compErr.message };

    const rows = (companies ?? []).map((c) => ({
      company_id: c.id,
      module_code: moduleCode,
      enabled_by: user.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("company_modules")
        .upsert(rows, { onConflict: "company_id,module_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("company_modules").delete().eq("module_code", moduleCode);

    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/admin/platform/modules");
  return {
    ok: true,
    message: `Módulo ${enable ? "ativado" : "desativado"} para todas as empresas`,
  };
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
```

Esperado: PASS (3 testes).

- [ ] **Step 5: Escrever testes para createPermission**

```typescript
// src/modules/tenancy/actions/__tests__/create-permission.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createPermissionAction } from "../create-permission";

function makeSupabaseMock({
  isPlatformAdmin = true,
  insertError = null as { message: string; code?: string } | null,
} = {}) {
  const permInsert = vi
    .fn()
    .mockResolvedValue(insertError ? { error: insertError } : { error: null });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "permissions") return { insert: permInsert };
      return {};
    }),
  };
}

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

describe("createPermissionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createPermissionAction(
      "inventory",
      { ok: true },
      fd({ code: "inventory:product:archive", resource: "product", action: "archive" }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna fieldErrors quando code contém caracteres inválidos", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createPermissionAction(
      "inventory",
      { ok: true },
      fd({ code: "INVALID CODE", resource: "product", action: "archive" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.code).toBeDefined();
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      createPermissionAction(
        "inventory",
        { ok: true },
        fd({ code: "inventory:product:archive", resource: "product", action: "archive" }),
      ),
    ).rejects.toThrow("Acesso negado");
  });
});
```

- [ ] **Step 6: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/create-permission.test.ts
```

Esperado: FAIL.

- [ ] **Step 7: Implementar createPermission**

```typescript
// src/modules/tenancy/actions/create-permission.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { createPermissionSchema } from "../schemas/create-permission";

export async function createPermissionAction(
  moduleCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = createPermissionSchema.safeParse({
    code: formData.get("code"),
    resource: formData.get("resource"),
    action: formData.get("action"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("permissions")
    .insert({ ...parsed.data, module_code: moduleCode });

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Já existe uma permissão com este código" };
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/platform/modules/${moduleCode}`);
  return { ok: true, message: `Permissão "${parsed.data.code}" criada` };
}
```

- [ ] **Step 8: Rodar teste — deve passar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/create-permission.test.ts
```

Esperado: PASS (3 testes).

- [ ] **Step 9: Escrever testes para deletePermission**

```typescript
// src/modules/tenancy/actions/__tests__/delete-permission.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { deletePermissionAction } from "../delete-permission";

function makeSupabaseMock({
  isPlatformAdmin = true,
  deleteError = null as { message: string } | null,
} = {}) {
  const permDeleteEq2 = vi
    .fn()
    .mockResolvedValue(deleteError ? { error: deleteError } : { error: null });
  const permDeleteEq1 = vi.fn().mockReturnValue({ eq: permDeleteEq2 });
  const permDelete = vi.fn().mockReturnValue({ eq: permDeleteEq1 });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "permissions") return { delete: permDelete };
      return {};
    }),
  };
}

describe("deletePermissionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await deletePermissionAction("inventory", "inventory:product:archive");
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(deletePermissionAction("inventory", "inventory:product:archive")).rejects.toThrow(
      "Acesso negado",
    );
  });
});
```

- [ ] **Step 10: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/delete-permission.test.ts
```

Esperado: FAIL.

- [ ] **Step 11: Implementar deletePermission**

```typescript
// src/modules/tenancy/actions/delete-permission.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";

export async function deletePermissionAction(
  moduleCode: string,
  permissionCode: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { error } = await supabase
    .from("permissions")
    .delete()
    .eq("code", permissionCode)
    .eq("module_code", moduleCode);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/platform/modules/${moduleCode}`);
  return { ok: true, message: `Permissão "${permissionCode}" removida` };
}
```

- [ ] **Step 12: Rodar todos os testes desta task**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts src/modules/tenancy/actions/__tests__/create-permission.test.ts src/modules/tenancy/actions/__tests__/delete-permission.test.ts
```

Esperado: PASS (8 testes total).

- [ ] **Step 13: Commit**

```bash
git add src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts src/modules/tenancy/actions/create-permission.ts src/modules/tenancy/actions/delete-permission.ts src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts src/modules/tenancy/actions/__tests__/create-permission.test.ts src/modules/tenancy/actions/__tests__/delete-permission.test.ts
git commit -m "feat(tenancy): actions bulkToggleModule, createPermission, deletePermission"
```

---

## Task 7: Action — updateSystemRolePermissions

**Files:**

- Create: `src/modules/tenancy/actions/update-system-role-permissions.ts`
- Create: `src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { updateSystemRolePermissionsAction } from "../update-system-role-permissions";

// Sequência de produção:
//   1. rpc("is_platform_admin")
//   2. rpc("update_system_role_permissions", { role_code, permission_codes })

function makeSupabaseMock({
  isPlatformAdmin = true,
  rpcUpdateError = null as { message: string } | null,
} = {}) {
  return {
    rpc: vi.fn().mockImplementation((name: string) => {
      if (name === "is_platform_admin")
        return Promise.resolve({ data: isPlatformAdmin, error: null });
      if (name === "update_system_role_permissions")
        return Promise.resolve({ data: null, error: rpcUpdateError });
      return Promise.resolve({ data: null, error: null });
    }),
  };
}

function fd(perms: string[]): FormData {
  const form = new FormData();
  for (const p of perms) form.append("permission_code", p);
  return form;
}

describe("updateSystemRolePermissionsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateSystemRolePermissionsAction(
      "operator",
      { ok: true },
      fd(["inventory:product:read", "kb:article:read"]),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: true } com array vazio de permissões", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateSystemRolePermissionsAction("operator", { ok: true }, fd([]));
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      updateSystemRolePermissionsAction("operator", { ok: true }, fd([])),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna { ok: false } quando RPC falha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ rpcUpdateError: { message: "permission denied" } }) as never,
    );
    const result = await updateSystemRolePermissionsAction("operator", { ok: true }, fd([]));
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar updateSystemRolePermissions**

```typescript
// src/modules/tenancy/actions/update-system-role-permissions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";

export async function updateSystemRolePermissionsAction(
  roleCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const permissionCodes = formData.getAll("permission_code") as string[];

  const { error } = await supabase.rpc("update_system_role_permissions", {
    role_code: roleCode,
    permission_codes: permissionCodes,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/platform/roles");
  return {
    ok: true,
    message: `Permissões do role "${roleCode}" atualizadas em todas as empresas`,
  };
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
```

Esperado: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/modules/tenancy/actions/update-system-role-permissions.ts src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
git commit -m "feat(tenancy): action updateSystemRolePermissions com propagação global"
```

---

## Task 8: Atualizar barrel tenancy/index.ts

**Files:**

- Modify: `src/modules/tenancy/index.ts`

- [ ] **Step 1: Adicionar exports ao barrel**

Abrir `src/modules/tenancy/index.ts` e adicionar os seguintes blocos (manter os existentes intactos):

```typescript
// Adicionar no bloco de Actions:
export { createModuleAction } from "./actions/create-module";
export { updateModuleAction } from "./actions/update-module";
export { toggleModuleActiveAction } from "./actions/toggle-module-active";
export { bulkToggleModuleForCompaniesAction } from "./actions/bulk-toggle-module-for-companies";
export { createPermissionAction } from "./actions/create-permission";
export { deletePermissionAction } from "./actions/delete-permission";
export { updateSystemRolePermissionsAction } from "./actions/update-system-role-permissions";

// Adicionar no bloco de Queries:
export { listModulesWithStats } from "./queries/list-modules-with-stats";
export type { ModuleWithStats } from "./queries/list-modules-with-stats";
export { getModuleWithPermissions } from "./queries/get-module-with-permissions";
export type {
  ModuleWithPermissions,
  ModulePermission,
} from "./queries/get-module-with-permissions";
export { listAllRoles } from "./queries/list-all-roles";
export type { RoleWithCompany } from "./queries/list-all-roles";
export { getSystemRolePermissions } from "./queries/get-system-role-permissions";
export type { SystemRoleMatrix, SystemRolePermission } from "./queries/get-system-role-permissions";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/modules/tenancy/index.ts
git commit -m "feat(tenancy): exporta novas queries e actions no barrel"
```

---

## Task 9: Layout de rota + navegação

**Files:**

- Create: `src/app/(dashboard)/admin/platform/layout.tsx`
- Modify: `src/core/navigation/menu.ts`

- [ ] **Step 1: Criar layout.tsx**

```typescript
// src/app/(dashboard)/admin/platform/layout.tsx
export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  // Proteção já aplicada pelo AdminLayout pai (/admin/layout.tsx).
  // Este layout existe para possível expansão futura (sub-nav, etc).
  return <>{children}</>;
}
```

- [ ] **Step 2: Atualizar menu.ts**

Localizar `ADMIN_MENU` em `src/core/navigation/menu.ts` e adicionar dois itens:

```typescript
export const ADMIN_MENU: MenuItem[] = [
  { label: "Empresas", href: "/admin/companies", icon: "building-2" },
  { label: "Auditoria Global", href: "/admin/audit", icon: "activity" },
  { label: "Módulos", href: "/admin/platform/modules", icon: "puzzle" },
  { label: "Roles", href: "/admin/platform/roles", icon: "shield" },
];
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/platform/layout.tsx src/core/navigation/menu.ts
git commit -m "feat(admin): layout /admin/platform e novos itens no ADMIN_MENU"
```

---

## Task 10: Página de lista de módulos

**Files:**

- Create: `src/app/(dashboard)/admin/platform/modules/page.tsx`
- Create: `src/modules/tenancy/components/admin-modules-table.tsx`

- [ ] **Step 1: Criar AdminModulesTable (client component)**

```typescript
// src/modules/tenancy/components/admin-modules-table.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  toggleModuleActiveAction,
  bulkToggleModuleForCompaniesAction,
} from "../actions/toggle-module-active";
import type { ModuleWithStats } from "../queries/list-modules-with-stats";

export function AdminModulesTable({ modules }: { modules: ModuleWithStats[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggleActive(code: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleModuleActiveAction(code, isActive);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  function handleBulk(code: string, enable: boolean) {
    const label = enable ? "ativar para todas as empresas" : "desativar para todas as empresas";
    if (!confirm(`Tem certeza que deseja ${label} o módulo "${code}"?`)) return;
    startTransition(async () => {
      const result = await bulkToggleModuleForCompaniesAction(code, enable);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Código</TableHead>
          <TableHead className="text-right">Permissões</TableHead>
          <TableHead className="text-right">Empresas ativas</TableHead>
          <TableHead>Ativo no catálogo</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules.map((mod) => (
          <TableRow key={mod.code}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{mod.name}</span>
                {mod.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    sistema
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{mod.code}</TableCell>
            <TableCell className="text-right">{mod.permissionCount}</TableCell>
            <TableCell className="text-right">{mod.activeCompanyCount}</TableCell>
            <TableCell>
              <Switch
                checked={mod.is_active}
                disabled={isPending || mod.is_system}
                onCheckedChange={(checked) => handleToggleActive(mod.code, checked)}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/platform/modules/${mod.code}`}>Editar</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulk(mod.code, true)}
                >
                  Ativar todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulk(mod.code, false)}
                >
                  Desativar todas
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Criar page.tsx**

```typescript
// src/app/(dashboard)/admin/platform/modules/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listModulesWithStats } from "@/modules/tenancy";
import { AdminModulesTable } from "@/modules/tenancy/components/admin-modules-table";

export default async function PlatformModulesPage() {
  const modules = await listModulesWithStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Módulos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo global de módulos da plataforma ({modules.length})
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/platform/modules/new">Novo módulo</Link>
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="text-muted-foreground">Nenhum módulo cadastrado.</p>
      ) : (
        <AdminModulesTable modules={modules} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Adicionar AdminModulesTable ao barrel**

Em `src/modules/tenancy/index.ts`, adicionar no bloco de Components:

```typescript
export { AdminModulesTable } from "./components/admin-modules-table";
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/admin/platform/modules/page.tsx src/modules/tenancy/components/admin-modules-table.tsx src/modules/tenancy/index.ts
git commit -m "feat(admin): página de lista de módulos /admin/platform/modules"
```

---

## Task 11: Página de criação de módulo

**Files:**

- Create: `src/app/(dashboard)/admin/platform/modules/new/page.tsx`
- Create: `src/modules/tenancy/components/create-module-form.tsx`

- [ ] **Step 1: Criar CreateModuleForm (client component)**

```typescript
// src/modules/tenancy/components/create-module-form.tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createModuleAction } from "../actions/create-module";

const initial = { ok: true as const };

export function CreateModuleForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createModuleAction, initial);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      router.push("/admin/platform/modules");
    } else if (!state.ok && state.message && !("fieldErrors" in state)) {
      toast.error(state.message);
    }
  }, [state, router]);

  const errors = !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          name="code"
          placeholder="ex: crm"
          pattern="[a-z0-9-]+"
          required
        />
        {errors?.code && <p className="text-sm text-destructive">{errors.code[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" placeholder="ex: CRM" required />
        {errors?.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Opcional" rows={2} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="icon">Ícone</Label>
        <Input id="icon" name="icon" placeholder="ex: briefcase" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="sort_order">Ordem</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={100} />
      </div>

      {/* is_system=false por padrão — novos módulos nunca são sistema */}
      <input type="hidden" name="is_system" value="false" />

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar módulo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/platform/modules")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Criar page.tsx**

```typescript
// src/app/(dashboard)/admin/platform/modules/new/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateModuleForm } from "@/modules/tenancy/components/create-module-form";

export default function NewModulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/platform/modules">← Módulos</Link>
        </Button>
        <h1 className="text-2xl font-bold">Novo módulo</h1>
      </div>
      <CreateModuleForm />
    </div>
  );
}
```

- [ ] **Step 3: Adicionar CreateModuleForm ao barrel**

Em `src/modules/tenancy/index.ts`, adicionar:

```typescript
export { CreateModuleForm } from "./components/create-module-form";
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/admin/platform/modules/new/page.tsx src/modules/tenancy/components/create-module-form.tsx src/modules/tenancy/index.ts
git commit -m "feat(admin): página de criação de módulo /admin/platform/modules/new"
```

---

## Task 12: Página de edição de módulo + gerenciamento de permissões

**Files:**

- Create: `src/app/(dashboard)/admin/platform/modules/[code]/page.tsx`
- Create: `src/modules/tenancy/components/edit-module-form.tsx`
- Create: `src/modules/tenancy/components/module-permissions-table.tsx`

- [ ] **Step 1: Criar EditModuleForm (client component)**

```typescript
// src/modules/tenancy/components/edit-module-form.tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateModuleAction } from "../actions/update-module";
import type { Tables } from "@/types/database.types";

type Props = { module: Tables<"modules"> };

export function EditModuleForm({ module }: Props) {
  const boundAction = updateModuleAction.bind(null, module.code);
  const [state, formAction, isPending] = useActionState(boundAction, { ok: true as const });

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (!state.ok && state.message && !("fieldErrors" in state)) toast.error(state.message);
  }, [state]);

  const errors = !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Código</Label>
        <Input value={module.code} disabled className="font-mono" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={module.name} required />
        {errors?.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={module.description ?? ""}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="icon">Ícone</Label>
        <Input id="icon" name="icon" defaultValue={module.icon ?? ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="sort_order">Ordem</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={module.sort_order}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Criar ModulePermissionsTable (client component)**

```typescript
// src/modules/tenancy/components/module-permissions-table.tsx
"use client";

import { useTransition, useState, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPermissionAction } from "../actions/create-permission";
import { deletePermissionAction } from "../actions/delete-permission";
import type { ModulePermission } from "../queries/get-module-with-permissions";

type Props = {
  moduleCode: string;
  permissions: ModulePermission[];
};

export function ModulePermissionsTable({ moduleCode, permissions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const boundCreate = createPermissionAction.bind(null, moduleCode);
  const [createState, createFormAction, isCreating] = useActionState(boundCreate, {
    ok: true as const,
  });

  useEffect(() => {
    if (createState.ok && createState.message) {
      toast.success(createState.message);
      setOpen(false);
    } else if (!createState.ok && createState.message && !("fieldErrors" in createState)) {
      toast.error(createState.message);
    }
  }, [createState]);

  const createErrors =
    !createState.ok && "fieldErrors" in createState ? createState.fieldErrors : undefined;

  function handleDelete(permCode: string) {
    if (
      !confirm(
        `Remover "${permCode}"? Isso retirará a permissão de TODAS as roles que a possuem (CASCADE).`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deletePermissionAction(moduleCode, permCode);
      if (result.ok) toast.success(result.message ?? "Removida");
      else toast.error(result.message ?? "Erro");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Permissões ({permissions.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Adicionar permissão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova permissão</DialogTitle>
            </DialogHeader>
            <form action={createFormAction} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="perm-code">Código</Label>
                <Input
                  id="perm-code"
                  name="code"
                  placeholder={`${moduleCode}:resource:action`}
                  className="font-mono"
                  required
                />
                {createErrors?.code && (
                  <p className="text-sm text-destructive">{createErrors.code[0]}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-resource">Resource</Label>
                <Input id="perm-resource" name="resource" placeholder="ex: product" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-action">Action</Label>
                <Input id="perm-action" name="action" placeholder="ex: archive" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-desc">Descrição</Label>
                <Input id="perm-desc" name="description" placeholder="Opcional" />
              </div>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.code}>
                <TableCell className="font-mono text-sm">{perm.code}</TableCell>
                <TableCell>{perm.resource}</TableCell>
                <TableCell>{perm.action}</TableCell>
                <TableCell className="text-muted-foreground">{perm.description ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(perm.code)}
                  >
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Criar page.tsx**

```typescript
// src/app/(dashboard)/admin/platform/modules/[code]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getModuleWithPermissions } from "@/modules/tenancy";
import { EditModuleForm } from "@/modules/tenancy/components/edit-module-form";
import { ModulePermissionsTable } from "@/modules/tenancy/components/module-permissions-table";

type Props = { params: Promise<{ code: string }> };

export default async function EditModulePage({ params }: Props) {
  const { code } = await params;
  const module = await getModuleWithPermissions(code);

  if (!module) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/platform/modules">← Módulos</Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar módulo: {module.name}</h1>
      </div>

      <EditModuleForm module={module} />

      <ModulePermissionsTable moduleCode={module.code} permissions={module.permissions} />
    </div>
  );
}
```

- [ ] **Step 4: Adicionar novos componentes ao barrel**

Em `src/modules/tenancy/index.ts`, adicionar:

```typescript
export { EditModuleForm } from "./components/edit-module-form";
export { ModulePermissionsTable } from "./components/module-permissions-table";
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/admin/platform/modules/\[code\]/page.tsx src/modules/tenancy/components/edit-module-form.tsx src/modules/tenancy/components/module-permissions-table.tsx src/modules/tenancy/index.ts
git commit -m "feat(admin): página de edição de módulo com gestão de permissões"
```

---

## Task 13: Página de Roles — tabs Sistema e Por Empresa

**Files:**

- Create: `src/app/(dashboard)/admin/platform/roles/page.tsx`
- Create: `src/modules/tenancy/components/admin-system-roles-tab.tsx`
- Create: `src/modules/tenancy/components/admin-all-roles-tab.tsx`

- [ ] **Step 1: Criar AdminSystemRolesTab (client component)**

O componente recebe os codes dos roles-sistema e a matrix de permissões para o role selecionado. O admin seleciona um role-sistema, vê as permissões agrupadas por módulo e salva.

```typescript
// src/modules/tenancy/components/admin-system-roles-tab.tsx
"use client";

import { useState, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateSystemRolePermissionsAction } from "../actions/update-system-role-permissions";
import type { SystemRoleMatrix } from "../queries/get-system-role-permissions";

type Props = {
  roleCodes: string[];
  initialMatrices: Record<string, SystemRoleMatrix[]>;
};

export function AdminSystemRolesTab({ roleCodes, initialMatrices }: Props) {
  const [selectedCode, setSelectedCode] = useState(roleCodes[0] ?? "");
  const matrix = initialMatrices[selectedCode] ?? [];

  const boundAction = updateSystemRolePermissionsAction.bind(null, selectedCode);
  const [state, formAction, isPending] = useActionState(boundAction, { ok: true as const });

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {roleCodes.map((code) => (
          <Button
            key={code}
            variant={selectedCode === code ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCode(code)}
          >
            {code}
          </Button>
        ))}
      </div>

      {matrix.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma permissão disponível.</p>
      ) : (
        <form action={formAction} className="space-y-6">
          {matrix.map((mod) => (
            <div key={mod.moduleCode} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {mod.moduleName}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {mod.permissions.map((perm) => (
                  <div key={perm.code} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.code}
                      name="permission_code"
                      value={perm.code}
                      defaultChecked={perm.granted}
                    />
                    <Label htmlFor={perm.code} className="text-sm font-normal cursor-pointer">
                      {perm.description ?? perm.code}
                    </Label>
                    {perm.inconsistent && (
                      <Badge variant="outline" className="text-xs text-yellow-600">
                        inconsistente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-sm text-muted-foreground">
            Salvar propaga as permissões para TODAS as empresas imediatamente.
          </p>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Propagando..." : "Salvar e propagar para todas as empresas"}
          </Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar AdminAllRolesTab (client component)**

```typescript
// src/modules/tenancy/components/admin-all-roles-tab.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoleWithCompany } from "../queries/list-all-roles";

type Props = { roles: RoleWithCompany[] };

export function AdminAllRolesTab({ roles }: Props) {
  const [companyFilter, setCompanyFilter] = useState("");
  const [systemOnly, setSystemOnly] = useState(false);

  const filtered = roles.filter((r) => {
    if (companyFilter && !r.companyName.toLowerCase().includes(companyFilter.toLowerCase()))
      return false;
    if (systemOnly && !r.isSystem) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Filtrar por empresa..."
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={systemOnly}
            onChange={(e) => setSystemOnly(e.target.checked)}
          />
          Apenas sistema
        </label>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} roles</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Permissões</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="text-sm">{role.companyName}</TableCell>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{role.code}</TableCell>
              <TableCell>
                {role.isSystem ? (
                  <Badge variant="secondary" className="text-xs">
                    sistema
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    customizado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{role.permissionCount}</TableCell>
              <TableCell>
                {/* Link para a gestão de permissões do role na empresa */}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/companies/${role.companyId}`}>Ver empresa</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Criar page.tsx**

A página carrega em paralelo as matrices de todos os roles-sistema e a lista global de roles.

```typescript
// src/app/(dashboard)/admin/platform/roles/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSystemRolePermissions, listAllRoles } from "@/modules/tenancy";
import { AdminSystemRolesTab } from "@/modules/tenancy/components/admin-system-roles-tab";
import { AdminAllRolesTab } from "@/modules/tenancy/components/admin-all-roles-tab";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_ROLE_CODES = ["owner", "manager", "operator"] as const;

export default async function PlatformRolesPage() {
  const supabase = await createClient();

  // Verifica quais codes de roles-sistema existem na plataforma
  const { data: sysRoles } = await supabase
    .from("roles")
    .select("code")
    .eq("is_system", true)
    .in("code", [...SYSTEM_ROLE_CODES]);

  const existingCodes = [...new Set((sysRoles ?? []).map((r) => r.code))];

  const [matrices, allRoles] = await Promise.all([
    Promise.all(existingCodes.map((code) => getSystemRolePermissions(code))),
    listAllRoles(),
  ]);

  const initialMatrices: Record<string, Awaited<ReturnType<typeof getSystemRolePermissions>>> = {};
  for (let i = 0; i < existingCodes.length; i++) {
    initialMatrices[existingCodes[i]!] = matrices[i]!;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie roles-sistema (com propagação global) e visualize roles de todas as empresas
        </p>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">Roles Sistema</TabsTrigger>
          <TabsTrigger value="all">Por Empresa ({allRoles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="pt-4">
          <AdminSystemRolesTab roleCodes={existingCodes} initialMatrices={initialMatrices} />
        </TabsContent>

        <TabsContent value="all" className="pt-4">
          <AdminAllRolesTab roles={allRoles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: Adicionar novos componentes ao barrel**

Em `src/modules/tenancy/index.ts`, adicionar:

```typescript
export { AdminSystemRolesTab } from "./components/admin-system-roles-tab";
export { AdminAllRolesTab } from "./components/admin-all-roles-tab";
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Esperado: 0 erros.

- [ ] **Step 6: Rodar lint**

```bash
npm run lint
```

Esperado: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/admin/platform/roles/page.tsx src/modules/tenancy/components/admin-system-roles-tab.tsx src/modules/tenancy/components/admin-all-roles-tab.tsx src/modules/tenancy/index.ts
git commit -m "feat(admin): página de roles /admin/platform/roles com tabs Sistema e Por Empresa"
```

---

## Self-Review contra a spec

| Requisito da spec                              | Task que cobre |
| ---------------------------------------------- | -------------- |
| `/admin/platform/layout.tsx` herda proteção    | Task 9         |
| `ADMIN_MENU` + 2 itens                         | Task 9         |
| Módulos: tabela com stats                      | Task 10        |
| Toggle `is_active` global                      | Task 5 + 10    |
| Bulk ativar/desativar para todas as empresas   | Task 6 + 10    |
| Criar módulo (`/new`)                          | Task 11        |
| Editar módulo (`/[code]`)                      | Task 12        |
| CRUD permissões com warning CASCADE            | Task 6 + 12    |
| Tab Roles Sistema — matrix + propagação global | Task 7 + 13    |
| Badge "inconsistente"                          | Task 4 + 13    |
| Tab Por Empresa — tabela global + filtros      | Task 13        |
| RPC `update_system_role_permissions`           | Task 1         |
| RLS write para `modules` e `permissions`       | Task 1         |
| `is_platform_admin()` em todas as actions      | Tasks 5-7      |
