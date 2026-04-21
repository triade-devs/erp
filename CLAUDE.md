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
2. **RLS in Postgres** (`supabase/migrations/20260420_04_rls_policies.sql`) is the authoritative permission layer. The helper `public.current_user_role()` reads from `profiles` and is used by policies — products writes are gated to `admin`/`manager`. Mirror role checks in TS via `modules/auth/services/profile-service.ts` (`canWriteProducts`, `isAdmin`) for UI/UX, but never rely on them for security.

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
