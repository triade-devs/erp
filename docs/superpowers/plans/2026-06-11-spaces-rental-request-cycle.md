# Ciclo de Solicitação de Aluguel de Espaços — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solicitação self-service de reservas de espaço (N datas/horários, pendência trava o slot) com aprovação/recusa por item pelo gestor.

**Architecture:** Abordagem A do spec `docs/superpowers/specs/2026-06-11-spaces-rental-request-cycle-design.md` — tudo em `space_rentals`: enum ganha `pending`/`rejected`, coluna `request_batch_id` agrupa o pacote, exclusion constraint passa a cobrir `pending`+`confirmed` (trava no banco). Novas permissões `spaces:rental:request`/`spaces:rental:approve`, nova role `espacos-solicitante`. Actions `request-rental` e `decide-rental`; calendário pinta pendências; rota `/spaces/requests` para o gestor.

**Tech Stack:** Next.js 15 Server Actions, Supabase Postgres (RLS + exclusion constraint), Zod, vitest, pgTAP, MCP Supabase (`apply_migration`, `generate_typescript_types`) — projeto `jrfyfgpjnswcguvvuxpx`.

**Decisões finas (derivadas do spec):**

- `ALTER TYPE ... ADD VALUE` não pode ser USADO na mesma transação que o cria → **duas migrations**: 053 (enum + coluna) e 054 (constraint + perms/roles + RLS, que referenciam `'pending'`).
- Como pendência também entra no exclusion constraint, **aprovar nunca conflita** (o slot já está travado pela própria linha). O handler 23P01 em `decide-rental` é só defensivo.
- **Fix de segurança necessário**: a RLS de UPDATE atual permite ao locatário alterar a própria linha para QUALQUER status — com o ciclo novo isso permitiria auto-aprovação (`pending→confirmed`). O `with check` do caminho do locatário passa a aceitar somente `status = 'cancelled'`.
- O fluxo de seleção é por **diálogo "Solicitar reserva"** (linhas dinâmicas de data/horário) na página do calendário — não por clique-e-arrasta no grid (YAGNI).

---

## Pré-requisitos

- Branch `claude/adoring-heisenberg-m7cnwz`. Tasks 1–2 criam arquivos; Task 3 toca produção (**pausar e pedir confirmação do usuário**); Tasks 4–11 são código local; Task 12 fecha com verificação.

---

### Task 1: Migration 053 — enum + coluna de batch

**Files:**

- Create: `supabase/migrations/20260612000053_rental_request_status.sql`

- [ ] **Step 1: Criar o arquivo com este conteúdo exato**

```sql
-- 20260612000053_rental_request_status.sql
-- Ciclo de solicitação (spec 2026-06-11): novos status do aluguel + batch.
-- ALTER TYPE ADD VALUE não pode ser usado na mesma transação que o cria —
-- constraint/policies que referenciam 'pending' ficam na migration 054.

alter type public.rental_status add value if not exists 'pending' before 'confirmed';
alter type public.rental_status add value if not exists 'rejected';

-- Agrupa os slots de uma mesma solicitação (null = reserva direta do gestor)
alter table public.space_rentals
  add column if not exists request_batch_id uuid;

create index if not exists idx_space_rentals_batch
  on public.space_rentals(request_batch_id)
  where request_batch_id is not null;

comment on column public.space_rentals.request_batch_id is
  'Spec 2026-06-11: agrupa os slots de uma mesma solicitação self-service. NULL em reservas diretas.';
```

- [ ] **Step 2: Commit**

```bash
rtk git add supabase/migrations/20260612000053_rental_request_status.sql
rtk git commit -m "feat(spaces): status pending/rejected e request_batch_id em space_rentals"
```

---

### Task 2: Migration 054 — constraint, permissões, roles e RLS

**Files:**

- Create: `supabase/migrations/20260612000054_rental_request_cycle.sql`

- [ ] **Step 1: Criar o arquivo com este conteúdo exato**

