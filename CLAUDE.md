# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 15 (App Router + Server Actions, React 19) · Supabase (Auth + Postgres + RLS) · Tailwind + Shadcn/UI · Zod · TypeScript strict (with `noUncheckedIndexedAccess`). Path alias `@/*` → `src/*`. Project messaging is in Portuguese (pt-BR) — keep user-facing strings, error messages, and comments in Portuguese to match the existing code.

## Common commands

```bash
npm run dev          # Next dev server
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + custom rules)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier

npm run db:push      # Apply supabase/migrations to linked project
npm run db:reset     # Reset local Supabase DB
npm run db:types     # Regenerate src/types/database.types.ts from linked schema
```

There is no test runner configured yet. Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files via the `pre-commit` hook.

After pulling schema changes or editing `supabase/migrations/`, run `npm run db:push && npm run db:types` so `Database` types stay in sync — `lib/supabase/{server,client}.ts` are typed against this generated file.

## Architecture

### Modular boundaries (enforced by ESLint)

Each feature lives in `src/modules/<domain>/` with this internal layout:

```
modules/<domain>/
├── actions/    # Server Actions — "use server", return ActionResult
├── queries/    # Server-only reads — start file with `import "server-only"`
├── components/ # React components for the module
├── services/   # Pure business logic, framework-free, easily testable
├── schemas/    # Zod schemas (input validation)
├── types/      # Types derived from Database types
└── index.ts    # Barrel — the ONLY public API of the module
```

`.eslintrc.cjs` blocks deep imports like `@/modules/inventory/services/stock-service`. Always import via the barrel: `import { ... } from "@/modules/inventory"`. When adding new exports, update `index.ts`.

### Server Actions return `ActionResult`

`src/lib/errors.ts` defines `ActionResult = { ok: true; message? } | { ok: false; message?; fieldErrors? }`. All actions follow this contract: parse `FormData` with the module's Zod schema, return `fieldErrors` from `safeParse` on validation failure, return `{ ok: false, message }` on auth/business errors, and call `revalidatePath` on success. See `modules/inventory/actions/register-movement.ts` for the canonical pattern.

### Two-layer authorization

1. **Middleware** (`src/middleware.ts`) refreshes the Supabase session on every request and gates routes via `PUBLIC_ROUTES` allowlist. Authenticated users hitting `/login` or `/register` get redirected to `/`.
2. **RLS in Postgres** is the authoritative permission layer. Policies use helpers like `is_platform_admin()` and `has_permission()` from the `authz` module (see `supabase/migrations/20260423_15_products_rls.sql` and `20260423_16_movements_rls.sql`). In TS, Server Actions call `requirePermission()` from `src/modules/authz/` to enforce permission checks; UI/UX role checks use the user's memberships via `getCurrentUser()` — but never rely on TS checks alone for security.

> ⚠️ **RLS failures are silent.** If a role lacks the required `permission_code` (or it's inactive in `role_permissions.is_active`), the RLS USING clause returns 0 rows — no error. Always verify RLS works for both platform admins and regular users. Since migration `20260523000047`, `has_permission()` in Postgres absorbs `is_platform_admin()`, so policies use `has_permission()` alone — do **not** add a redundant `is_platform_admin() OR` (migration 048 removed the old ones). `is_platform_admin()` itself reads `platform_role_assignments` (migration 059; the `platform_admins` table is deprecated). In TS, platform admins get `Set(["*"])` from `getEffectivePermissions()`, mirroring the Postgres behavior.

### Adding permissions for a new module

When creating a new module with its own permissions, **always include a migration in the same PR** that assigns those permissions to all existing roles (using `r.code`, not role UUIDs). Failing to do so leaves companies created before the migration without any access — and the failure is silent (RLS returns 0 rows, no error). Follow the pattern in `supabase/migrations/20260425000021_kb_permissions.sql`:

```sql
-- Enable module for all companies
INSERT INTO company_modules (company_id, module_code)
SELECT id, 'my-module' FROM companies ON CONFLICT DO NOTHING;

-- Assign permissions by role code (covers all companies, past and future)
INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r CROSS JOIN permissions p
WHERE r.code = 'owner' AND p.module_code = 'my-module'
ON CONFLICT DO NOTHING;
```

### Two Supabase clients

`src/lib/supabase/server.ts` (cookies via `next/headers`, used in Server Components, Actions, Route Handlers) and `src/lib/supabase/client.ts` (browser). Both are typed `<Database>` and read env via `src/core/config/env.ts`, which validates env vars at import time using Zod — adding a new env var requires updating that schema.

### Stock movements: trigger is the source of truth

Inserting into `stock_movements` fires `trg_apply_stock_movement` (see `20260420_03_stock_movements.sql`), which atomically updates `products.stock` and raises `Estoque insuficiente` for negative balances. The TS `validateMovement` in `modules/inventory/services/stock-service.ts` is a UX pre-check only — never bypass the trigger by writing to `products.stock` directly.

### Modular menu

`src/core/navigation/menu.ts` exports `MODULES_MENU`, consumed by `app/(dashboard)/layout.tsx`. New modules register themselves here — don't edit the layout to add nav items.

### Route groups

`app/(auth)/` — public (login/register/recover). `app/(dashboard)/` — protected (uses `getCurrentUser` + `redirect` as a defense-in-depth check beyond middleware). `app/api/auth/callback/route.ts` handles the OAuth code exchange.

## Reference docs

`docs/PLAN.md` is the original spec/roadmap (large file). `README.md` has setup instructions including the Shadcn component install command needed after `npm install`.

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.

<!-- /rtk-instructions -->
