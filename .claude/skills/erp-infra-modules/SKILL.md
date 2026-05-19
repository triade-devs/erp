---
name: erp-infra-modules
description: Use when creating or modifying the auth, authz, audit, or tenancy modules — adding queries, actions, services, components, or hooks to any of these infrastructure modules.
---

# ERP Infrastructure Modules

## Overview

Infrastructure modules (`auth`, `authz`, `audit`, `tenancy`) are framework-level — they own the cross-cutting concerns that feature modules depend on. They are **exempt** from the full structure checklist in `erp-module-conventions`, but each has its own rules.

## Global Rules — all 4 modules

**Always applies:**

- `index.ts` barrel is mandatory — ESLint blocks deep imports
- `import "server-only"` at the top of every query file
- Types derived from `Database["public"]["Tables"]["x"]["Row"]` — no hand-written interfaces duplicating DB columns
- `services/` files are pure — no Supabase client, no `next/headers`, no `getActiveCompanyId()`

**Does NOT apply to infra modules:**

- Full folder structure (missing `services/`, `types/`, `schemas/` is fine)
- `requirePermission()` in actions — infra modules manage their own authorization
- Migration checklist from `erp-module-conventions` (`company_modules`, `role_permissions`)
- Mandatory `revalidatePath` — not always applicable

---

## `auth` — Identidade

**Purpose:** Who is the user? Login, logout, signup, OAuth, password reset.

**Structure:**

```
auth/
├── actions/     ← Server Actions for auth flows
├── components/  ← Forms (SignInForm, SignUpForm, etc.)
├── queries/     ← getCurrentUser, listResetRequests
├── schemas/     ← Zod schemas for auth inputs
├── client.ts    ← Client-side context if needed
└── index.ts
```

**Rules:**

- Actions do **NOT** call `requirePermission` — they ARE the authentication layer
- Actions call Supabase Auth directly (`supabase.auth.signInWithPassword`, etc.)
- `getCurrentUser()` is the only source of truth for the current user in Server Components — it returns user + company memberships
- No `services/` — auth logic lives directly in actions and queries

**How to extend:**

- New auth flow → new file in `actions/` + schema in `schemas/` + component in `components/`
- New user data query → new file in `queries/` with `import "server-only"`
- Export everything through `index.ts`

---

## `authz` — Autorização

**Purpose:** Can this user do this? Permission checks for Server Actions and UI gating.

**Structure:**

```
authz/
├── services/    ← Pure permission logic (requirePermission, hasPermission)
├── components/  ← <Can> and PermissionsProvider
├── hooks/       ← usePermissions (client-side)
├── client.ts    ← Client-side permission context
└── index.ts
```

**Rules:**

- `services/` may use Supabase — permission lookups require DB queries (`memberships`, `roles`, `role_permissions`)
- `services/` does NOT use `next/headers`, cookies, or `getActiveCompanyId()` — the user is resolved via `supabase.auth.getUser()` internally
- `requirePermission(companyId, permissionCode)` throws `ForbiddenError` if denied
- `hasPermission(companyId, permissionCode)` returns boolean for UI branching
- Platform admins receive `Set(["*"])` in TypeScript — this bypasses TS checks but **not** Postgres RLS

**How to extend:**

- New permission utility → add to `services/authz-service.ts`
- New UI gate → add component to `components/` wrapping `usePermissions`
- Do NOT add cookie/header access to services — keep identity resolution via Supabase Auth only

---

## `audit` — Rastreabilidade

**Purpose:** What was done, by whom, when? Immutable log of actions across the system.

**Structure:**

```
audit/
├── services/    ← audit() — called by other modules' actions
├── queries/     ← listAuditLogs, listAuditLogsGlobal
├── components/  ← AuditLogTable
└── index.ts
```

**Rules:**

- `audit()` is called **from other modules' actions** — never from components or pages directly
- `audit()` is fire-and-forget — it logs errors to console but never throws, never fails the calling action
- No actions of its own — `audit` does not expose Server Actions

**Correct usage from another module's action:**

```ts
// ✅ After a successful DB write, at the end of the action:
await audit({
  companyId,
  action: "product:created",
  resourceType: "product",
  resourceId: product.id,
  status: "success",
});
// audit() swallows errors internally — action proceeds regardless
```

**How to extend:**

- New event type → add the string literal to the `action` field in the call — no schema change needed
- New audit query (e.g., filter by event type) → new file in `queries/` with `import "server-only"`
- Never add components that call `audit()` directly

---

## `tenancy` — Multi-tenancy

**Purpose:** Company membership, roles, permissions, module toggles, invitations.

**Structure:**

```
tenancy/
├── actions/     ← Company, member, role, invitation, module management
├── queries/     ← resolveCompany, listMyCompanies, getActiveCompanySlug, etc.
├── services/    ← getActiveCompanyId (reads active company from cookies)
├── components/  ← CompanySwitcher, forms, tables
├── schemas/     ← Zod schemas for all tenancy inputs
├── client.ts    ← Client-side company context
├── constants.ts ← Shared constants (e.g., cookie names)
└── index.ts
```

**Rules:**

- `getActiveCompanyId()` lives in `services/active-company.ts` — reads the active company from cookies. It is the canonical way to get `companyId` in Server Actions.
- `resolveCompany(companySlug)` lives in `queries/` — used in page Server Components to resolve slug → company row + membership check.
- Admin-only actions (e.g., `createModuleAction`, `bulkToggleModuleForCompaniesAction`) must check `is_platform_admin` or `requirePermission` with a tenancy-specific permission code.
- `switchActiveCompanyAction` writes a cookie — it does not need `revalidatePath` (the redirect handles navigation).

**How to extend:**

- New company setting → `updateCompanySettingsAction` + schema field + migration
- New role capability → new file in `actions/` + export from `index.ts`
- New query → `queries/` with `import "server-only"` + export from `index.ts`

---

## Red Flags

| Thought                                                        | Reality                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| "I'll add `requirePermission` to this `auth` action"           | `auth` actions are the authentication layer — no permission checks here                                             |
| "I'll call `audit()` from a component"                         | `audit()` goes in Server Actions only, after successful DB writes                                                   |
| "I'll add cookie/header access to `authz/services/`"           | `authz` services resolve identity via `supabase.auth.getUser()` only — no `next/headers`, no `getActiveCompanyId()` |
| "I'll skip the barrel since `tenancy/index.ts` is already big" | Barrel is mandatory — ESLint blocks deep imports regardless of size                                                 |
| "I need a new infra module"                                    | Stop and discuss — creating a new infrastructure module is a significant architectural decision                     |