```sql
-- 20260612000054_rental_request_cycle.sql
-- Ciclo de solicitação (spec 2026-06-11), parte 2:
-- constraint cobre pending, novas permissões/role e RLS do fluxo.

-- ─── 1. Pendência trava o slot (fonte da verdade no banco) ──────────────────
alter table public.space_rentals drop constraint if exists space_rentals_no_overlap;
alter table public.space_rentals
  add constraint space_rentals_no_overlap
  exclude using gist (space_id with =, period with &&)
  where (status in ('confirmed', 'pending'));

-- ─── 2. Permissões novas ─────────────────────────────────────────────────────
insert into public.permissions (code, module_code, resource, action, description) values
  ('spaces:rental:request', 'spaces', 'rental', 'request', 'Solicitar reserva de espaço para si'),
  ('spaces:rental:approve', 'spaces', 'rental', 'approve', 'Aprovar ou recusar solicitações de reserva')
on conflict (code) do nothing;

-- ─── 3. Templates ────────────────────────────────────────────────────────────
insert into public.role_templates (code, name, description, is_system, sort_order) values
  ('espacos-solicitante', 'Solicitante de Espaços', 'Vê o calendário e solicita reservas para si', true, 65)
on conflict (code) do nothing;

update public.role_templates set parent_template_code = 'admin'
 where code = 'espacos-solicitante';

insert into public.template_permissions (template_code, permission_code) values
  ('espacos-solicitante', 'spaces:space:read'),
  ('espacos-solicitante', 'spaces:rental:read'),
  ('espacos-solicitante', 'spaces:rental:request'),
  ('espacos-gestao',      'spaces:rental:approve'),
  ('admin',               'spaces:rental:request'),
  ('admin',               'spaces:rental:approve')
on conflict do nothing;

-- ─── 4. Instancia/atualiza roles nas empresas com módulo spaces ativo ────────
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at, parent_role_id)
select cm.company_id, t.code, t.name, t.description, true, t.code, now(), a.id
from public.company_modules cm
join public.roles a on a.company_id = cm.company_id and a.code = 'admin'
join public.role_templates t on t.code = 'espacos-solicitante'
where cm.module_code = 'spaces'
on conflict (company_id, code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, tp.permission_code, true
from public.roles r
join public.template_permissions tp on tp.template_code = r.template_code
where r.code = 'espacos-solicitante'
on conflict (role_id, permission_code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, 'spaces:rental:approve', true
from public.roles r where r.code = 'espacos-gestao'
on conflict (role_id, permission_code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
cross join (values ('spaces:rental:request'), ('spaces:rental:approve')) as p(code)
where r.code = 'admin'
on conflict (role_id, permission_code) do nothing;

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────
-- INSERT: gestor cria direto (create) OU solicitante cria pendência para si
drop policy if exists "space_rentals_insert" on public.space_rentals;
create policy "space_rentals_insert" on public.space_rentals
  for insert with check (
    public.has_permission(company_id, 'spaces:rental:create')
    or (
      public.has_permission(company_id, 'spaces:rental:request')
      and renter_user_id = auth.uid()
      and status = 'pending'
    )
  );

-- UPDATE: gestor cancela; gestor com approve decide; locatário pode
-- EDITAR a própria pendência (continua pending) ou CANCELAR/retirar o
-- que é dele — mas nunca se auto-aprovar (resultado confirmed bloqueado).
drop policy if exists "space_rentals_update" on public.space_rentals;
create policy "space_rentals_update" on public.space_rentals
  for update
  using (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or public.has_permission(company_id, 'spaces:rental:approve')
    or renter_user_id = auth.uid()
  )
  with check (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or public.has_permission(company_id, 'spaces:rental:approve')
    or (renter_user_id = auth.uid() and status in ('pending', 'cancelled'))
  );
```

- [ ] **Step 2: Commit**

```bash
rtk git add supabase/migrations/20260612000054_rental_request_cycle.sql
rtk git commit -m "feat(spaces): constraint com pending, permissoes request/approve, role espacos-solicitante e RLS do ciclo"
```

---

### Task 3: Aplicar em produção + regenerar types ⚠️ CONFIRMAR COM O USUÁRIO

Sem o supabase CLI local, os types vêm do projeto linkado — por isso prod recebe o schema antes do código (inofensivo: nada usa os status novos ainda).

- [ ] **Step 1: Pausar e pedir confirmação do usuário para tocar produção**

- [ ] **Step 2: Aplicar via MCP `apply_migration`** (`project_id: jrfyfgpjnswcguvvuxpx`), na ordem: `name: rental_request_status` (conteúdo da 053), depois `name: rental_request_cycle` (conteúdo da 054).

- [ ] **Step 3: Verificar via MCP `execute_sql`**

```sql
select unnest(enum_range(null::rental_status)) as status;
-- esperado: pending, confirmed, rejected, cancelled (ordem do enum pode variar; conter os 4)
select c.slug, r.code from roles r join companies c on c.id = r.company_id
where r.code = 'espacos-solicitante' order by c.slug;
-- esperado: default-company e hc-ufpr
```

- [ ] **Step 4: Regenerar types** via MCP `generate_typescript_types` e sobrescrever `src/types/database.types.ts` com o resultado (Write). Conferir: `rental_status` contém `"pending" | "rejected"`; `space_rentals.Row` contém `request_batch_id: string | null`.

- [ ] **Step 5: Verificar e commitar**

Run: `npm run typecheck` → OK (nada usa os campos novos ainda).

```bash
rtk git add src/types/database.types.ts
rtk git commit -m "chore(types): regenera database.types com pending/rejected e request_batch_id"
```

---

### Task 4: Service — `validateRequestSlots` (TDD)

**Files:**

- Modify: `src/modules/spaces/services/rental-service.ts` (acrescentar ao final)
- Test: `src/modules/spaces/services/__tests__/rental-service.test.ts` (criar; se já existir, acrescentar os describes)

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest";
import { validateRequestSlots, RentalSlotError } from "../rental-service";

const d = (s: string) => new Date(s);

