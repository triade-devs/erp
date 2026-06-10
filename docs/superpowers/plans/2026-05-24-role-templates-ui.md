# PR #D3 — Role templates UI + cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UI completa pra gerenciar `role_templates` via platform admin: CRUD + aplicação a empresas (dry-run + apply). Reformula `/admin/platform/roles` em read-only matrix. Adiciona badge "Personalizada" + reset em `/[companySlug]/settings/roles`. Remove RPC obsoleto `update_system_role_permissions` + action + componente correspondentes.

**Architecture:** Reuso máximo de componentes shadcn já presentes. Templates como cards (não tabela) — UX mais escaneável. Aplicação em fluxo de 2 passos: dry-run → confirm. Badge "Personalizada" lê `roles.template_synced_at IS NULL`. Reset chama RPC `apply_template_to_company`.

**Tech Stack:** Next.js 15 App Router · Server Components · Server Actions · Shadcn/UI (Card, Sheet, Dialog, Badge, Tabs) · Vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 1" (UI mudanças).

**Depende de:** PRs #A–#D2 (em `feat/roles-evolution`).

**Não inclui:**

- Drop final da coluna `legacy_is_owner` (D2-followup).
- Fases 2-4 (hierarquia, scopes, field-level) — vêm em PRs F/G/H.

---

## File Structure

| Arquivo                                                                                    | Responsabilidade                             | Ação                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------- | ---------------------- |
| `src/modules/tenancy/queries/list-role-templates.ts`                                       | Lista templates + counts                     | CREATE                 |
| `src/modules/tenancy/queries/get-template-with-permissions.ts`                             | Detalhe template + matriz perms              | CREATE                 |
| `src/modules/tenancy/queries/get-template-apply-preview.ts`                                | Dry-run: in-sync vs divergent                | CREATE                 |
| `src/modules/tenancy/queries/list-roles-with-template-status.ts`                           | Para `/admin/platform/roles` reformulada     | CREATE                 |
| `src/modules/tenancy/actions/create-role-template.ts`                                      | Criar template custom                        | CREATE                 |
| `src/modules/tenancy/actions/update-role-template.ts`                                      | Atualizar nome/descrição/sort                | CREATE                 |
| `src/modules/tenancy/actions/update-template-permissions.ts`                               | Atualizar template_permissions               | CREATE                 |
| `src/modules/tenancy/actions/delete-role-template.ts`                                      | Apenas custom (is_system=false)              | CREATE                 |
| `src/modules/tenancy/actions/apply-template-to-companies.ts`                               | Bulk apply (calls RPC per company)           | CREATE                 |
| `src/modules/tenancy/actions/reset-role-from-template.ts`                                  | Per-tenant reset (calls apply RPC com force) | CREATE                 |
| `src/modules/tenancy/index.ts`                                                             | Barrel exports                               | MODIFY                 |
| `src/modules/tenancy/schemas/role-template.ts`                                             | Zod schemas                                  | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/page.tsx`                               | Lista de templates                           | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/new/page.tsx`                           | Criar template                               | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/[code]/page.tsx`                        | Detalhes + edit perms + apply                | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/[code]/edit-template-form.tsx`          | Form de nome/descrição                       | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/[code]/template-permissions-matrix.tsx` | Matriz de perms editável                     | CREATE                 |
| `src/app/(dashboard)/admin/platform/role-templates/[code]/apply-template-dialog.tsx`       | Dry-run + confirm                            | CREATE                 |
| `src/app/(dashboard)/admin/platform/roles/page.tsx`                                        | Refactor: read-only matrix                   | MODIFY                 |
| `src/app/(dashboard)/[companySlug]/settings/roles/page.tsx`                                | Badge "Personalizada" + reset                | MODIFY                 |
| `src/app/(dashboard)/[companySlug]/settings/roles/reset-template-button.tsx`               | Botão reset com confirm                      | CREATE                 |
| `src/core/navigation/menu.ts` (ou onde sidebar é definida)                                 | Link pra /admin/platform/role-templates      | MODIFY (se necessário) |
| `supabase/migrations/20260524000056_drop_obsolete_update_system_role_permissions.sql`      | Drop RPC obsoleto                            | CREATE                 |
| `src/modules/tenancy/actions/update-system-role-permissions.ts`                            | DELETE (obsoleto)                            | DELETE                 |
| `src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts`             | DELETE                                       | DELETE                 |
| `src/modules/tenancy/components/admin-system-roles-tab.tsx`                                | DELETE (substituído por templates)           | DELETE                 |
| `src/modules/tenancy/queries/get-system-role-permissions.ts`                               | DELETE (substituído)                         | DELETE                 |
| Tests novos para novas actions                                                             | CREATE                                       | CREATE                 |

Não toca: módulos não relacionados a roles/templates, RLS de outras tabelas.

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/role-templates-ui
```

---

## Task 1: Backend — queries + actions para templates

**Files:**

