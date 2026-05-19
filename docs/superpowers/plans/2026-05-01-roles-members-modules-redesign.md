# Redesign: Roles, Membros e Módulos — Fluxo de Gerenciamento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revisar completamente o fluxo de gerenciamento de membros, roles e módulos — melhorando o layout de membros (card grid com ações fluidas), tornando o editor de roles mais claro (abas + matriz de permissões com drag-and-drop), e adicionando funcionalidade de transferência de membros entre empresas no painel admin.

**Architecture:** Três subsistemas independentes que compartilham o módulo `tenancy`: (1) Admin panel — nova action `transfer-member` + redesign da página de membros admin; (2) Company settings — membros como cards com sheet de edição de roles via DnD; (3) Company settings — roles com layout por abas e matriz de permissões dual-list com DnD. Drag-and-drop usa `@dnd-kit`.

**Tech Stack:** Next.js 15 App Router, Server Actions, Supabase, @dnd-kit/core + @dnd-kit/sortable, Shadcn/UI (Sheet, Tabs, Avatar), Tailwind, TypeScript strict.

---

## Mapa de Arquivos

| Ação                | Arquivo                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| Modificar           | `src/app/(dashboard)/[companySlug]/settings/members/page.tsx`                     |
| Criar               | `src/app/(dashboard)/[companySlug]/settings/members/member-card.tsx`              |
| Criar               | `src/app/(dashboard)/[companySlug]/settings/members/member-roles-sheet.tsx`       |
| Remover/simplificar | `src/app/(dashboard)/[companySlug]/settings/members/[memberId]/page.tsx`          |
| Modificar           | `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`              |
| Modificar           | `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/permission-matrix.tsx` |
| Modificar           | `src/app/(dashboard)/admin/companies/[id]/members/page.tsx`                       |
| Criar               | `src/modules/tenancy/actions/transfer-member.ts`                                  |
| Modificar           | `src/modules/tenancy/index.ts`                                                    |
| Modificar           | `src/modules/tenancy/actions/__tests__/transfer-member.test.ts` (novo)            |

---

## Task 1: Instalar Dependências

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Instalar @dnd-kit**

```bash
cd /path/to/project
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected output: `added N packages`

- [ ] **Step 2: Instalar componentes Shadcn faltantes**

```bash
npx shadcn@latest add sheet tabs avatar
```

Quando perguntado sobre sobrescrever, confirme `y`. Isso cria:

- `src/components/ui/sheet.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/avatar.tsx`

- [ ] **Step 3: Verificar build após instalação**

```bash
npm run typecheck
```

Expected: sem erros de tipo relacionados às novas dependências.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/sheet.tsx src/components/ui/tabs.tsx src/components/ui/avatar.tsx
git commit -m "chore: instala @dnd-kit e componentes Shadcn (sheet, tabs, avatar)"
```

---

## Task 2: Action — Transferir Membro Entre Empresas (Admin)

**Files:**

- Create: `src/modules/tenancy/actions/transfer-member.ts`
- Create: `src/modules/tenancy/actions/__tests__/transfer-member.test.ts`
- Modify: `src/modules/tenancy/index.ts`

- [ ] **Step 1: Escrever o teste com falha esperada**