describe("validateRequestSlots", () => {
  it("normaliza e aceita slots hourly válidos sem conflito", () => {
    const out = validateRequestSlots(
      "hourly",
      [
        { startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") },
        { startsAt: d("2026-07-08T10:00:00"), endsAt: d("2026-07-08T12:00:00") },
      ],
      [],
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.startsAt.getHours()).toBe(10);
  });

  it("normaliza daily para dias inteiros (fim exclusivo no dia seguinte)", () => {
    const out = validateRequestSlots(
      "daily",
      [{ startsAt: d("2026-07-01T15:30:00"), endsAt: d("2026-07-01T15:30:00") }],
      [],
    );
    expect(out[0]?.startsAt.getHours()).toBe(0);
    expect(out[0]?.endsAt.getDate()).toBe(2);
  });

  it("rejeita slot com término antes do início", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [{ startsAt: d("2026-07-01T12:00:00"), endsAt: d("2026-07-01T10:00:00") }],
        [],
      ),
    ).toThrow(RentalSlotError);
  });

  it("rejeita sobreposição entre os próprios slots do pedido", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [
          { startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") },
          { startsAt: d("2026-07-01T11:00:00"), endsAt: d("2026-07-01T13:00:00") },
        ],
        [],
      ),
    ).toThrow(/se sobrepõem/);
  });

  it("rejeita conflito com reserva existente (pending ou confirmed)", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [{ startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") }],
        [{ starts_at: "2026-07-01T11:00:00", ends_at: "2026-07-01T13:00:00" }],
      ),
    ).toThrow(/já existe/i);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar** — `npm test -- rental-service` → FAIL (`validateRequestSlots` não existe).

- [ ] **Step 3: Implementar no final de `rental-service.ts`**

```ts
export class RentalSlotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RentalSlotError";
  }
}

/**
 * Valida os slots de uma solicitação: período válido por tipo, sem
 * sobreposição interna entre os slots e sem conflito com reservas
 * existentes (pending + confirmed). Retorna os períodos normalizados.
 * Pré-checagem de UX — a verdade final é o exclusion constraint.
 */
export function validateRequestSlots(
  kind: RentalKind,
  slots: { startsAt: Date; endsAt: Date }[],
  existing: Pick<SpaceRental, "starts_at" | "ends_at">[],
): { startsAt: Date; endsAt: Date }[] {
  const normalized = slots.map((slot, i) => {
    const invalid = kind === "daily" ? slot.endsAt < slot.startsAt : slot.endsAt <= slot.startsAt;
    if (invalid) {
      throw new RentalSlotError(
        `Slot ${i + 1}: o término deve ser ${kind === "daily" ? "igual ou " : ""}depois do início`,
      );
    }
    return normalizeRentalPeriod(kind, slot.startsAt, slot.endsAt);
  });

  for (const [i, a] of normalized.entries()) {
    for (const [j, b] of normalized.entries()) {
      if (j <= i) continue;
      if (a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime()) {
        throw new RentalSlotError(`Os slots ${i + 1} e ${j + 1} se sobrepõem`);
      }
    }
  }

  for (const [i, period] of normalized.entries()) {
    if (hasOverlap(period, existing)) {
      throw new RentalSlotError(`Slot ${i + 1}: já existe reserva ou solicitação neste período`);
    }
  }

  return normalized;
}
```

- [ ] **Step 4: Rodar** — `npm test -- rental-service` → PASS. **Step 5: Commit**

```bash
rtk git add src/modules/spaces/services
rtk git commit -m "feat(spaces): validateRequestSlots para solicitacoes com multiplos slots"
```

---

### Task 5: Schemas + types do batch

**Files:**

- Modify: `src/modules/spaces/schemas/index.ts` (acrescentar antes dos `export type`)
- Modify: `src/modules/spaces/types/index.ts`

- [ ] **Step 1: Acrescentar schemas**

```ts
const requestSlotSchema = z.object({
  startsAt: z.coerce.date({ invalid_type_error: "Data de início inválida" }),
  endsAt: z.coerce.date({ invalid_type_error: "Data de término inválida" }),
});

export const requestRentalSchema = z.object({
  spaceId: z.string().uuid("Espaço inválido"),
  bookingKind: z.enum(["daily", "hourly"], { required_error: "Selecione o tipo de reserva" }),
  // FormData manda os slots como JSON string
  slots: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Slots inválidos" });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(requestSlotSchema)
        .min(1, "Informe ao menos uma data/horário")
        .max(20, "Máximo de 20 slots por solicitação"),
    ),
  notes: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
});

export const decideRentalSchema = z.object({
  rentalId: z.string().uuid("Reserva inválida"),
  decision: z.enum(["approve", "reject"], { required_error: "Decisão inválida" }),
});
```

E nos exports de tipos do mesmo arquivo:

```ts
export type RequestRentalInput = z.infer<typeof requestRentalSchema>;
export type DecideRentalInput = z.infer<typeof decideRentalSchema>;
```

- [ ] **Step 2: Acrescentar em `types/index.ts`** (depois de `RentalWithRelations`)

```ts
/** Pacote de solicitação pendente agrupado por request_batch_id. */
export type PendingRequestBatch = {
  batchId: string;
  requester: { id: string; full_name: string } | null;
  space: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
  items: RentalWithRelations[];
};
```

- [ ] **Step 3: Verificar e commitar** — `npm run typecheck` → OK.

```bash
rtk git add src/modules/spaces/schemas/index.ts src/modules/spaces/types/index.ts
rtk git commit -m "feat(spaces): schemas de solicitacao/decisao e tipo PendingRequestBatch"
```

---

### Task 6: Action `request-rental`

**Files:**

- Create: `src/modules/spaces/actions/request-rental.ts`

- [ ] **Step 1: Criar com este conteúdo**

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { requestRentalSchema } from "../schemas";
import {
  validateRequestSlots,
  RentalSlotError,
  RentalOverlapError,
} from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

export async function requestRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestRentalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "spaces:rental:request");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { spaceId, bookingKind, slots, notes } = parsed.data;

  // Espaço precisa existir, estar ativo e aceitar o tipo de reserva
  const { data: space } = await supabase
    .from("spaces")
    .select("id, is_active, booking_mode, default_price")
    .eq("id", spaceId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!space || !space.is_active) return { ok: false, message: "Espaço não encontrado ou inativo" };
  if (space.booking_mode !== "both" && space.booking_mode !== bookingKind) {
    return { ok: false, message: "Este espaço não aceita este tipo de reserva" };
  }

  // Pré-checagem de conflito contra pendentes + confirmadas (UX)
  const { data: existing, error: exErr } = await supabase
    .from("space_rentals")
    .select("starts_at, ends_at")
    .eq("space_id", spaceId)
    .in("status", ["confirmed", "pending"]);
  if (exErr) return { ok: false, message: exErr.message };

  let periods: { startsAt: Date; endsAt: Date }[];
  try {
    periods = validateRequestSlots(bookingKind, slots, existing ?? []);
  } catch (e) {
    if (e instanceof RentalSlotError) return { ok: false, message: e.message };
    throw e;
  }

  const batchId = randomUUID();
  const { error } = await supabase.from("space_rentals").insert(
    periods.map((p) => ({
      company_id: companyId,
      space_id: spaceId,
      renter_user_id: user.id,
      booking_kind: bookingKind,
      starts_at: p.startsAt.toISOString(),
      ends_at: p.endsAt.toISOString(),
      price: space.default_price,
      status: "pending" as const,
      request_batch_id: batchId,
      notes: notes ?? null,
      created_by: user.id,
    })),
  );

  if (error) {
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  const n = periods.length;
  return { ok: true, message: `Solicitação enviada (${n} ${n === 1 ? "horário" : "horários"})` };
}
```

- [ ] **Step 2: Verificar e commitar** — `npm run typecheck && npm test` → OK.

```bash
rtk git add src/modules/spaces/actions/request-rental.ts
rtk git commit -m "feat(spaces): action request-rental cria batch de slots pendentes"
```

---

### Task 7: Action `decide-rental` + query `list-pending-requests`

**Files:**

- Create: `src/modules/spaces/actions/decide-rental.ts`
- Create: `src/modules/spaces/queries/list-pending-requests.ts`

- [ ] **Step 1: Criar `decide-rental.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { decideRentalSchema } from "../schemas";
import { RentalOverlapError } from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