- Create: `src/modules/tenancy/schemas/role-template.ts`
- Create: `src/modules/tenancy/queries/list-role-templates.ts`
- Create: `src/modules/tenancy/queries/get-template-with-permissions.ts`
- Create: `src/modules/tenancy/queries/get-template-apply-preview.ts`
- Create: `src/modules/tenancy/queries/list-roles-with-template-status.ts`
- Create: `src/modules/tenancy/actions/create-role-template.ts`
- Create: `src/modules/tenancy/actions/update-role-template.ts`
- Create: `src/modules/tenancy/actions/update-template-permissions.ts`
- Create: `src/modules/tenancy/actions/delete-role-template.ts`
- Create: `src/modules/tenancy/actions/apply-template-to-companies.ts`
- Create: `src/modules/tenancy/actions/reset-role-from-template.ts`
- Modify: `src/modules/tenancy/index.ts` (barrel)

### Step 1: Schemas

`src/modules/tenancy/schemas/role-template.ts`:

```ts
import { z } from "zod";

export const roleTemplateCreateSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Apenas minúsculas, números, _ e -"),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
});

export const roleTemplateUpdateSchema = roleTemplateCreateSchema.omit({ code: true });

export type RoleTemplateCreateInput = z.infer<typeof roleTemplateCreateSchema>;
export type RoleTemplateUpdateInput = z.infer<typeof roleTemplateUpdateSchema>;
```

### Step 2: Queries (server-only)

`list-role-templates.ts` — Lista templates + counts.

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleTemplateSummary = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  permsCount: number;
  instancesCount: number;
  divergentCount: number;
};

export async function listRoleTemplates(): Promise<RoleTemplateSummary[]> {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("role_templates")
    .select("code, name, description, is_system, sort_order")
    .order("sort_order");

  if (error) throw error;
  if (!templates?.length) return [];

  const codes = templates.map((t) => t.code);

  const [{ data: perms }, { data: roles }] = await Promise.all([
    supabase.from("template_permissions").select("template_code").in("template_code", codes),
    supabase.from("roles").select("template_code, template_synced_at").in("template_code", codes),
  ]);

  const permsCount = new Map<string, number>();
  for (const p of perms ?? []) {
    permsCount.set(p.template_code, (permsCount.get(p.template_code) ?? 0) + 1);
  }

  const instancesCount = new Map<string, number>();
  const divergentCount = new Map<string, number>();
  for (const r of roles ?? []) {
    if (!r.template_code) continue;
    instancesCount.set(r.template_code, (instancesCount.get(r.template_code) ?? 0) + 1);
    if (r.template_synced_at === null) {
      divergentCount.set(r.template_code, (divergentCount.get(r.template_code) ?? 0) + 1);
    }
  }

  return templates.map((t) => ({
    code: t.code,
    name: t.name,
    description: t.description,
    isSystem: t.is_system,
    sortOrder: t.sort_order,
    permsCount: permsCount.get(t.code) ?? 0,
    instancesCount: instancesCount.get(t.code) ?? 0,
    divergentCount: divergentCount.get(t.code) ?? 0,
  }));
}
```

`get-template-with-permissions.ts` — Matriz para edição.

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TemplatePermissionRow = {
  code: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
};

export type TemplateModulePerms = {
  moduleCode: string;
  moduleName: string;
  permissions: TemplatePermissionRow[];
};

export type TemplateDetail = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  modules: TemplateModulePerms[];
};

export async function getTemplateWithPermissions(
  templateCode: string,
): Promise<TemplateDetail | null> {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("role_templates")
    .select("code, name, description, is_system, sort_order")
    .eq("code", templateCode)
    .maybeSingle();

  if (!template) return null;

  const [{ data: granted }, { data: allPerms }] = await Promise.all([
    supabase
      .from("template_permissions")
      .select("permission_code")
      .eq("template_code", templateCode),
    supabase
      .from("permissions")
      .select("code, module_code, resource, action, description, modules(name)")
      .order("module_code")
      .order("resource")
      .order("action"),
  ]);

  const grantedSet = new Set((granted ?? []).map((g) => g.permission_code));

  const moduleMap = new Map<string, { moduleName: string; permissions: TemplatePermissionRow[] }>();

  for (const p of allPerms ?? []) {
    if (!moduleMap.has(p.module_code)) {
      const moduleName = (p.modules as { name: string } | null)?.name ?? p.module_code;
      moduleMap.set(p.module_code, { moduleName, permissions: [] });
    }
    moduleMap.get(p.module_code)!.permissions.push({
      code: p.code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      granted: grantedSet.has(p.code),
    });
  }

  const modules = Array.from(moduleMap.entries()).map(([moduleCode, v]) => ({
    moduleCode,
    moduleName: v.moduleName,
    permissions: v.permissions,
  }));

  return {
    code: template.code,
    name: template.name,
    description: template.description,
    isSystem: template.is_system,
    sortOrder: template.sort_order,
    modules,
  };
}
```

`get-template-apply-preview.ts` — Dry-run.

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ApplyPreviewRow = {
  companyId: string;
  companyName: string;
  companySlug: string;
  roleId: string;
  syncedAt: string | null;
  divergent: boolean;
};

export type ApplyPreview = {
  inSync: ApplyPreviewRow[];
  divergent: ApplyPreviewRow[];
};