Crie `src/modules/tenancy/actions/__tests__/transfer-member.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { createClient } from "@/lib/supabase/server";
import { transferMemberAction } from "../transfer-member";

// Sequência de produção:
// 1. createClient() → rpc("is_platform_admin")
// 2. createClient() → memberships select (origem)
// 3. createClient() → memberships select (destino - checar duplicata)
// 4. createClient() → memberships insert (destino)
// 5. createClient() → membership_roles insert (copiar roles se keepInSource=false)
// 6. Se !keepInSource: memberships delete (origem)
// 7. audit()
// 8. revalidatePath()

function makeSupabaseMock({
  isPlatformAdmin = true,
  sourceMembership = {
    id: "mem-1",
    user_id: "user-1",
    is_owner: false,
    membership_roles: [] as Array<{ role_id: string }>,
  },
  existingDestMembership = null as { id: string; status: string } | null,
  insertError = null as { message: string } | null,
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null });

  // chain para select membership de origem
  const sourceSingle = vi.fn().mockResolvedValue({ data: sourceMembership, error: null });
  const sourceEq3 = vi.fn().mockReturnValue({ maybeSingle: sourceSingle });
  const sourceEq2 = vi.fn().mockReturnValue({ eq: sourceEq3 });
  const sourceEq1 = vi.fn().mockReturnValue({ eq: sourceEq2 });
  const sourceSelect = vi.fn().mockReturnValue({ eq: sourceEq1 });

  // chain para checar membership existente no destino
  const destSingle = vi.fn().mockResolvedValue({ data: existingDestMembership, error: null });
  const destEq2 = vi.fn().mockReturnValue({ maybeSingle: destSingle });
  const destEq1 = vi.fn().mockReturnValue({ eq: destEq2 });
  const destSelect = vi.fn().mockReturnValue({ eq: destEq1 });

  // insert membership destino
  const insertSingle = vi
    .fn()
    .mockResolvedValue(
      insertError ? { data: null, error: insertError } : { data: { id: "mem-new" }, error: null },
    );
  const insertSelectFn = vi.fn().mockReturnValue({ single: insertSingle });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  // delete origem
  const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq1 });

  // membership_roles insert
  const rolesInsert = vi.fn().mockResolvedValue({ error: null });

  let callCount = 0;
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "memberships") {
      callCount++;
      if (callCount === 1) return { select: sourceSelect };
      if (callCount === 2) return { select: destSelect };
      if (callCount === 3) return { insert: insertFn };
      if (callCount === 4) return { delete: deleteFn };
    }
    if (table === "membership_roles") return { insert: rolesInsert };
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });

  return { rpc, from };
}

describe("transferMemberAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: false } quando usuário não é platform admin", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("negado");
  });

  it("retorna { ok: false } quando membership de origem não é encontrada", async () => {
    const mock = makeSupabaseMock({ sourceMembership: null as never });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("não encontrado");
  });

  it("retorna { ok: false } quando usuário já é membro da empresa destino", async () => {
    const mock = makeSupabaseMock({
      existingDestMembership: { id: "mem-existing", status: "active" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("membro");
  });

  it("retorna { ok: true } e mantém membro na origem quando keepInSource=true", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", true);

    expect(result.ok).toBe(true);
  });

  it("retorna { ok: true } e remove da origem quando keepInSource=false", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/transfer-member.test.ts
```

Expected: `FAIL — cannot find module '../transfer-member'`

- [ ] **Step 3: Implementar a action**

Crie `src/modules/tenancy/actions/transfer-member.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

/**
 * Transfere (ou copia) um membro de uma empresa para outra.
 * Exclusivo para platform admins.
 *
 * @param membershipId  ID da membership de origem
 * @param sourceCompanyId  ID da empresa de origem
 * @param targetCompanyId  ID da empresa destino
 * @param keepInSource  Se true, mantém o membro também na empresa de origem
 */
export async function transferMemberAction(
  membershipId: string,
  sourceCompanyId: string,
  targetCompanyId: string,
  keepInSource: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data: source, error: srcErr } = await supabase
    .from("memberships")
    .select("id, user_id, is_owner, membership_roles(role_id)")
    .eq("id", membershipId)
    .eq("company_id", sourceCompanyId)
    .maybeSingle();

  if (srcErr) return { ok: false, message: srcErr.message };
  if (!source) return { ok: false, message: "Membro não encontrado na empresa de origem" };

  const { data: existing, error: existErr } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("company_id", targetCompanyId)
    .eq("user_id", source.user_id)
    .maybeSingle();

  if (existErr) return { ok: false, message: existErr.message };
  if (existing) return { ok: false, message: "Usuário já é membro da empresa destino" };

  const { data: newMembership, error: insertErr } = await supabase
    .from("memberships")
    .insert({
      company_id: targetCompanyId,
      user_id: source.user_id,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr) return { ok: false, message: insertErr.message };

  if (!keepInSource) {
    const { error: delErr } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId)
      .eq("company_id", sourceCompanyId);

    if (delErr) return { ok: false, message: delErr.message };
  }

  await audit({
    companyId: targetCompanyId,
    action: "member.transfer",
    resourceType: "membership",
    resourceId: newMembership.id,
    status: "success",
    metadata: {
      sourceCompanyId,
      targetCompanyId,
      userId: source.user_id,
      keepInSource,
    },
  });

  revalidatePath(`/admin/companies/${sourceCompanyId}/members`);
  revalidatePath(`/admin/companies/${targetCompanyId}/members`);
  return {
    ok: true,
    message: keepInSource
      ? "Membro copiado para a empresa destino"
      : "Membro transferido com sucesso",
  };
}
```

