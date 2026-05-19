# Design: erp-infra-modules Skill

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** Create `.claude/skills/erp-infra-modules/SKILL.md`

---

## Problem

The `erp-module-conventions` skill covers feature modules (inventory, knowledge-base, etc.) with a full structure checklist. Infrastructure modules (`auth`, `authz`, `audit`, `tenancy`) are exempt from that checklist but have no documented patterns of their own. This creates two risks:

1. **Wrong rules applied** — someone extends `auth` and adds `requirePermission` because that's what conventions say; or adds a full migration with `role_permissions` to a module that doesn't need one.
2. **No guidance on how to extend** — someone adding a new query to `tenancy` or a new event type to `audit` has no reference for the correct pattern.

---

## Approach

Single skill file `erp-infra-modules/SKILL.md` with:

- **Auto-invoke trigger** covering all 4 modules
- **Global section** — what applies to all infra modules and what doesn't
- **Per-module sections** — structure, rules, and how-to-extend for each module

---

## Skill Structure

### Trigger (description field)

```
Use when creating or modifying the auth, authz, audit, or tenancy modules —
adding queries, actions, services, components, or hooks to any of these
infrastructure modules.
```

### Section 1: Global Rules

**Applies to all infra modules:**

- Barrel (`index.ts`) is mandatory — deep imports are blocked by ESLint
- `import "server-only"` at top of every query file
- Types derived from `Database` (not hand-written interfaces)
- No Supabase client in `services/` files — pure logic only

**Does NOT apply to infra modules:**

- Full folder structure (missing `services/`, `types/`, `schemas/` is fine)
- `requirePermission()` in actions — infra modules manage auth/tenancy themselves
- Migration checklist from `erp-module-conventions` (company_modules, role_permissions)
- `revalidatePath` requirement — not always relevant

### Section 2: `auth`

**Purpose:** Identity — who is the user? Login, logout, signup, OAuth, password reset.

**Structure allowed:**

```
auth/
├── actions/     ← Server Actions for auth flows
├── components/  ← Forms (SignInForm, SignUpForm, etc.)
├── queries/     ← getCurrentUser, listResetRequests
├── schemas/     ← Zod schemas for auth inputs
├── client.ts    ← Client-side context/hooks if needed
└── index.ts
```

**Key rules:**

- Actions do NOT call `requirePermission` — they ARE the authentication layer
- Actions call Supabase Auth directly (`supabase.auth.signInWithPassword`, etc.)
- `getCurrentUser()` returns the user + their company memberships — it is the only source of truth for the current user in Server Components
- No `services/` folder — auth logic lives directly in actions and queries

**How to extend:**

- New auth flow → new file in `actions/` + schema in `schemas/` + component in `components/`
- New user data query → new file in `queries/` with `import "server-only"` at top
- Export everything through `index.ts`

### Section 3: `authz`

**Purpose:** Authorization — can this user do this action? Permission checks for Server Actions and UI.

**Structure allowed:**

```
authz/
├── services/    ← Pure permission logic (requirePermission, hasPermission)
├── components/  ← <Can> provider and gate component
├── hooks/       ← usePermissions (client-side)
├── client.ts    ← Client-side permission context
└── index.ts
```

**Key rules:**

- `services/` is pure — NO Supabase client, NO `next/headers`, NO cookies
- Permission data flows in as a parameter or comes from the session object passed in
- `requirePermission(companyId, permissionCode)` — throws `ForbiddenError` if denied
- `hasPermission(companyId, permissionCode)` — returns boolean for UI branching
- Platform admins receive `Set(["*"])` — this bypasses TS checks but NOT Postgres RLS

**How to extend:**

- New permission utility → add to `services/authz-service.ts` as a pure function
- New UI gate → add component to `components/` wrapping `usePermissions`
- Do NOT add Supabase calls here — permission data is fetched elsewhere and passed in

### Section 4: `audit`

**Purpose:** Traceability — what was done, by whom, when?

**Structure allowed:**

```
audit/
├── services/    ← audit() function — called by other modules' actions
├── queries/     ← listAuditLogs, listAuditLogsGlobal
├── components/  ← AuditLogTable
└── index.ts
```

**Key rules:**

- `audit()` is called FROM other modules' actions — NEVER from components or pages directly
- `audit()` is fire-and-forget — errors inside it must NOT propagate to the calling action
- No actions of its own — audit does not expose Server Actions

**How to extend:**

- New event type → add the string literal to the audit event type union in `services/audit-service.ts`
- New audit query (e.g., filter by event type) → new file in `queries/` with `import "server-only"`
- Never add components that call `audit()` directly

**Correct usage from another module's action:**

```ts
// ✅ Inside an action after a successful DB write:
await audit({ companyId, userId, event: "product:created", resourceId: product.id });
// audit errors are swallowed internally — action proceeds regardless
```

### Section 5: `tenancy`

**Purpose:** Multi-tenancy — company membership, roles, permissions, module toggles, invitations.

**Structure allowed:**

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

**Key rules:**

- `getActiveCompanyId()` lives in `services/active-company.ts` — it reads the active company from cookies. It is the canonical way to get `companyId` in Server Actions.
- `resolveCompany(companySlug)` lives in `queries/` — used in page Server Components to resolve slug → company row + membership check.
- Admin-only actions (e.g., `createModuleAction`, `bulkToggleModuleForCompaniesAction`) check `is_platform_admin` or `requirePermission` with a tenancy-specific permission. Do not skip this check.
- `switchActiveCompanyAction` writes a cookie — it does NOT need `revalidatePath` (the redirect handles it).

**How to extend:**

- New company setting → add field to `updateCompanySettingsAction` + schema + migration
- New role capability → new action in `actions/` + add to barrel
- New query → `queries/` with `import "server-only"` + export from `index.ts`

---

## Red Flags

| Thought                                                    | Reality                                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "I'll add `requirePermission` to this `auth` action"       | `auth` actions are the auth layer — no permission checks here                          |
| "I'll call `audit()` from a component"                     | `audit()` goes in Server Actions only, after DB writes                                 |
| "I'll add Supabase to `authz/services/`"                   | `authz` services are pure — pass data in, don't fetch it                               |
| "I'll skip the barrel in `tenancy` since it's already big" | Barrel is mandatory — ESLint blocks deep imports                                       |
| "I need a new infra module"                                | Stop and discuss — creating a new infra module is a significant architectural decision |

---

## Files Changed

- `.claude/skills/erp-infra-modules/SKILL.md` ← new file