export async function getTemplateApplyPreview(templateCode: string): Promise<ApplyPreview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select(
      `
      id,
      template_synced_at,
      company:companies ( id, name, slug )
    `,
    )
    .eq("template_code", templateCode);

  if (error) throw error;

  const rows: ApplyPreviewRow[] = (data ?? []).map((r) => {
    const company = r.company as unknown as { id: string; name: string; slug: string } | null;
    return {
      companyId: company?.id ?? "",
      companyName: company?.name ?? "—",
      companySlug: company?.slug ?? "",
      roleId: r.id,
      syncedAt: r.template_synced_at,
      divergent: r.template_synced_at === null,
    };
  });

  return {
    inSync: rows.filter((r) => !r.divergent),
    divergent: rows.filter((r) => r.divergent),
  };
}
```

`list-roles-with-template-status.ts` — Para `/admin/platform/roles` reformulada.

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleWithTemplateStatus = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  templateCode: string | null;
  syncedAt: string | null;
  divergent: boolean;
  companyId: string;
  companyName: string;
  companySlug: string;
};

export async function listRolesWithTemplateStatus(): Promise<RoleWithTemplateStatus[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select(
      `
      id, code, name, is_system, template_code, template_synced_at,
      company:companies ( id, name, slug )
    `,
    )
    .order("company(name)")
    .order("code");

  if (error) throw error;

  return (data ?? []).map((r) => {
    const company = r.company as unknown as { id: string; name: string; slug: string } | null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      isSystem: r.is_system,
      templateCode: r.template_code,
      syncedAt: r.template_synced_at,
      divergent: r.template_code !== null && r.template_synced_at === null,
      companyId: company?.id ?? "",
      companyName: company?.name ?? "—",
      companySlug: company?.slug ?? "",
    };
  });
}
```

### Step 3: Actions

`create-role-template.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";
import { roleTemplateCreateSchema } from "../schemas/role-template";

export async function createRoleTemplateAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = roleTemplateCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("role_templates").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sort_order,
    is_system: false,
  });

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.create",
    resourceType: "role_template",
    resourceId: parsed.data.code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  return { ok: true, message: "Template criado" };
}
```

`update-role-template.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";
import { roleTemplateUpdateSchema } from "../schemas/role-template";

export async function updateRoleTemplateAction(
  code: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = roleTemplateUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("role_templates")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.update",
    resourceType: "role_template",
    resourceId: code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  revalidatePath(`/admin/platform/role-templates/${code}`);
  return { ok: true, message: "Template atualizado" };
}
```

`update-template-permissions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function updateTemplatePermissionsAction(
  templateCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const requested = (formData.getAll("permission_code") as string[]).filter(Boolean);

  const { data: validPerms } = await supabase.from("permissions").select("code");
  const validSet = new Set((validPerms ?? []).map((p) => p.code));
  const filteredRequested = requested.filter((c) => validSet.has(c));

  const { data: current } = await supabase
    .from("template_permissions")
    .select("permission_code")
    .eq("template_code", templateCode);

  const currentSet = new Set((current ?? []).map((c) => c.permission_code));
  const desiredSet = new Set(filteredRequested);

  const toAdd = filteredRequested.filter((c) => !currentSet.has(c));
  const toRemove = [...currentSet].filter((c) => !desiredSet.has(c));

  if (toRemove.length) {
    const { error: delErr } = await supabase
      .from("template_permissions")
      .delete()
      .eq("template_code", templateCode)
      .in("permission_code", toRemove);
    if (delErr) return { ok: false, message: delErr.message };
  }

  if (toAdd.length) {
    const { error: insErr } = await supabase
      .from("template_permissions")
      .insert(toAdd.map((c) => ({ template_code: templateCode, permission_code: c })));
    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId: null,
    action: "platform.role_template.permissions_update",
    resourceType: "role_template",
    resourceId: templateCode,
    status: "success",
    metadata: { added: toAdd, removed: toRemove },
  });

  revalidatePath(`/admin/platform/role-templates/${templateCode}`);
  return { ok: true, message: "Permissões do template atualizadas" };
}
```

`delete-role-template.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function deleteRoleTemplateAction(code: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data: tpl } = await supabase
    .from("role_templates")
    .select("is_system")
    .eq("code", code)
    .maybeSingle();

  if (!tpl) return { ok: false, message: "Template não encontrado" };
  if (tpl.is_system) return { ok: false, message: "Templates de sistema não podem ser deletados" };

  const { error } = await supabase.from("role_templates").delete().eq("code", code);
  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.delete",
    resourceType: "role_template",
    resourceId: code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  return { ok: true, message: "Template deletado" };
}
```