- [ ] **Step 4: Exportar no barrel**

Em `src/modules/tenancy/index.ts`, adicione após `export { deleteRoleAction }`:

```typescript
export { transferMemberAction } from "./actions/transfer-member";
```

- [ ] **Step 5: Rodar os testes**

```bash
npx vitest run src/modules/tenancy/actions/__tests__/transfer-member.test.ts
```

Expected: todos os 5 testes passando.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/modules/tenancy/actions/transfer-member.ts \
        src/modules/tenancy/actions/__tests__/transfer-member.test.ts \
        src/modules/tenancy/index.ts
git commit -m "feat(admin): action transferir membro entre empresas"
```

---

## Task 3: Admin — Redesign da Página de Membros da Empresa

**Files:**

- Modify: `src/app/(dashboard)/admin/companies/[id]/members/page.tsx`
- Create: `src/app/(dashboard)/admin/companies/[id]/members/transfer-member-dialog.tsx`

**Objetivo:** Transformar a página somente-leitura em uma página com ações: transferir para outra empresa, mudar status, remover.

- [ ] **Step 1: Criar o componente TransferMemberDialog**

Crie `src/app/(dashboard)/admin/companies/[id]/members/transfer-member-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { transferMemberAction } from "@/modules/tenancy";

type Company = { id: string; name: string };

type Props = {
  membershipId: string;
  memberName: string;
  sourceCompanyId: string;
  allCompanies: Company[];
};

