# Deactivate Product Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear toda a nomenclatura de "delete" para "deactivate" no módulo de inventário, visto que a operação é um soft-delete (is_active = false), não uma exclusão real; e garantir que a funcionalidade está funcionando corretamente com testes cobrindo o comportamento real.

**Architecture:** A action `deleteProductAction` é a única responsável pelo soft-delete via UPDATE `is_active = false`. Ela será renomeada para `deactivateProductAction` junto com seu arquivo, componente de formulário e testes. A migration RLS e o fix do NEXT_REDIRECT já foram aplicados em PRs anteriores (branch `fix/deactivate-product-next-redirect`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Vitest, Supabase

---

## Mapa de arquivos

| Arquivo atual                                                              | Ação                                                                        | Arquivo final                                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/modules/inventory/actions/delete-product.ts`                          | Renomear arquivo + função                                                   | `src/modules/inventory/actions/deactivate-product.ts`                          |
| `src/modules/inventory/index.ts`                                           | Atualizar export                                                            | (mesmo arquivo)                                                                |
| `src/app/(dashboard)/[companySlug]/inventory/[id]/delete-product-form.tsx` | Renomear arquivo + componente                                               | `src/app/(dashboard)/[companySlug]/inventory/[id]/deactivate-product-form.tsx` |
| `src/app/(dashboard)/[companySlug]/inventory/[id]/page.tsx`                | Atualizar imports e variáveis                                               | (mesmo arquivo)                                                                |
| `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`        | Atualizar imports, mocks, describes e adicionar teste de comportamento real | (mesmo arquivo)                                                                |

---

## Task 1: Renomear action `deleteProductAction` → `deactivateProductAction`

**Files:**

- Rename: `src/modules/inventory/actions/delete-product.ts` → `src/modules/inventory/actions/deactivate-product.ts`

- [ ] **Step 1: Criar o novo arquivo `deactivate-product.ts`**

Crie `src/modules/inventory/actions/deactivate-product.ts` com o conteúdo abaixo (a função já foi corrigida em PR anterior — sem `redirect()`, retorna `{ ok: true }`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

export async function deactivateProductAction(
  companySlug: string,
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "inventory:product:delete");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  // Soft delete: apenas inativa o produto (preserva histórico de movimentações)
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Produto desativado com sucesso" };
}
```

- [ ] **Step 2: Deletar o arquivo antigo**

```bash
rm src/modules/inventory/actions/delete-product.ts
```

- [ ] **Step 3: Atualizar o barrel `index.ts`**

Em `src/modules/inventory/index.ts`, troque a linha:

```ts
export { deleteProductAction } from "./actions/delete-product";
```

por:

```ts
export { deactivateProductAction } from "./actions/deactivate-product";
```

- [ ] **Step 4: Verificar que não há mais imports do arquivo antigo**

```bash
grep -r "delete-product\|deleteProductAction" src/ --include="*.ts" --include="*.tsx"
```

Esperado: nenhuma ocorrência (exceto nos arquivos de teste que serão tratados na Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory/actions/deactivate-product.ts \
        src/modules/inventory/actions/delete-product.ts \
        src/modules/inventory/index.ts
git commit -m "refactor(inventory): renomeia deleteProductAction → deactivateProductAction"
```

---

## Task 2: Renomear componente `DeleteProductForm` → `DeactivateProductForm`

**Files:**

- Rename: `src/app/(dashboard)/[companySlug]/inventory/[id]/delete-product-form.tsx` → `src/app/(dashboard)/[companySlug]/inventory/[id]/deactivate-product-form.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/inventory/[id]/page.tsx`

- [ ] **Step 1: Criar `deactivate-product-form.tsx`**

Crie `src/app/(dashboard)/[companySlug]/inventory/[id]/deactivate-product-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
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
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  deactivateAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  isActive: boolean;
  redirectTo: string;
};

export function DeactivateProductForm({ deactivateAction, isActive, redirectTo }: Props) {
  const [state, formAction] = useActionState(deactivateAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Produto desativado com sucesso");
      router.push(redirectTo);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, redirectTo, router]);

  if (!isActive) {
    return <p className="text-sm text-muted-foreground">Este produto já está inativo.</p>;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          Desativar produto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar produto?</AlertDialogTitle>
          <AlertDialogDescription>
            O produto será marcado como inativo. O histórico de movimentações é preservado. Esta
            ação pode ser revertida reativando o produto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => formRef.current?.requestSubmit()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar desativação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <form ref={formRef} action={formAction} className="hidden">
        <SubmitButton />
      </form>
    </AlertDialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Desativando..." : "Desativar produto"}
    </Button>
  );
}
```

- [ ] **Step 2: Deletar o arquivo antigo**

```bash
rm src/app/\(dashboard\)/\[companySlug\]/inventory/\[id\]/delete-product-form.tsx
```

- [ ] **Step 3: Atualizar `page.tsx`**

Em `src/app/(dashboard)/[companySlug]/inventory/[id]/page.tsx`, aplique as seguintes trocas:

Troque os imports:

```ts
// ANTES
import {
  getProduct,
  updateProductAction,
  deleteProductAction,
  listMovements,
} from "@/modules/inventory";
import { DeleteProductForm } from "./delete-product-form";