`apply-template-to-companies.ts` — Bulk apply via RPC.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function applyTemplateToCompaniesAction(
  templateCode: string,
  companyIds: string[],
  force: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const results: Array<{ companyId: string; ok: boolean; message?: string }> = [];

  for (const companyId of companyIds) {
    const { error } = await supabase.rpc("apply_template_to_company", {
      p_company: companyId,
      p_template_code: templateCode,
      p_force: force,
    });
    results.push({
      companyId,
      ok: !error,
      message: error?.message,
    });
  }

  const failedCount = results.filter((r) => !r.ok).length;

  await audit({
    companyId: null,
    action: "platform.role_template.apply",
    resourceType: "role_template",
    resourceId: templateCode,
    status: failedCount === 0 ? "success" : "error",
    metadata: { companyCount: companyIds.length, failedCount, force, results },
  });

  revalidatePath(`/admin/platform/role-templates/${templateCode}`);
  revalidatePath("/admin/platform/roles");

  if (failedCount > 0) {
    return {
      ok: false,
      message: `Aplicado em ${companyIds.length - failedCount}/${companyIds.length} empresas. ${failedCount} falhou(ram).`,
    };
  }
  return { ok: true, message: `Aplicado em ${companyIds.length} empresas` };
}
```

`reset-role-from-template.ts` — Per-tenant reset.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function resetRoleFromTemplateAction(
  companyId: string,
  roleId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  // Pega o template_code da role
  const { data: role } = await supabase
    .from("roles")
    .select("template_code, code")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!role) return { ok: false, message: "Role não encontrada" };
  if (!role.template_code)
    return { ok: false, message: "Esta role não tem template — nada a resetar" };

  const { error } = await supabase.rpc("apply_template_to_company", {
    p_company: companyId,
    p_template_code: role.template_code,
    p_force: true, // reset assume override
  });

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "role.reset_from_template",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { templateCode: role.template_code },
  });

  revalidatePath(`/[companySlug]/settings/roles`, "page");
  return { ok: true, message: "Role resetada para o template" };
}
```

### Step 4: Barrel update

Adicionar em `src/modules/tenancy/index.ts`:

```ts
// Templates (PR #D3)
export { listRoleTemplates } from "./queries/list-role-templates";
export type { RoleTemplateSummary } from "./queries/list-role-templates";
export { getTemplateWithPermissions } from "./queries/get-template-with-permissions";
export type {
  TemplateDetail,
  TemplateModulePerms,
  TemplatePermissionRow,
} from "./queries/get-template-with-permissions";
export { getTemplateApplyPreview } from "./queries/get-template-apply-preview";
export type { ApplyPreview, ApplyPreviewRow } from "./queries/get-template-apply-preview";
export { listRolesWithTemplateStatus } from "./queries/list-roles-with-template-status";
export type { RoleWithTemplateStatus } from "./queries/list-roles-with-template-status";

export { createRoleTemplateAction } from "./actions/create-role-template";
export { updateRoleTemplateAction } from "./actions/update-role-template";
export { updateTemplatePermissionsAction } from "./actions/update-template-permissions";
export { deleteRoleTemplateAction } from "./actions/delete-role-template";
export { applyTemplateToCompaniesAction } from "./actions/apply-template-to-companies";
export { resetRoleFromTemplateAction } from "./actions/reset-role-from-template";
```

### Step 5: Typecheck + commit

```bash
npm run typecheck
```

Expected: zero erros.

```bash
git add src/modules/tenancy/schemas/role-template.ts \
        src/modules/tenancy/queries/list-role-templates.ts \
        src/modules/tenancy/queries/get-template-with-permissions.ts \
        src/modules/tenancy/queries/get-template-apply-preview.ts \
        src/modules/tenancy/queries/list-roles-with-template-status.ts \
        src/modules/tenancy/actions/create-role-template.ts \
        src/modules/tenancy/actions/update-role-template.ts \
        src/modules/tenancy/actions/update-template-permissions.ts \
        src/modules/tenancy/actions/delete-role-template.ts \
        src/modules/tenancy/actions/apply-template-to-companies.ts \
        src/modules/tenancy/actions/reset-role-from-template.ts \
        src/modules/tenancy/index.ts
git commit -m "feat(tenancy): templates queries+actions backend

PR #D3 step. 4 queries (list templates, get detail, apply preview,
list roles with status) + 6 actions (CRUD templates + bulk apply +
per-tenant reset). Barrel atualizado.

UI consome em commits seguintes."
```

---

## Task 2: UI — Lista + criar template

**Files:**

- Create: `src/app/(dashboard)/admin/platform/role-templates/page.tsx`
- Create: `src/app/(dashboard)/admin/platform/role-templates/new/page.tsx`
- Create: `src/app/(dashboard)/admin/platform/role-templates/new/create-template-form.tsx`

### Step 1: Lista (page.tsx)

```tsx
import Link from "next/link";
import { listRoleTemplates } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Templates de Role — Plataforma" };

export default async function PlatformRoleTemplatesPage() {
  const templates = await listRoleTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Role</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo global de perfis-padrão. Edite uma vez, aplique a empresas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/platform/role-templates/new">+ Novo template</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.code} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  {t.isSystem ? (
                    <Badge variant="secondary">sistema</Badge>
                  ) : (
                    <Badge variant="outline">custom</Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{t.code}</p>
              </CardHeader>
              <CardContent className="flex-1">
                {t.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    {t.permsCount} {t.permsCount === 1 ? "permissão" : "permissões"}
                  </span>
                  <span className="rounded bg-muted px-2 py-1">{t.instancesCount} empresas</span>
                  {t.divergentCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {t.divergentCount} divergente(s)
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/admin/platform/role-templates/${t.code}`}>Detalhes & aplicar</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 2: Form de criação