export function TransferMemberDialog({
  membershipId,
  memberName,
  sourceCompanyId,
  allCompanies,
}: Props) {
  const [open, setOpen] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [keepInSource, setKeepInSource] = useState(false);
  const [isPending, startTransition] = useTransition();

  const companies = allCompanies.filter((c) => c.id !== sourceCompanyId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCompanyId) return;
    startTransition(async () => {
      const result = await transferMemberAction(
        membershipId,
        sourceCompanyId,
        targetCompanyId,
        keepInSource,
      );
      if (result.ok) {
        toast.success(result.message ?? "Transferência realizada");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Erro na transferência");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Membro: <span className="font-medium text-foreground">{memberName}</span>
          </p>

          <div className="space-y-2">
            <Label>Empresa destino</Label>
            <Select value={targetCompanyId} onValueChange={setTargetCompanyId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="keep-source" className="cursor-pointer">
              Manter na empresa atual
            </Label>
            <Switch
              id="keep-source"
              checked={keepInSource}
              onCheckedChange={setKeepInSource}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !targetCompanyId}>
              {isPending ? "Transferindo..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Atualizar a página de membros admin**

Substitua o conteúdo de `src/app/(dashboard)/admin/companies/[id]/members/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCompanyMembers, listAllCompanies } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransferMemberDialog } from "./transfer-member-dialog";

type Props = {
  params: Promise<{ id: string }>;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "invited") return "secondary";
  return "destructive";
}

function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "invited") return "Convidado";
  if (status === "suspended") return "Suspenso";
  return status;
}

export default async function CompanyMembersPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [members, allCompanies] = await Promise.all([
    listCompanyMembers(id),
    listAllCompanies(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Membros</h2>
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "membro" : "membros"} nesta empresa
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Entrou em</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.membershipId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.fullName}</span>
                    {member.isOwner && (
                      <Badge variant="outline" className="text-xs">
                        owner
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(member.status)}>{statusLabel(member.status)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.roles.map((role) => (
                      <Badge key={role.id} variant="secondary" className="text-xs">
                        {role.name}
                      </Badge>
                    ))}
                    {member.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell>
                  {!member.isOwner && (
                    <TransferMemberDialog
                      membershipId={member.membershipId}
                      memberName={member.fullName}
                      sourceCompanyId={id}
                      allCompanies={allCompanies.map((c) => ({ id: c.id, name: c.name }))}
                    />
                  )}
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

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/companies/\[id\]/members/
git commit -m "feat(admin): transferência de membro entre empresas na página admin"
```

---

## Task 4: Settings Membros — Redesign para Card Grid

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/members/page.tsx`

**Objetivo:** Trocar a tabela atual por um grid de cards. Cada card tem avatar, nome, status, roles e ações rápidas (via componentes criados na Task 5 e 6).

- [ ] **Step 1: Atualizar a página de membros**

Substitua o conteúdo de `src/app/(dashboard)/[companySlug]/settings/members/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { resolveCompany, listCompanyMembers, listCompanyRoles } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberCard } from "./member-card";

export const metadata = { title: "Membros — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function SettingsMembersPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const [members, roles] = await Promise.all([
    listCompanyMembers(company.id),
    listCompanyRoles(company.id),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membros</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "membro" : "membros"} nesta empresa
          </p>
        </div>
        <Can permission="core:member:invite">
          <InviteMemberDialog companyId={company.id} roles={roles} />
        </Can>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard
              key={member.membershipId}
              member={member}
              companyId={company.id}
              availableRoles={roles}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck (vai falhar até Task 5 criar MemberCard)**

```bash
npm run typecheck 2>&1 | grep "member-card" | head -5
```

Expected: erro sobre `MemberCard` não encontrado — isso é esperado, continua para Task 5.

---

## Task 5: Componente MemberCard

**Files:**

- Create: `src/app/(dashboard)/[companySlug]/settings/members/member-card.tsx`

**Objetivo:** Card de membro com avatar gerado por iniciais, status, roles em badges, e botões de ação fluidos (sem navegar para outra página).

- [ ] **Step 1: Criar o componente**

Crie `src/app/(dashboard)/[companySlug]/settings/members/member-card.tsx`:

```typescript
"use client";

import { useTransition, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { updateMemberStatusAction } from "@/modules/tenancy/client";
import type { CompanyMember, CompanyRole } from "@/modules/tenancy";
import { MemberRolesSheet } from "./member-roles-sheet";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "invited") return "secondary";
  return "destructive";
}

function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "invited") return "Convidado";
  if (status === "suspended") return "Suspenso";
  return status;
}

type Props = {
  member: CompanyMember;
  companyId: string;
  availableRoles: CompanyRole[];
};

export function MemberCard({ member, companyId, availableRoles }: Props) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(member.status);

  function handleStatusChange(newStatus: "active" | "suspended" | "removed") {
    startTransition(async () => {
      const result = await updateMemberStatusAction(companyId, member.membershipId, newStatus);
      if (result.ok) {
        if (newStatus === "removed") {
          toast.success("Membro removido");
        } else {
          setCurrentStatus(newStatus);
          toast.success(result.message ?? "Status atualizado");
        }
      } else {
        toast.error(result.message ?? "Erro ao atualizar status");
      }
    });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {getInitials(member.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate">{member.fullName}</p>
            {member.isOwner && (
              <Badge variant="outline" className="text-xs shrink-0">owner</Badge>
            )}
          </div>
          <Badge variant={statusVariant(currentStatus)} className="text-xs mt-0.5">
            {statusLabel(currentStatus)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-xs text-muted-foreground mb-1.5">Roles</p>
        {member.roles.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sem roles atribuídas</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.roles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
              </Badge>
            ))}
          </div>
        )}
        {member.joinedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Entrou em {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardContent>

      {!member.isOwner && (
        <CardFooter className="flex flex-wrap gap-1 pt-0 border-t">
          <MemberRolesSheet
            companyId={companyId}
            membershipId={member.membershipId}
            memberName={member.fullName}
            availableRoles={availableRoles}
            currentRoleIds={member.roles.map((r) => r.id)}
          />

          {currentStatus === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs"
              disabled={isPending}
              onClick={() => handleStatusChange("suspended")}
            >
              Suspender
            </Button>
          )}
          {currentStatus === "suspended" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={isPending}
              onClick={() => handleStatusChange("active")}
            >
              Reativar
            </Button>
          )}
          {(currentStatus === "invited" || currentStatus === "suspended") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs"
              disabled={isPending}
              onClick={() => handleStatusChange("removed")}
            >
              Remover
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck parcial**

```bash
npm run typecheck 2>&1 | grep -E "member-card|member-roles-sheet" | head -5
```

Expected: erro sobre `MemberRolesSheet` não encontrado — continua para Task 6.

---

## Task 6: Componente MemberRolesSheet — Dual List com DnD

**Files:**

- Create: `src/app/(dashboard)/[companySlug]/settings/members/member-roles-sheet.tsx`

**Objetivo:** Sheet lateral com dois painéis — "Roles disponíveis" e "Roles atribuídas" — onde o usuário pode arrastar badges de um lado para o outro usando @dnd-kit/sortable.

- [ ] **Step 1: Criar o componente**

Crie `src/app/(dashboard)/[companySlug]/settings/members/member-roles-sheet.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateMemberRolesAction } from "@/modules/tenancy/client";
import type { CompanyRole } from "@/modules/tenancy";

type Props = {
  companyId: string;
  membershipId: string;
  memberName: string;
  availableRoles: CompanyRole[];
  currentRoleIds: string[];
};

type RoleDragItem = CompanyRole & { zone: "available" | "assigned" };

function DroppableZone({
  id,
  label,
  roles,
  activeId,
}: {
  id: string;
  label: string;
  roles: RoleDragItem[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-md border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => (
          <Badge
            key={role.id}
            variant={role.zone === "assigned" ? "default" : "secondary"}
            className={`cursor-grab select-none text-xs ${activeId === role.id ? "opacity-50" : ""}`}
            draggable
          >
            {role.name}
          </Badge>
        ))}
        {roles.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            {id === "assigned" ? "Nenhuma role atribuída" : "Todas atribuídas"}
          </p>
        )}
      </div>
    </div>
  );
}

export function MemberRolesSheet({
  companyId,
  membershipId,
  memberName,
  availableRoles,
  currentRoleIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState<string[]>(currentRoleIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const assignedRoles: RoleDragItem[] = availableRoles
    .filter((r) => assigned.includes(r.id))
    .map((r) => ({ ...r, zone: "assigned" as const }));

  const availRoles: RoleDragItem[] = availableRoles
    .filter((r) => !assigned.includes(r.id))
    .map((r) => ({ ...r, zone: "available" as const }));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const roleId = String(active.id);
    const targetZone = String(over.id) as "available" | "assigned";

    if (targetZone === "assigned" && !assigned.includes(roleId)) {
      setAssigned((prev) => [...prev, roleId]);
    } else if (targetZone === "available" && assigned.includes(roleId)) {
      setAssigned((prev) => prev.filter((id) => id !== roleId));
    }
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateMemberRolesAction(companyId, membershipId, assigned);
      if (result.ok) {
        toast.success(result.message ?? "Roles atualizadas");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Erro ao salvar roles");
      }
    });
  }

  const activeRole = availableRoles.find((r) => r.id === activeId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          Editar roles
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Roles de {memberName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Arraste as roles entre os painéis para atribuir ou remover.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3">
              <DroppableZone
                id="assigned"
                label="Roles atribuídas"
                roles={assignedRoles}
                activeId={activeId}
              />
              <DroppableZone
                id="available"
                label="Roles disponíveis"
                roles={availRoles}
                activeId={activeId}
              />
            </div>

            <DragOverlay>
              {activeRole && (
                <Badge className="cursor-grabbing shadow-lg">{activeRole.name}</Badge>
              )}
            </DragOverlay>
          </DndContext>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar roles"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck completo do fluxo de membros**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/\[companySlug\]/settings/members/
git commit -m "feat(members): redesign para card grid com sheet de roles via drag-and-drop"
```

---

## Task 7: Roles — Redesign com Abas Info | Permissões

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`

**Objetivo:** Substituir o layout linear (formulário + matriz embaixo) por abas (Tabs): aba "Informações" com o formulário de edição, e aba "Permissões" com a matriz.

- [ ] **Step 1: Atualizar a página de edição de role**

Substitua o conteúdo de `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  resolveCompany,
  updateRoleAction,
  listRolePermissionMatrix,
  updateRolePermissionsAction,
} from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleForm } from "../role-form";
import { PermissionMatrix } from "./permission-matrix";

export const metadata = { title: "Editar Role — ERP" };

type Props = {
  params: Promise<{ companySlug: string; roleId: string }>;
};

export default async function EditRolePage({ params }: Props) {
  const { companySlug, roleId } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "core:role:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect(`/${companySlug}/settings/roles`);
    throw e;
  }

  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system")
    .eq("id", roleId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) throw error;
  if (!role) notFound();

  const backHref = `/${companySlug}/settings/roles`;
  const matrix = await listRolePermissionMatrix(company.id, role.id);
  const permAction = updateRolePermissionsAction.bind(null, company.id, role.id);

  return (
    <section className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>← Roles</Link>
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{role.name}</h2>
          {role.is_system ? (
            <Badge variant="secondary">Sistema</Badge>
          ) : (
            <Badge variant="outline">Custom</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={role.is_system ? "permissions" : "info"}>
        <TabsList>
          {!role.is_system && <TabsTrigger value="info">Informações</TabsTrigger>}
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        {!role.is_system && (
          <TabsContent value="info" className="mt-4">
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Código</p>
                <p className="font-mono text-sm">{role.code}</p>
              </div>
              <RoleForm
                action={updateRoleAction.bind(null, company.id, role.id)}
                backHref={backHref}
                submitLabel="Salvar alterações"
                defaultValues={{
                  name: role.name,
                  description: role.description ?? undefined,
                }}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="permissions" className="mt-4">
          {role.is_system && (
            <p className="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Role de sistema — permissões são gerenciadas automaticamente ao habilitar módulos.
            </p>
          )}
          <PermissionMatrix
            matrix={matrix}
            roleId={role.id}
            companyId={company.id}
            isSystem={role.is_system}
            action={permAction}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/\[companySlug\]/settings/roles/\[roleId\]/page.tsx
git commit -m "feat(roles): redesign com abas Info | Permissões"
```

---

## Task 8: Permissões — Dual List com Drag-and-Drop

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/permission-matrix.tsx`

**Objetivo:** Substituir a lista de checkboxes por uma interface dual-list: dois painéis ("Não concedido" | "Concedido") onde o usuário pode arrastar permissões entre os lados por módulo.

- [ ] **Step 1: Substituir o componente PermissionMatrix**

Substitua o conteúdo de `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/permission-matrix.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/errors";
import type { ModulePermissions, PermissionRow } from "@/modules/tenancy";

type Props = {
  matrix: ModulePermissions[];
  roleId: string;
  companyId: string;
  isSystem: boolean;
  action: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    read: "Visualizar",
    create: "Criar",
    update: "Editar",
    delete: "Excluir",
    export: "Exportar",
    approve: "Aprovar",
    cancel: "Cancelar",
  };
  return map[action] ?? action;
}

function PermDropZone({
  id,
  label,
  permissions,
  activeId,
  isSystem,
}: {
  id: string;
  label: string;
  permissions: PermissionRow[];
  activeId: string | null;
  isSystem: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[80px] rounded-md border-2 border-dashed p-2 transition-colors ${
        isOver && !isSystem ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {permissions.map((perm) => (
          <Badge
            key={perm.code}
            variant={id === "granted" ? "default" : "outline"}
            className={`text-xs ${isSystem ? "cursor-default" : "cursor-grab"} select-none ${
              activeId === perm.code ? "opacity-50" : ""
            }`}
            title={perm.description ?? perm.resource}
          >
            {actionLabel(perm.action)}
          </Badge>
        ))}
        {permissions.length === 0 && (
          <span className="text-[10px] italic text-muted-foreground">
            {id === "granted" ? "Nenhuma concedida" : "Todas concedidas"}
          </span>
        )}
      </div>
    </div>
  );
}

type ModuleState = {
  moduleCode: string;
  moduleName: string;
  granted: Set<string>;
};

export function PermissionMatrix({ matrix, isSystem, action }: Props) {
  const initialState: ActionResult = { ok: false };

  const [moduleStates, setModuleStates] = useState<ModuleState[]>(() =>
    matrix.map((mod) => ({
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      granted: new Set(mod.permissions.filter((p) => p.granted).map((p) => p.code)),
    })),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const permCode = String(event.active.id);
    setActiveId(permCode);
    // Determina qual módulo contém essa permissão
    for (const mod of matrix) {
      if (mod.permissions.some((p) => p.code === permCode)) {
        setActiveModuleCode(mod.moduleCode);
        break;
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !activeModuleCode) return;

    const permCode = String(active.id);
    const targetZone = String(over.id); // "granted-{moduleCode}" ou "available-{moduleCode}"

    setModuleStates((prev) =>
      prev.map((ms) => {
        if (ms.moduleCode !== activeModuleCode) return ms;
        const newGranted = new Set(ms.granted);
        if (targetZone === `granted-${ms.moduleCode}`) {
          newGranted.add(permCode);
        } else if (targetZone === `available-${ms.moduleCode}`) {
          newGranted.delete(permCode);
        }
        return { ...ms, granted: newGranted };
      }),
    );
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null);
    setActiveModuleCode(null);
  }

  function handleSave() {
    setStatusMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      for (const ms of moduleStates) {
        for (const code of ms.granted) {
          formData.append("permission_code", code);
        }
      }
      const result = await action(initialState, formData);
      setStatusMsg({ ok: result.ok, text: result.message ?? (result.ok ? "Salvo" : "Erro") });
    });
  }

  if (matrix.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Nenhum módulo habilitado nesta empresa.
      </p>
    );
  }

  const activePermission = matrix
    .flatMap((m) => m.permissions)
    .find((p) => p.code === activeId);

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {matrix.map((mod) => {
          const ms = moduleStates.find((s) => s.moduleCode === mod.moduleCode);
          if (!ms) return null;

          const grantedPerms = mod.permissions.filter((p) => ms.granted.has(p.code));
          const availPerms = mod.permissions.filter((p) => !ms.granted.has(p.code));

          return (
            <div key={mod.moduleCode} className="rounded-md border p-3 space-y-2">
              <h3 className="text-sm font-semibold">{mod.moduleName}</h3>
              <div className="flex gap-2">
                <PermDropZone
                  id={`granted-${mod.moduleCode}`}
                  label="Concedido"
                  permissions={grantedPerms}
                  activeId={activeId}
                  isSystem={isSystem}
                />
                <PermDropZone
                  id={`available-${mod.moduleCode}`}
                  label="Não concedido"
                  permissions={availPerms}
                  activeId={activeId}
                  isSystem={isSystem}
                />
              </div>
            </div>
          );
        })}

        <DragOverlay>
          {activePermission && (
            <Badge className="cursor-grabbing shadow-lg text-xs">
              {actionLabel(activePermission.action)}
            </Badge>
          )}
        </DragOverlay>
      </DndContext>

      {statusMsg && (
        <p className={`text-sm ${statusMsg.ok ? "text-green-700" : "text-destructive"}`}>
          {statusMsg.text}
        </p>
      )}

      {!isSystem && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar permissões"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck final**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Build de produção para validar**

```bash
npm run build
```

Expected: Build succeeded sem erros.

- [ ] **Step 4: Commit final**

```bash
git add src/app/\(dashboard\)/\[companySlug\]/settings/roles/\[roleId\]/permission-matrix.tsx
git commit -m "feat(roles): matriz de permissões com drag-and-drop dual-list"
```

---

## Checklist de Revisão Final

Antes de PR:

- [ ] `npm run typecheck` — sem erros
- [ ] `npm run lint` — sem warnings
- [ ] `npm run build` — build completo sem erros
- [ ] `npx vitest run src/modules/tenancy/actions/__tests__/` — todos os testes passando
- [ ] Verificar manualmente: convidar membro → card aparece → drag role → salva
- [ ] Verificar manualmente: criar role → editar na aba info → mover permissão → salvar
- [ ] Verificar manualmente (admin): transferir membro entre empresas funciona
- [ ] Verificar que roles de sistema (`is_system=true`) continuam não editáveis (DnD desabilitado)