export async function decideRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = decideRentalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "spaces:rental:approve");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { data: rental } = await supabase
    .from("space_rentals")
    .select("id, status")
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!rental) return { ok: false, message: "Solicitação não encontrada" };
  if (rental.status !== "pending") {
    return { ok: false, message: "Esta solicitação já foi decidida" };
  }

  const newStatus = parsed.data.decision === "approve" ? "confirmed" : "rejected";
  const { error } = await supabase
    .from("space_rentals")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    // Defensivo: com pendência travando o slot, conflito aqui não deve ocorrer
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: newStatus === "confirmed" ? "Reserva aprovada" : "Solicitação recusada",
  };
}
```

- [ ] **Step 2: Criar `list-pending-requests.ts`**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PendingRequestBatch, RentalWithRelations } from "../types";
import { attachRenters, type RentalRow } from "./list-rentals";

/**
 * Solicitações pendentes da empresa, agrupadas por request_batch_id,
 * para a tela de aprovação do gestor. Pendências com ends_at no passado
 * são marcadas pela UI como expiradas (estado derivado).
 */
export async function listPendingRequests(companyId: string): Promise<PendingRequestBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_rentals")
    .select("*, spaces(id, name)")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .not("request_batch_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rentals = await attachRenters((data ?? []) as RentalRow[]);

  const byBatch = new Map<string, RentalWithRelations[]>();
  for (const r of rentals) {
    const key = r.request_batch_id as string;
    const list = byBatch.get(key) ?? [];
    list.push(r);
    byBatch.set(key, list);
  }

  return Array.from(byBatch.entries()).map(([batchId, items]) => {
    const first = items[0];
    return {
      batchId,
      requester: first?.renter ?? null,
      space: first?.spaces ?? null,
      notes: first?.notes ?? null,
      createdAt: first?.created_at ?? "",
      items,
    };
  });
}
```

- [ ] **Step 3: Verificar e commitar** — `npm run typecheck && npm test` → OK.

```bash
rtk git add src/modules/spaces/actions/decide-rental.ts src/modules/spaces/queries/list-pending-requests.ts
rtk git commit -m "feat(spaces): decide-rental por item e listagem de solicitacoes pendentes"
```

---

### Task 8: Ocupação com pendências + calendário pinta pendente

**Files:**

- Modify: `src/modules/spaces/queries/get-occupancy.ts:20`
- Modify: `src/modules/spaces/components/space-calendar.tsx:106-118`

- [ ] **Step 1: `get-occupancy.ts`** — trocar `.eq("status", "confirmed")` por:

```ts
    .in("status", ["confirmed", "pending"])
```

E atualizar o comentário JSDoc da função para: `Aluguéis confirmados e solicitações pendentes que tocam o intervalo [from, to) — usado para pintar os calendários...`.

- [ ] **Step 2: `space-calendar.tsx`** — no `<li>` das reservas (linhas ~106-118), diferenciar pendência. Trocar o bloco do map por:

```tsx
{
  dayRentals.slice(0, 3).map((r) => (
    <li
      key={r.id}
      title={`${showSpace && r.spaces ? r.spaces.name + " · " : ""}${r.renter?.full_name ?? ""} · ${formatRentalPeriod(r.booking_kind, r.starts_at, r.ends_at)}${r.status === "pending" ? " · pendente" : ""}`}
      className={cn(
        "truncate rounded px-1 py-0.5 text-[11px]",
        r.status === "pending"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-primary/10 text-primary",
      )}
    >
      {showSpace && r.spaces ? `${r.spaces.name}: ` : ""}
      {r.booking_kind === "hourly" ? format(new Date(r.starts_at), "HH:mm") : "Dia todo"}{" "}
      {r.renter?.full_name ?? ""}
    </li>
  ));
}
```

- [ ] **Step 3: Verificar e commitar** — `npm run typecheck && npm test` → OK.

```bash
rtk git add src/modules/spaces/queries/get-occupancy.ts src/modules/spaces/components/space-calendar.tsx
rtk git commit -m "feat(spaces): calendario exibe solicitacoes pendentes em ambar"
```