`create-template-form.tsx` (client component):

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { createRoleTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial = { ok: true as const };

export function CreateTemplateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createRoleTemplateAction, initial);

  useEffect(() => {
    if (state.ok && state !== initial) {
      toast.success(state.message ?? "Template criado");
      router.push("/admin/platform/role-templates");
    } else if (!state.ok) {
      toast.error(state.message ?? "Erro");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="code">Code (slug)</Label>
        <Input id="code" name="code" required placeholder="ex: viewer" />
      </div>
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required placeholder="ex: Visualizador" />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Opcional" />
      </div>
      <div>
        <Label htmlFor="sort_order">Ordem</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={100} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar template"}
      </Button>
    </form>
  );
}
```

### Step 3: `new/page.tsx`

```tsx
import { CreateTemplateForm } from "./create-template-form";

export const metadata = { title: "Novo template — Plataforma" };

export default function NewRoleTemplatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Novo template de role</h1>
      <CreateTemplateForm />
    </div>
  );
}
```

### Step 4: Verificar `tenancy/client.ts` exporta as actions

Se `client.ts` re-exporta actions (provavelmente sim), adicionar:

```ts
export { createRoleTemplateAction } from "./actions/create-role-template";
export { updateRoleTemplateAction } from "./actions/update-role-template";
export { updateTemplatePermissionsAction } from "./actions/update-template-permissions";
export { deleteRoleTemplateAction } from "./actions/delete-role-template";
export { applyTemplateToCompaniesAction } from "./actions/apply-template-to-companies";
export { resetRoleFromTemplateAction } from "./actions/reset-role-from-template";
```

### Step 5: Commit

```bash
npm run typecheck && npm run lint
git add 'src/app/(dashboard)/admin/platform/role-templates/' src/modules/tenancy/client.ts
git commit -m "feat(ui): rota /admin/platform/role-templates list + create

PR #D3 step. Cards de templates com counts (perms, empresas, divergentes).
Form de criação valida via Zod (kebab-case code, nome, descrição, ordem)."
```

---

## Task 3: UI — Detalhes do template + edit perms + apply

**Files:**

- Create: `src/app/(dashboard)/admin/platform/role-templates/[code]/page.tsx`
- Create: `src/app/(dashboard)/admin/platform/role-templates/[code]/edit-template-form.tsx`
- Create: `src/app/(dashboard)/admin/platform/role-templates/[code]/template-permissions-matrix.tsx`
- Create: `src/app/(dashboard)/admin/platform/role-templates/[code]/apply-template-dialog.tsx`

### Step 1: `[code]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { getTemplateWithPermissions, getTemplateApplyPreview } from "@/modules/tenancy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EditTemplateForm } from "./edit-template-form";
import { TemplatePermissionsMatrix } from "./template-permissions-matrix";
import { ApplyTemplateDialog } from "./apply-template-dialog";

type Props = { params: Promise<{ code: string }> };