// DEPOIS
import {
  getProduct,
  updateProductAction,
  deactivateProductAction,
  listMovements,
} from "@/modules/inventory";
import { DeactivateProductForm } from "./deactivate-product-form";
```

Troque a variável de bind:

```ts
// ANTES
const deleteAction = deleteProductAction.bind(null, companySlug, product.id);

// DEPOIS
const deactivateAction = deactivateProductAction.bind(null, companySlug, product.id);
```

Troque o uso do componente na zona de perigo:

```tsx
// ANTES
<DeleteProductForm deleteAction={deleteAction} isActive={product.is_active} redirectTo={`/${companySlug}/inventory`} />

// DEPOIS
<DeactivateProductForm deactivateAction={deactivateAction} isActive={product.is_active} redirectTo={`/${companySlug}/inventory`} />
```

- [ ] **Step 4: Verificar typecheck**

```bash
npm run typecheck
```

Esperado: saída sem erros, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/\[companySlug\]/inventory/\[id\]/deactivate-product-form.tsx \
        src/app/\(dashboard\)/\[companySlug\]/inventory/\[id\]/delete-product-form.tsx \
        src/app/\(dashboard\)/\[companySlug\]/inventory/\[id\]/page.tsx
git commit -m "refactor(inventory): renomeia DeleteProductForm → DeactivateProductForm"
```

---

## Task 3: Atualizar e expandir os testes

**Files:**

- Modify: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`

- [ ] **Step 1: Atualizar imports no arquivo de teste**

Em `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`:

Troque o import:

```ts
// ANTES
import { deleteProductAction } from "../delete-product";

// DEPOIS
import { deactivateProductAction } from "../deactivate-product";
```

Remova o mock de `redirect` que não é mais usado (linha 5):

```ts
// REMOVER esta linha:
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
```

- [ ] **Step 2: Atualizar os describes e chamadas existentes**

Substitua o bloco inteiro `// ─── deleteProductAction ───...` (linhas 184–215):

```ts
// ─── deactivateProductAction ─────────────────────────────────────────────────

describe("deactivateProductAction — controle de permissão", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia operador sem permissão de delete", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("inventory:product:delete"));

    const result = await deactivateProductAction(
      "default-company",
      "prod-id-1",
      { ok: false },
      new FormData(),
    );

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("chama requirePermission com a permissão correta de delete", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    await deactivateProductAction("default-company", "prod-id-1", { ok: false }, new FormData());

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "inventory:product:delete");
  });

  it("chama supabase.update com is_active: false e retorna ok:true em sucesso", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-xyz" } } }) },
      from: vi.fn().mockReturnValue({ update: updateFn }),
    } as never);

    const result = await deactivateProductAction(
      "default-company",
      PRODUCT_UUID,
      { ok: false },
      new FormData(),
    );

    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    expect(result.ok).toBe(true);
    expect((result as { message: string }).message).toMatch(/desativado/i);
  });

  it("retorna ok:false quando o banco retorna erro", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      }),
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-xyz" } } }) },
      from: vi.fn().mockReturnValue({ update: updateFn }),
    } as never);

    const result = await deactivateProductAction(
      "default-company",
      PRODUCT_UUID,
      { ok: false },
      new FormData(),
    );

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toBe("DB error");
  });
});
```

- [ ] **Step 3: Rodar os testes para verificar que passam**

```bash
npm run test -- inventory-actions --reporter=verbose
```

Esperado: todos os testes passando, incluindo os 4 novos casos de `deactivateProductAction`.

- [ ] **Step 4: Rodar typecheck para confirmar sem erros**

```bash
npm run typecheck
```

Esperado: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory/actions/__tests__/inventory-actions.test.ts
git commit -m "test(inventory): atualiza e expande testes para deactivateProductAction"
```

---

## Task 4: Verificação final e lint

- [ ] **Step 1: Confirmar que não há referências órfãs a `deleteProductAction` ou `delete-product`**

```bash
grep -r "deleteProductAction\|delete-product\b" src/ --include="*.ts" --include="*.tsx"
```

Esperado: nenhuma ocorrência.

- [ ] **Step 2: Rodar lint**

```bash
npm run lint
```

Esperado: sem erros (warnings são aceitáveis).

- [ ] **Step 3: Rodar build para verificar que não há erros de compilação**

```bash
npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully` ou equivalente, exit code 0.

- [ ] **Step 4: Commit de fechamento (se houver fixes de lint)**

Se o lint ou build encontrou algo que precisou ser corrigido:

```bash
git add -A
git commit -m "fix(inventory): ajustes de lint pós-refactor deactivate"
```

- [ ] **Step 5: Push e atualizar PR**

```bash
git push
```

O PR #33 (`fix/deactivate-product-next-redirect`) já está aberto. Verificar que todos os commits estão presentes em https://github.com/triade-devs/erp/pull/33.

---

## Contexto: O que já foi corrigido (não fazer novamente)

Os itens abaixo já foram aplicados no PR #33 e **não precisam ser refeitos**:

1. **NEXT_REDIRECT corrigido** — `redirect()` removido da action; navegação feita via `router.push()` no cliente.
2. **RLS corrigida** — Migration `20260430000024_fix_products_update_rls_softdelete.sql` atualiza `products_update` para aceitar `inventory:product:update` **OU** `inventory:product:delete`.