---

### Task 9: Diálogo "Solicitar reserva" no calendário

**Files:**

- Create: `src/modules/spaces/components/request-rental-dialog.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/spaces/calendar/page.tsx`
- Modify: `src/modules/spaces/index.ts` (barrel)

- [ ] **Step 1: Criar `request-rental-dialog.tsx`** (seguir os padrões dos dialogs existentes do projeto — shadcn `Dialog`, `useActionState` se os forms do projeto usarem, senão `useTransition` como `member-card`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestRentalAction } from "../actions/request-rental";

type SpaceOption = { id: string; name: string; bookingMode: "daily" | "hourly" | "both" };
type Slot = { startsAt: string; endsAt: string };

type Props = { spaces: SpaceOption[] };

export function RequestRentalDialog({ spaces }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [spaceId, setSpaceId] = useState("");
  const [bookingKind, setBookingKind] = useState<"daily" | "hourly">("hourly");
  const [slots, setSlots] = useState<Slot[]>([{ startsAt: "", endsAt: "" }]);
  const [notes, setNotes] = useState("");

  const inputType = bookingKind === "daily" ? "date" : "datetime-local";
  const selectedSpace = spaces.find((s) => s.id === spaceId);
  const kindOptions =
    selectedSpace?.bookingMode === "both"
      ? (["daily", "hourly"] as const)
      : selectedSpace
        ? ([selectedSpace.bookingMode] as const)
        : (["daily", "hourly"] as const);

  function updateSlot(i: number, field: keyof Slot, value: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function submit() {
    const formData = new FormData();
    formData.set("spaceId", spaceId);
    formData.set("bookingKind", bookingKind);
    formData.set("notes", notes);
    formData.set(
      "slots",
      JSON.stringify(
        slots
          .filter((s) => s.startsAt && s.endsAt)
          .map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
      ),
    );
    startTransition(async () => {
      const result = await requestRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Solicitação enviada");
        setOpen(false);
        setSlots([{ startsAt: "", endsAt: "" }]);
        setNotes("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao enviar solicitação");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Solicitar reserva</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar reserva</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Espaço</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o espaço" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de reserva</Label>
            <Select
              value={bookingKind}
              onValueChange={(v) => setBookingKind(v as "daily" | "hourly")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindOptions.includes("daily") && <SelectItem value="daily">Diária</SelectItem>}
                {kindOptions.includes("hourly") && <SelectItem value="hourly">Por hora</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Datas e horários</Label>
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type={inputType}
                  value={slot.startsAt}
                  onChange={(e) => updateSlot(i, "startsAt", e.target.value)}
                  aria-label={`Início do slot ${i + 1}`}
                />
                <span className="text-muted-foreground">→</span>
                <Input
                  type={inputType}
                  value={slot.endsAt}
                  onChange={(e) => updateSlot(i, "endsAt", e.target.value)}
                  aria-label={`Fim do slot ${i + 1}`}
                />
                {slots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSlots((prev) => [...prev, { startsAt: "", endsAt: "" }])}
            >
              + Adicionar data/horário
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          <Button onClick={submit} disabled={isPending || !spaceId} className="w-full">
            {isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

(Se algum componente shadcn usado não existir em `src/components/ui/`, instalar via comando do README ou substituir pelo equivalente já presente no projeto — conferir os imports usados por `rental-form.tsx`.)

- [ ] **Step 2: Calendar page** — em `spaces/calendar/page.tsx`, buscar os espaços ativos e renderizar o diálogo para quem tem a permissão. Adicionar imports `import { Can } from "@/modules/authz";` e `listSpaces, RequestRentalDialog` de `@/modules/spaces`; após obter `occupancy`:

```ts
const spacesPage = await listSpaces(company.id, { onlyActive: true, page: 1, pageSize: 100 });
```

(Conferir a assinatura real de `listSpaces` em `src/modules/spaces/queries/list-spaces.ts` e adaptar a chamada — o objetivo é a lista de espaços ativos id/name/booking_mode.)

No header, ao lado do botão "Voltar aos espaços":

```tsx
<div className="flex gap-2">
  <Can permission="spaces:rental:request" companyId={company.id}>
    <RequestRentalDialog
      spaces={spacesPage.data.map((s) => ({
        id: s.id,
        name: s.name,
        bookingMode: s.booking_mode,
      }))}
    />
  </Can>
  <Button asChild variant="outline">
    <Link href={basePath}>Voltar aos espaços</Link>
  </Button>
</div>
```

(Conferir a API real do componente `Can` em `src/modules/authz` — se não aceitar `companyId`, seguir o uso existente em `settings/members/page.tsx`.)

- [ ] **Step 3: Barrel** — em `src/modules/spaces/index.ts` acrescentar:

```ts
export { requestRentalAction } from "./actions/request-rental";
export { decideRentalAction } from "./actions/decide-rental";
export { listPendingRequests } from "./queries/list-pending-requests";
export { RequestRentalDialog } from "./components/request-rental-dialog";
export type { PendingRequestBatch } from "./types";
```

- [ ] **Step 4: Verificar e commitar** — `npm run typecheck && npm test` → OK.

```bash
rtk git add src/modules/spaces src/app
rtk git commit -m "feat(spaces): dialogo de solicitacao de reserva no calendario"
```

---

### Task 10: Página de solicitações do gestor

**Files:**

- Create: `src/modules/spaces/components/pending-request-card.tsx`
- Create: `src/app/(dashboard)/[companySlug]/spaces/requests/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/spaces/page.tsx` (link "Solicitações" — conferir o header da página e adicionar botão ao lado dos existentes, dentro de `<Can permission="spaces:rental:approve">`)
- Modify: `src/modules/spaces/index.ts`

- [ ] **Step 1: Criar `pending-request-card.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { decideRentalAction } from "../actions/decide-rental";
import { formatRentalPeriod } from "../services/rental-service";
import type { PendingRequestBatch } from "../types";

type Props = { batch: PendingRequestBatch };

export function PendingRequestCard({ batch }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function decide(rentalId: string, decision: "approve" | "reject") {
    const formData = new FormData();
    formData.set("rentalId", rentalId);
    formData.set("decision", decision);
    startTransition(async () => {
      const result = await decideRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Decisão registrada");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao decidir");
      }
    });
  }

  const now = Date.now();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{batch.requester?.full_name ?? "—"}</span>
          <span className="text-sm text-muted-foreground">solicitou</span>
          <span className="font-medium">{batch.space?.name ?? "—"}</span>
          <Badge variant="secondary">{batch.items.length} horário(s)</Badge>
        </div>
        {batch.notes && <p className="text-sm text-muted-foreground">“{batch.notes}”</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {batch.items.map((item) => {
          const expired = new Date(item.ends_at).getTime() < now;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded border p-2"
            >
              <span className="text-sm">
                {formatRentalPeriod(item.booking_kind, item.starts_at, item.ends_at)}
                {expired && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    expirada
                  </Badge>
                )}
              </span>
              {!expired && (
                <div className="flex gap-1">
                  <Button size="sm" disabled={isPending} onClick={() => decide(item.id, "approve")}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={isPending}
                    onClick={() => decide(item.id, "reject")}
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Criar `spaces/requests/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { listPendingRequests, PendingRequestCard } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Solicitações de Reserva — ERP" };

type Props = { params: Promise<{ companySlug: string }> };

export default async function SpaceRequestsPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:rental:approve");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para aprovar solicitações.
        </div>
      );
    }
    throw e;
  }

  const batches = await listPendingRequests(company.id);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Solicitações de reserva</h1>
          <p className="text-sm text-muted-foreground">
            {batches.length}{" "}
            {batches.length === 1 ? "solicitação pendente" : "solicitações pendentes"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/spaces`}>Voltar aos espaços</Link>
        </Button>
      </header>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
      ) : (
        <div className="space-y-4">
          {batches.map((b) => (
            <PendingRequestCard key={b.batchId} batch={b} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Link na página de espaços** — em `spaces/page.tsx`, no header (junto aos botões existentes — ler o arquivo e seguir o padrão):

```tsx
<Can permission="spaces:rental:approve">
  <Button asChild variant="outline">
    <Link href={`/${companySlug}/spaces/requests`}>Solicitações</Link>
  </Button>
</Can>
```

- [ ] **Step 4: Barrel** — acrescentar `export { PendingRequestCard } from "./components/pending-request-card";`.

- [ ] **Step 5: Verificar visibilidade do Cancelar (spec D5)** — conferir em `rental-table.tsx`/`cancel-rental-button.tsx` que o botão Cancelar aparece quando o usuário tem `spaces:rental:cancel` (gestor). Se estiver gated apenas para o locatário, ajustar para também exibir via `Can permission="spaces:rental:cancel"`. Registrar no commit o que foi encontrado.

- [ ] **Step 6: Verificar e commitar** — `npm run typecheck && npm test && npm run lint` → OK.

```bash
rtk git add src/modules/spaces src/app
rtk git commit -m "feat(spaces): pagina de solicitacoes com aprovacao por item"
```

---

### Task 11: Minhas reservas — editar/retirar a própria solicitação

**Files:**

- Create: `src/modules/spaces/actions/update-request.ts`
- Create: `src/modules/spaces/queries/list-my-rentals.ts`
- Create: `src/modules/spaces/components/edit-request-dialog.tsx`
- Create: `src/modules/spaces/components/my-rentals-list.tsx`
- Create: `src/app/(dashboard)/[companySlug]/spaces/my-rentals/page.tsx`
- Modify: `src/modules/spaces/schemas/index.ts`, `src/modules/spaces/index.ts`
- Modify: `src/app/(dashboard)/[companySlug]/spaces/calendar/page.tsx` (link "Minhas reservas" dentro do `Can permission="spaces:rental:request"` já adicionado na Task 9)

- [ ] **Step 1: Schema** — acrescentar em `schemas/index.ts`:

```ts
export const updateRequestSchema = z.object({
  rentalId: z.string().uuid("Solicitação inválida"),
  startsAt: z.coerce.date({ invalid_type_error: "Data de início inválida" }),
  endsAt: z.coerce.date({ invalid_type_error: "Data de término inválida" }),
  notes: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
});

export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
```

- [ ] **Step 2: Criar `update-request.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { updateRequestSchema } from "../schemas";
import {
  validateRequestSlots,
  RentalSlotError,
  RentalOverlapError,
} from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

/** Solicitante edita a própria solicitação PENDENTE (continua pendente).
 *  A RLS garante: só o dono, só resultado pending/cancelled. */
export async function updateRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  const { data: rental } = await supabase
    .from("space_rentals")
    .select("id, space_id, booking_kind, renter_user_id, status")
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!rental) return { ok: false, message: "Solicitação não encontrada" };
  if (rental.renter_user_id !== user.id) {
    return { ok: false, message: "Você só pode editar as próprias solicitações" };
  }
  if (rental.status !== "pending") {
    return { ok: false, message: "Apenas solicitações pendentes podem ser editadas" };
  }

  // Conflito contra as demais reservas/pendências do espaço (exclui a própria linha)
  const { data: existing, error: exErr } = await supabase
    .from("space_rentals")
    .select("starts_at, ends_at")
    .eq("space_id", rental.space_id)
    .in("status", ["confirmed", "pending"])
    .neq("id", rental.id);
  if (exErr) return { ok: false, message: exErr.message };

  let periods: { startsAt: Date; endsAt: Date }[];
  try {
    periods = validateRequestSlots(
      rental.booking_kind,
      [{ startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt }],
      existing ?? [],
    );
  } catch (e) {
    if (e instanceof RentalSlotError) return { ok: false, message: e.message };
    throw e;
  }
  const period = periods[0];
  if (!period) return { ok: false, message: "Período inválido" };

  const { error } = await supabase
    .from("space_rentals")
    .update({
      starts_at: period.startsAt.toISOString(),
      ends_at: period.endsAt.toISOString(),
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rental.id)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Solicitação atualizada" };
}
```

- [ ] **Step 3: Criar `list-my-rentals.ts`**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RentalWithRelations } from "../types";
import { attachRenters, type RentalRow } from "./list-rentals";

/** Reservas/solicitações do usuário logado na empresa (todas as situações),
 *  mais recentes primeiro — para a tela "Minhas reservas". */
export async function listMyRentals(companyId: string): Promise<RentalWithRelations[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("space_rentals")
    .select("*, spaces(id, name)")
    .eq("company_id", companyId)
    .eq("renter_user_id", user.id)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  return attachRenters((data ?? []) as RentalRow[]);
}
```

- [ ] **Step 4: Criar `edit-request-dialog.tsx`** (mesmos padrões do `request-rental-dialog` da Task 9: Dialog shadcn, `useTransition`, toast, `router.refresh()`)

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRequestAction } from "../actions/update-request";
import type { RentalWithRelations } from "../types";

type Props = { rental: RentalWithRelations };

export function EditRequestDialog({ rental }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDaily = rental.booking_kind === "daily";
  const inputType = isDaily ? "date" : "datetime-local";
  const fmt = isDaily ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
  const [startsAt, setStartsAt] = useState(format(new Date(rental.starts_at), fmt));
  const [endsAt, setEndsAt] = useState(format(new Date(rental.ends_at), fmt));
  const [notes, setNotes] = useState(rental.notes ?? "");

  function submit() {
    const formData = new FormData();
    formData.set("rentalId", rental.id);
    formData.set("startsAt", startsAt);
    formData.set("endsAt", endsAt);
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await updateRequestAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Solicitação atualizada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao atualizar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input
              type={inputType}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type={inputType} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
          <Button onClick={submit} disabled={isPending} className="w-full">
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Criar `my-rentals-list.tsx`** (client; badges de status + Editar/Retirar em pendentes; "Retirar" usa `cancelRentalAction` existente — conferir a assinatura/schema `cancelRentalSchema` que exige `rentalId` e `spaceId`)

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelRentalAction } from "../actions/cancel-rental";
import { formatRentalPeriod } from "../services/rental-service";
import { EditRequestDialog } from "./edit-request-dialog";
import type { RentalWithRelations } from "../types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

type Props = { rentals: RentalWithRelations[] };

export function MyRentalsList({ rentals }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const now = Date.now();

  function withdraw(rental: RentalWithRelations) {
    const formData = new FormData();
    formData.set("rentalId", rental.id);
    formData.set("spaceId", rental.space_id);
    startTransition(async () => {
      const result = await cancelRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success("Solicitação retirada");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao retirar");
      }
    });
  }

  if (rentals.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não tem reservas.</p>;
  }

  return (
    <div className="space-y-2">
      {rentals.map((r) => {
        const expired = r.status === "pending" && new Date(r.ends_at).getTime() < now;
        const editable = r.status === "pending" && !expired;
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.spaces?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {formatRentalPeriod(r.booking_kind, r.starts_at, r.ends_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                {expired ? "Expirada" : (STATUS_LABEL[r.status] ?? r.status)}
              </Badge>
              {editable && (
                <>
                  <EditRequestDialog rental={r} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={isPending}
                    onClick={() => withdraw(r)}
                  >
                    Retirar
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Criar `spaces/my-rentals/page.tsx`** (mesmo esqueleto da página de requests da Task 10: `resolveCompany` + `requirePermission(company.id, "spaces:rental:read")` + header com voltar; corpo `<MyRentalsList rentals={await listMyRentals(company.id)} />`; título "Minhas reservas").

- [ ] **Step 7: Barrel + link** — em `index.ts`: `export { updateRequestAction } from "./actions/update-request"; export { listMyRentals } from "./queries/list-my-rentals"; export { MyRentalsList } from "./components/my-rentals-list"; export { EditRequestDialog } from "./components/edit-request-dialog";`. Na página do calendário, dentro do mesmo `Can permission="spaces:rental:request"`, adicionar `<Button asChild variant="outline"><Link href={`${basePath}/my-rentals`}>Minhas reservas</Link></Button>`.

- [ ] **Step 8: Verificar e commitar** — `npm run typecheck && npm test && npm run lint` → OK.

```bash
rtk git add src/modules/spaces src/app
rtk git commit -m "feat(spaces): minhas reservas com edicao e retirada de solicitacao pendente"
```

---

### Task 12: pgTAP — RLS e travamento de slot

**Files:**

- Create: `supabase/tests/04_spaces_request_cycle.test.sql`

- [ ] **Step 1: Criar com este conteúdo**

```sql
-- ============================================================
-- Spec 2026-06-11 — ciclo de solicitação de aluguel de espaços
-- ============================================================

begin;

select plan(8);

-- SETUP (como postgres)
select tests.create_company('empresa-spaces');

-- habilita o módulo spaces e reroda o bootstrap para ganhar as roles/perms de spaces
insert into public.company_modules (company_id, module_code)
values (tests.company_id('empresa-spaces'), 'spaces');
select public.bootstrap_company_rbac(tests.company_id('empresa-spaces'));

do $$
begin
  create temp table su (k text primary key, user_id uuid);
  insert into su values
    ('sol',    tests.create_user_in('sol@test.local',    'empresa-spaces', 'espacos-solicitante')),
    ('gestor', tests.create_user_in('gestor@test.local', 'empresa-spaces', 'espacos-gestao')),
    ('leitor', tests.create_user_in('leitor@test.local', 'empresa-spaces', 'espacos-leitura'));
  grant select on su to authenticated;
end $$;

insert into public.spaces (id, company_id, name, booking_mode)
values ('eeeeeeee-0000-0000-0000-000000000001', tests.company_id('empresa-spaces'), 'Sala Teste', 'both');

-- TESTE 1: solicitante cria pendência para si
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'sol')); end $$;

select lives_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-10 10:00+00', '2027-01-10 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  'Teste 1: solicitante cria pendência para si mesmo'
);

-- TESTE 2: solicitante NÃO cria pendência para outro usuário
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-11 10:00+00', '2027-01-11 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'leitor')),
  '42501', NULL,
  'Teste 2: solicitante não cria pendência em nome de outro'
);

-- TESTE 3: solicitante NÃO cria reserva direta confirmada
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-12 10:00+00', '2027-01-12 12:00+00', 'confirmed')$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  '42501', NULL,
  'Teste 3: solicitante não cria reserva direta confirmada'
);

-- TESTE 4: pendência TRAVA o slot — segunda solicitação no mesmo horário falha
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-10 11:00+00', '2027-01-10 13:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  '23P01', NULL,
  'Teste 4: pendência trava o slot (exclusion constraint)'
);

-- TESTE 5: solicitante EDITA a própria pendência (novo horário, continua pending)
select lives_ok(
  $q$update public.space_rentals
     set starts_at = '2027-01-10 14:00+00', ends_at = '2027-01-10 16:00+00'
     where renter_user_id = (select user_id from su where k = 'sol')
       and status = 'pending'$q$,
  'Teste 5: solicitante edita data/horário da própria pendência'
);

-- TESTE 6: solicitante NÃO auto-aprova a própria pendência
-- (violação de WITH CHECK em UPDATE lança erro 42501 — diferente do USING)
select throws_ok(
  $q$update public.space_rentals set status = 'confirmed'
     where renter_user_id = (select user_id from su where k = 'sol')
       and status = 'pending'$q$,
  '42501', NULL,
  'Teste 6: solicitante não auto-aprova (with check rejeita)'
);

do $$ begin perform tests.reset_role(); end $$;

-- TESTE 7: gestor com approve confirma a pendência
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'gestor')); end $$;

update public.space_rentals set status = 'confirmed'
where space_id = 'eeeeeeee-0000-0000-0000-000000000001' and status = 'pending';

select is(
  (select count(*)::int from public.space_rentals
   where space_id = 'eeeeeeee-0000-0000-0000-000000000001' and status = 'confirmed'),
  1,
  'Teste 7: gestor aprova a pendência (pending → confirmed)'
);

do $$ begin perform tests.reset_role(); end $$;

-- TESTE 8: espacos-leitura não consegue solicitar
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'leitor')); end $$;

select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-15 10:00+00', '2027-01-15 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'leitor')),
  '42501', NULL,
  'Teste 8: leitura não tem permissão de solicitar'
);

do $$ begin perform tests.reset_role(); end $$;

select * from finish();
rollback;
```

- [ ] **Step 2: Commit** (CI valida — sem stack local)

```bash
rtk git add supabase/tests/04_spaces_request_cycle.test.sql
rtk git commit -m "test(spaces): pgTAP do ciclo de solicitacao (RLS + trava de slot)"
```

---

### Task 13: Verificação final

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test` → tudo verde (esperado ~150+ testes).
- [ ] **Step 2:** `rtk git push` e acompanhar o CI (`gh pr checks 56 --watch`) — o pgTAP novo roda no banco fresco do CI.
- [ ] **Step 3:** Smoke manual (usuário): logado com role `espacos-solicitante` → `/{slug}/spaces/calendar` → "Solicitar reserva" com 2 horários → ver pendências âmbar → "Minhas reservas" → editar o horário de uma pendência e retirar a outra; logado como gestor → `/{slug}/spaces/requests` → aprovar/recusar → calendário e "Minhas reservas" refletem.

---

## Self-review (executado na escrita)

- Spec D1→Tasks 1-3, D2→Tasks 2-3, D3→Task 2 (+fix de auto-aprovação, +edição de pendente pelo dono), D4→Tasks 4-7 e 11, D5→Tasks 8-11, D6→Tasks 4 e 12. Fora de escopo respeitado.
- Sem placeholders; nomes consistentes (`requestRentalAction`/`decideRentalAction`/`updateRequestAction`/`listPendingRequests`/`listMyRentals`/`PendingRequestBatch`/`validateRequestSlots`/`RentalSlotError`).
- Pontos de atenção sinalizados ao executor: assinatura real de `listSpaces`, API do `Can`, componentes shadcn disponíveis — conferir nos arquivos citados antes de usar.