export default async function RoleTemplateDetailPage({ params }: Props) {
  const { code } = await params;
  const [detail, preview] = await Promise.all([
    getTemplateWithPermissions(code),
    getTemplateApplyPreview(code),
  ]);

  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            {detail.isSystem ? (
              <Badge variant="secondary">sistema</Badge>
            ) : (
              <Badge variant="outline">custom</Badge>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{code}</p>
          {detail.description && (
            <p className="mt-2 text-sm text-muted-foreground">{detail.description}</p>
          )}
        </div>
        <ApplyTemplateDialog templateCode={code} preview={preview} />
      </div>

      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="pt-4">
          <TemplatePermissionsMatrix templateCode={code} modules={detail.modules} />
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <EditTemplateForm
            code={code}
            initialValues={{
              name: detail.name,
              description: detail.description,
              sort_order: detail.sortOrder,
            }}
            isSystem={detail.isSystem}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 2: `edit-template-form.tsx`

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateRoleTemplateAction, deleteRoleTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  code: string;
  initialValues: { name: string; description: string | null; sort_order: number };
  isSystem: boolean;
};

const initial = { ok: true as const };

export function EditTemplateForm({ code, initialValues, isSystem }: Props) {
  const router = useRouter();
  const action = updateRoleTemplateAction.bind(null, code);
  const [state, formAction, isPending] = useActionState(action, initial);

  useEffect(() => {
    if (state !== initial) {
      if (state.ok) toast.success(state.message ?? "Atualizado");
      else toast.error(state.message ?? "Erro");
    }
  }, [state]);

  async function handleDelete() {
    const r = await deleteRoleTemplateAction(code);
    if (r.ok) {
      toast.success(r.message ?? "Deletado");
      router.push("/admin/platform/role-templates");
    } else {
      toast.error(r.message ?? "Erro");
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={initialValues.name} required />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initialValues.description ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="sort_order">Ordem</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={initialValues.sort_order}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>

      {!isSystem && (
        <div className="border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Deletar template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar template {initialValues.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Roles em empresas que apontam para este template perdem a referência
                  (template_code = null). Instâncias não são removidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
```

### Step 3: `template-permissions-matrix.tsx`

Reutilizar padrão do `list-role-permission-matrix.tsx` UI. Sketch:

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateTemplatePermissionsAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TemplateModulePerms } from "@/modules/tenancy";

type Props = {
  templateCode: string;
  modules: TemplateModulePerms[];
};

const initial = { ok: true as const };

export function TemplatePermissionsMatrix({ templateCode, modules }: Props) {
  const action = updateTemplatePermissionsAction.bind(null, templateCode);
  const [state, formAction, isPending] = useActionState(action, initial);

  // Track checked state locally for immediate feedback
  const [checked, setChecked] = useState<Set<string>>(
    new Set(modules.flatMap((m) => m.permissions.filter((p) => p.granted).map((p) => p.code))),
  );

  useEffect(() => {
    if (state !== initial) {
      if (state.ok) toast.success(state.message ?? "Salvo");
      else toast.error(state.message ?? "Erro");
    }
  }, [state]);

  function toggle(code: string, value: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {modules.map((m) => (
        <div key={m.moduleCode}>
          <h3 className="mb-2 font-semibold">{m.moduleName}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.permissions.map((p) => (
                <TableRow key={p.code}>
                  <TableCell>
                    <Checkbox
                      checked={checked.has(p.code)}
                      onCheckedChange={(v) => toggle(p.code, v === true)}
                    />
                    {checked.has(p.code) && (
                      <input type="hidden" name="permission_code" value={p.code} />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell>{p.resource}</TableCell>
                  <TableCell>{p.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar permissões"}
      </Button>
    </form>
  );
}
```

### Step 4: `apply-template-dialog.tsx`

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { applyTemplateToCompaniesAction } from "@/modules/tenancy/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ApplyPreview } from "@/modules/tenancy";

type Props = {
  templateCode: string;
  preview: ApplyPreview;
};

export function ApplyTemplateDialog({ templateCode, preview }: Props) {
  const [open, setOpen] = useState(false);
  const [includeDivergent, setIncludeDivergent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const selectedIds = [
    ...preview.inSync.map((r) => r.companyId),
    ...(includeDivergent ? preview.divergent.map((r) => r.companyId) : []),
  ];

  async function handleApply() {
    setIsPending(true);
    const r = await applyTemplateToCompaniesAction(templateCode, selectedIds, includeDivergent);
    setIsPending(false);
    if (r.ok) {
      toast.success(r.message ?? "Aplicado");
      setOpen(false);
    } else {
      toast.error(r.message ?? "Erro");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Aplicar a empresas</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aplicar template a empresas</DialogTitle>
          <DialogDescription>
            Sincroniza role_permissions de cada role linkada com o template atual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">In sync ({preview.inSync.length})</h4>
            {preview.inSync.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {preview.inSync.map((r) => (
                  <li key={r.roleId}>{r.companyName}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Divergentes ({preview.divergent.length})</h4>
              <Badge variant="destructive" className="text-xs">
                Personalizadas
              </Badge>
            </div>
            {preview.divergent.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {preview.divergent.map((r) => (
                  <li key={r.roleId}>{r.companyName}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {preview.divergent.length > 0 && (
          <div className="flex items-center gap-2 rounded border border-destructive/20 bg-destructive/5 p-3">
            <Checkbox
              id="includeDivergent"
              checked={includeDivergent}
              onCheckedChange={(v) => setIncludeDivergent(v === true)}
            />
            <label htmlFor="includeDivergent" className="text-xs">
              Forçar overwrite das {preview.divergent.length} empresa(s) divergentes (perde
              customizações)
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isPending || selectedIds.length === 0}>
            {isPending ? "Aplicando..." : `Aplicar em ${selectedIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 5: Commit

```bash
npm run typecheck && npm run lint
git add 'src/app/(dashboard)/admin/platform/role-templates/[code]/'
git commit -m "feat(ui): template detail + edit perms + apply dialog

PR #D3 step. Detalhe do template com tabs (Permissões / Configurações).
Edit form para nome/descrição/ordem + botão deletar (custom only).
Matriz de perms editável agrupada por módulo.
Dialog apply com dry-run (in-sync vs divergent) e checkbox force-overwrite."
```

---

## Task 4: UI — Refactor `/admin/platform/roles` read-only

**Files:**

- Modify: `src/app/(dashboard)/admin/platform/roles/page.tsx`
- Delete: `src/modules/tenancy/components/admin-system-roles-tab.tsx` (substituído)

### Step 1: Substituir page por matriz read-only

```tsx
import { listRolesWithTemplateStatus } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Roles por empresa — Plataforma" };

export default async function PlatformRolesPage() {
  const roles = await listRolesWithTemplateStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles por empresa</h1>
          <p className="text-sm text-muted-foreground">
            Visualização read-only. Para editar templates →{" "}
            <Link href="/admin/platform/role-templates" className="underline">
              Templates de Role
            </Link>
            .
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/admin/companies/${r.companyId}`} className="underline">
                  {r.companyName}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                {r.isSystem ? (
                  <Badge variant="secondary">sistema</Badge>
                ) : (
                  <Badge variant="outline">custom</Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.templateCode ?? "—"}
              </TableCell>
              <TableCell>
                {r.templateCode === null ? (
                  <Badge variant="outline">sem template</Badge>
                ) : r.divergent ? (
                  <Badge variant="destructive">divergente</Badge>
                ) : (
                  <Badge variant="default">sincronizado</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.syncedAt ? new Date(r.syncedAt).toLocaleString("pt-BR") : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Step 2: Deletar componente obsoleto

```bash
rm src/modules/tenancy/components/admin-system-roles-tab.tsx
```

Remover do barrel:

```ts
// REMOVER: export { AdminSystemRolesTab } from "./components/admin-system-roles-tab";
// REMOVER: export type { SystemRoleMatrix, SystemRolePermission } from "./queries/get-system-role-permissions";
// REMOVER: export { getSystemRolePermissions } from "./queries/get-system-role-permissions";
```

### Step 3: Verificar não há outros consumers

```bash
grep -rn "AdminSystemRolesTab\|getSystemRolePermissions\|AdminAllRolesTab" src/ | grep -v test
```

Expected: zero (ou só na próxima limpeza).

`AdminAllRolesTab` substituído pela tabela inline acima — pode deletar também:

```bash
rm src/modules/tenancy/components/admin-all-roles-tab.tsx
```

Remover do barrel: `AdminAllRolesTab` e `listAllRoles`/`RoleWithCompany`. Mas `listAllRoles` pode estar em uso por outras telas — VERIFICAR primeiro:

```bash
grep -rn "listAllRoles\|AdminAllRolesTab" src/ | grep -v test
```

Se zero ou apenas o page que substituímos, deletar.

### Step 4: Commit

```bash
npm run typecheck && npm run lint
git add 'src/app/(dashboard)/admin/platform/roles/page.tsx' \
        src/modules/tenancy/index.ts
git rm src/modules/tenancy/components/admin-system-roles-tab.tsx \
       src/modules/tenancy/components/admin-all-roles-tab.tsx \
       src/modules/tenancy/queries/get-system-role-permissions.ts \
       src/modules/tenancy/queries/list-all-roles.ts
git commit -m "refactor(ui): /admin/platform/roles vira matriz read-only

PR #D3 step. Substitui tabs (System Roles / All Roles) por tabela única
mostrando todas as roles de todas as empresas com status de sync vs
template. Edição de templates agora vive em /admin/platform/role-templates.
Remove componentes e queries obsoletos."
```

---

## Task 5: UI — Badge "Personalizada" + reset em `/[companySlug]/settings/roles`

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/settings/roles/reset-template-button.tsx`
- Modify: `src/modules/tenancy/queries/list-company-roles.ts` (precisa retornar `templateCode` + `syncedAt`)

### Step 1: Atualizar `list-company-roles.ts` para retornar status template

```ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CompanyRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  templateCode: string | null;
  syncedAt: string | null;
  divergent: boolean;
};

export async function listCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system, template_code, template_synced_at")
    .eq("company_id", companyId)
    .order("is_system", { ascending: false })
    .order("name");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    isSystem: r.is_system,
    templateCode: r.template_code,
    syncedAt: r.template_synced_at,
    divergent: r.template_code !== null && r.template_synced_at === null,
  }));
}
```

### Step 2: `reset-template-button.tsx`

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { resetRoleFromTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  companyId: string;
  roleId: string;
  roleName: string;
};

export function ResetTemplateButton({ companyId, roleId, roleName }: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleReset() {
    setIsPending(true);
    const r = await resetRoleFromTemplateAction(companyId, roleId);
    setIsPending(false);
    if (r.ok) toast.success(r.message ?? "Resetado");
    else toast.error(r.message ?? "Erro");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs" disabled={isPending}>
          {isPending ? "Resetando..." : "Resetar do template"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar {roleName} para o template?</AlertDialogTitle>
          <AlertDialogDescription>
            Todas as permissões customizadas desta role serão perdidas e substituídas pelas do
            template.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>Resetar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Step 3: Atualizar `page.tsx` da settings/roles

Adicionar coluna Status + botão reset:

```tsx
// Substituir bloco de TableHeader e TableBody para incluir nova coluna

<TableHeader>
  <TableRow>
    <TableHead>Nome</TableHead>
    <TableHead>Código</TableHead>
    <TableHead>Descrição</TableHead>
    <TableHead>Tipo</TableHead>
    <TableHead>Status</TableHead>
    {canManage && <TableHead className="w-[260px]">Ações</TableHead>}
  </TableRow>
</TableHeader>
<TableBody>
  {roles.map((role) => (
    <TableRow key={role.id}>
      <TableCell className="font-medium">{role.name}</TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">
        {role.code}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {role.description ?? "—"}
      </TableCell>
      <TableCell>
        {role.isSystem ? (
          <Badge variant="secondary">Sistema</Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
        )}
      </TableCell>
      <TableCell>
        {role.templateCode === null ? (
          <Badge variant="outline">sem template</Badge>
        ) : role.divergent ? (
          <Badge variant="destructive">Personalizada</Badge>
        ) : (
          <Badge>Sincronizada</Badge>
        )}
      </TableCell>
      {canManage && (
        <TableCell>
          <div className="flex items-center gap-1 flex-wrap">
            {!role.isSystem && (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/${companySlug}/settings/roles/${role.id}`}>Editar</Link>
                </Button>
                <DeleteRoleButton
                  companyId={company.id}
                  roleId={role.id}
                  roleName={role.name}
                />
              </>
            )}
            {role.templateCode !== null && role.divergent && (
              <ResetTemplateButton
                companyId={company.id}
                roleId={role.id}
                roleName={role.name}
              />
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  ))}
</TableBody>
```

Adicionar import:

```ts
import { ResetTemplateButton } from "./reset-template-button";
```

### Step 4: Commit

```bash
npm run typecheck && npm run lint
git add src/modules/tenancy/queries/list-company-roles.ts \
        'src/app/(dashboard)/[companySlug]/settings/roles/page.tsx' \
        'src/app/(dashboard)/[companySlug]/settings/roles/reset-template-button.tsx'
git commit -m "feat(ui): badge Personalizada + reset button em settings/roles

PR #D3 step. listCompanyRoles agora retorna templateCode/syncedAt/divergent.
Tabela ganha coluna Status. Botão Reset visível apenas para roles
divergentes — confirm dialog antes de chamar apply_template_to_company
com p_force=true."
```

---

## Task 6: Remover RPC obsoleto + action + tests

**Files:**

- Create: `supabase/migrations/20260524000056_drop_obsolete_update_system_role_permissions.sql`
- Delete: `src/modules/tenancy/actions/update-system-role-permissions.ts`
- Delete: `src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts`
- Modify: `src/modules/tenancy/index.ts` (remove export)

### Step 1: Migration

```sql
-- 20260524000056_drop_obsolete_update_system_role_permissions.sql
-- PR #D3: RPC update_system_role_permissions é obsoleta. Workflow novo:
-- editar template_permissions e aplicar via apply_template_to_company.

drop function if exists public.update_system_role_permissions(text, text[]);
```

Aplicar via MCP.

### Step 2: Deletar arquivos TS

```bash
rm src/modules/tenancy/actions/update-system-role-permissions.ts \
   src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
```

### Step 3: Remover do barrel

Em `src/modules/tenancy/index.ts`, remover:

```ts
// REMOVER: export { updateSystemRolePermissionsAction } from "./actions/update-system-role-permissions";
```

### Step 4: Regen types + commit

```bash
# Regen via MCP (RPC removida dos tipos)
npm run typecheck && npm run test
git add supabase/migrations/20260524000056_drop_obsolete_update_system_role_permissions.sql \
        src/modules/tenancy/index.ts \
        src/types/database.types.ts
git rm src/modules/tenancy/actions/update-system-role-permissions.ts \
       src/modules/tenancy/actions/__tests__/update-system-role-permissions.test.ts
git commit -m "chore: remove obsolete update_system_role_permissions RPC + action

PR #D3 cleanup. Substituído por workflow templates + apply_template_to_company.
Migration drop, action/test/barrel deletados."
```

---

## Task 7: Push + PR + validação manual

- [ ] Push:

  ```bash
  git push -u origin feat/role-templates-ui
  ```

- [ ] Criar PR base=feat/roles-evolution com summary completo, lista de checks DB/TS/manual.

- [ ] Manual:
  - Acessar `/admin/platform/role-templates` (precisa ser platform admin)
  - Criar template custom
  - Editar perms via matriz
  - Aplicar a empresas in-sync (sem force)
  - Tentar aplicar a divergentes sem force (deve mostrar opção)
  - Aplicar com force
  - Visitar `/admin/platform/roles` — ver matriz read-only com status
  - Visitar `/<slug>/settings/roles` — ver badges Sincronizada/Personalizada
  - Editar perms de uma role system → vira "Personalizada"
  - Clicar "Resetar do template" → vira "Sincronizada"

---

## Self-Review Checklist

- Spec coverage: CRUD templates ✓, apply UI com dry-run ✓, badge Personalizada + reset ✓, /admin/platform/roles refactor ✓, remoção do RPC obsoleto ✓.
- Placeholders: zero TBD/TODO em código (sketches em SQL/TSX são completos).
- Acessibilidade: forms usam Label + htmlFor; dialogs usam AlertDialog shadcn.
- Permissions: actions de template gateadas por `is_platform_admin`; reset gateado por `core:role:manage`.
- Idempotência DB: aproveitada via apply RPC.
- Rollback: re-add RPC obsoleto (preservado em git history); types regen.

## YAGNI (fora desta PR)

- Filtros/busca avançada em `/admin/platform/roles` (default: ordenar por empresa+code).
- Bulk delete de templates.
- Histórico/versionamento de templates.
- Drop final `legacy_is_owner` (D2-followup).
- Mudanças nos PRs F/G/H.
