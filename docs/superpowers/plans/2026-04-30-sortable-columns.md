# Sortable Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ordenação server-side por coluna nas tabelas de produtos e movimentações, com estado na URL e componente `SortableHeader` reutilizável.

**Architecture:** Sort state vive na URL como `?sortBy=name&sortDir=asc`. Schemas Zod validam os valores (enum allowlist), queries aplicam `.order()` dinâmico, e um componente `SortableHeader` genérico gera `<Link>`s que preservam os outros params. Ao trocar coluna, `page` reseta para 1.

**Tech Stack:** Next.js 15 App Router, Supabase JS client, Zod, Tailwind, lucide-react, shadcn/ui TableHead.

---

## File Map

| Ação       | Arquivo                                                          | Responsabilidade                                      |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **Create** | `src/components/ui/sortable-header.tsx`                          | Componente genérico de header ordenável               |
| **Modify** | `src/modules/inventory/schemas/index.ts`                         | Adicionar `sortBy` + `sortDir` aos dois schemas       |
| **Modify** | `src/modules/inventory/queries/list-products.ts`                 | `.order()` dinâmico para produtos                     |
| **Modify** | `src/modules/inventory/queries/list-movements.ts`                | `.order()` dinâmico para movimentações                |
| **Modify** | `src/modules/inventory/components/product-table.tsx`             | Props de sort + usar `SortableHeader`                 |
| **Modify** | `src/modules/inventory/components/movement-table.tsx`            | Props de sort + usar `SortableHeader`                 |
| **Modify** | `src/app/(dashboard)/[companySlug]/inventory/page.tsx`           | Extrair sort de searchParams, passar ao ProductTable  |
| **Modify** | `src/app/(dashboard)/[companySlug]/inventory/movements/page.tsx` | Extrair sort de searchParams, passar ao MovementTable |

---

## Task 1: Componente `SortableHeader`

**Files:**

- Create: `src/components/ui/sortable-header.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

type SortDir = "asc" | "desc";

type Props = {
  column: string;
  label: string;
  currentSort: string;
  currentDir: SortDir;
  buildHref: (col: string, dir: SortDir) => string;
  /** Direção padrão ao ativar a coluna pela primeira vez. Default: "asc" */
  defaultDir?: SortDir;
  /** Alinhamento do conteúdo do header. Default: "left" */
  align?: "left" | "right";
};

export function SortableHeader({
  column,
  label,
  currentSort,
  currentDir,
  buildHref,
  defaultDir = "asc",
  align = "left",
}: Props) {
  const isActive = column === currentSort;
  const nextDir: SortDir = isActive ? (currentDir === "asc" ? "desc" : "asc") : defaultDir;

  const Icon = isActive ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className="p-0">
      <Link
        href={buildHref(column, nextDir)}
        className={cn(
          "flex h-full w-full items-center gap-1 px-4 py-3 hover:text-foreground",
          align === "right" && "justify-end",
        )}
      >
        {label}
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-foreground" : "text-muted-foreground/50",
          )}
        />
      </Link>
    </TableHead>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd /Users/yvillanova/Documents/Claude/Projects/ERP && npm run typecheck 2>&1 | tail -20
```

Esperado: sem erros em `sortable-header.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sortable-header.tsx
git commit -m "feat(ux): add SortableHeader reusable component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Schemas — adicionar `sortBy` e `sortDir`

**Files:**

- Modify: `src/modules/inventory/schemas/index.ts`

- [ ] **Step 1: Atualizar `listProductsSchema` e `listMovementsSchema`**

Substituir o conteúdo atual dos dois schemas (manter `productSchema` e `movementSchema` intactos):

```ts
export const listProductsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(9999).default(20),
  onlyActive: z.coerce.boolean().default(true),
  sortBy: z.enum(["name", "sku", "stock", "cost_price", "sale_price"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const listMovementsSchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["created_at", "quantity", "movement_type"]).default("created_at"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
```

Adicionar também os novos tipos inferidos no final do arquivo:

```ts
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type ListMovementsInput = z.infer<typeof listMovementsSchema>;
// (esses já existem — apenas confirmar que continuam exportados)
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run typecheck 2>&1 | tail -20
```

Esperado: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/modules/inventory/schemas/index.ts
git commit -m "feat(ux): add sortBy/sortDir to list schemas

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Queries — `.order()` dinâmico

**Files:**

- Modify: `src/modules/inventory/queries/list-products.ts`
- Modify: `src/modules/inventory/queries/list-movements.ts`

- [ ] **Step 1: Atualizar `list-products.ts`**

Substituir o arquivo completo:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listProductsSchema } from "../schemas";
import type { PaginatedResult, Product } from "../types";

export async function listProducts(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<Product>> {
  const { q, page, pageSize, onlyActive, sortBy, sortDir } = listProductsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (onlyActive) query = query.eq("is_active", true);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

- [ ] **Step 2: Atualizar `list-movements.ts`**

Substituir o arquivo completo:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listMovementsSchema } from "../schemas";
import type { MovementWithProduct, PaginatedResult } from "../types";

export async function listMovements(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<MovementWithProduct>> {
  const { productId, page, pageSize, sortBy, sortDir } = listMovementsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("stock_movements")
    .select("*, products(name, sku)", { count: "exact" })
    .eq("company_id", companyId)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (productId) query = query.eq("product_id", productId);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: (data ?? []) as MovementWithProduct[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npm run typecheck 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inventory/queries/list-products.ts src/modules/inventory/queries/list-movements.ts
git commit -m "feat(ux): dynamic order in list-products and list-movements queries

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: `ProductTable` — headers ordenáveis + página de inventário

**Files:**

- Modify: `src/modules/inventory/components/product-table.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/inventory/page.tsx`

- [ ] **Step 1: Atualizar `ProductTable`**

Substituir o arquivo completo:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatCurrency } from "@/lib/utils";
import { reactivateProductAction } from "../actions/reactivate-product";
import { ReactivateProductButton } from "./reactivate-product-button";
import type { PaginatedResult, Product } from "../types";

type SortDir = "asc" | "desc";

type Props = Pick<
  PaginatedResult<Product>,
  "data" | "page" | "pageSize" | "total" | "totalPages"
> & {
  basePath: string;
  searchQuery?: string;
  createHref?: string;
  showInactive?: boolean;
  sortBy: string;
  sortDir: SortDir;
};

export function ProductTable({
  data,
  page,
  totalPages,
  total,
  basePath,
  searchQuery,
  createHref,
  showInactive,
  sortBy,
  sortDir,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery
            ? `Nenhum produto encontrado para "${searchQuery}".`
            : "Nenhum produto cadastrado ainda."}
        </p>
        {!searchQuery && createHref && (
          <Button asChild className="mt-4" size="sm">
            <Link href={createHref}>+ Cadastrar produto</Link>
          </Button>
        )}
      </div>
    );
  }

  const buildSortHref = (col: string, dir: SortDir) => {
    const params = new URLSearchParams();
    params.set("sortBy", col);
    params.set("sortDir", dir);
    params.set("page", "1");
    if (searchQuery) params.set("q", searchQuery);
    if (showInactive) params.set("inactive", "true");
    return `${basePath}?${params.toString()}`;
  };

  const sortProps = { currentSort: sortBy, currentDir: sortDir, buildHref: buildSortHref };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="sku" label="SKU" {...sortProps} />
              <SortableHeader column="name" label="Produto" {...sortProps} />
              <TableHead>Unidade</TableHead>
              <SortableHeader column="stock" label="Estoque" {...sortProps} align="right" />
              <SortableHeader column="cost_price" label="Custo" {...sortProps} align="right" />
              <SortableHeader column="sale_price" label="Venda" {...sortProps} align="right" />
              <TableHead>Status</TableHead>
              {showInactive && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                basePath={basePath}
                showActions={showInactive}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background/95 px-1 py-3 text-sm text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span>
          {total} produto{total !== 1 ? "s" : ""}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            params.set("sortBy", sortBy);
            params.set("sortDir", sortDir);
            if (searchQuery) params.set("q", searchQuery);
            if (showInactive) params.set("inactive", "true");
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}

function ProductRow({
  product,
  basePath,
  showActions,
}: {
  product: Product;
  basePath: string;
  showActions?: boolean;
}) {
  const isLowStock = Number(product.stock) <= Number(product.min_stock);

  return (
    <TableRow className={!product.is_active ? "opacity-60" : undefined}>
      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
      <TableCell>
        <Link href={`${basePath}/${product.id}`} className="font-medium hover:underline">
          {product.name}
        </Link>
        {product.description && (
          <p className="truncate text-xs text-muted-foreground" title={product.description}>
            {product.description.slice(0, 60)}
            {product.description.length > 60 ? "..." : ""}
          </p>
        )}
      </TableCell>
      <TableCell>{product.unit}</TableCell>
      <TableCell className="text-right">
        <span className={isLowStock && product.is_active ? "font-semibold text-red-600" : ""}>
          {Number(product.stock).toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.cost_price))}</TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.sale_price))}</TableCell>
      <TableCell>
        {!product.is_active ? (
          <Badge variant="outline">Inativo</Badge>
        ) : isLowStock ? (
          <Badge variant="destructive">Estoque baixo</Badge>
        ) : (
          <Badge variant="secondary">Ativo</Badge>
        )}
      </TableCell>
      {showActions && (
        <TableCell>
          {!product.is_active && (
            <ReactivateProductButton
              productId={product.id}
              onReactivate={reactivateProductAction}
            />
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
```

- [ ] **Step 2: Atualizar `inventory/page.tsx` para passar sort props**

Substituir o arquivo completo:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProducts } from "@/modules/inventory";
import { ProductTable } from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";

export const metadata = { title: "Estoque — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function InventoryPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const rawParams = await searchParams;
  const showInactive = rawParams.inactive === "true";
  const queryParams = { ...rawParams, onlyActive: !showInactive };
  const { data, total, page, pageSize, totalPages } = await listProducts(company.id, queryParams);

  const sortBy = rawParams.sortBy ?? "name";
  const sortDir: "asc" | "desc" = rawParams.sortDir === "desc" ? "desc" : "asc";

  const basePath = `/${companySlug}/inventory`;
  const toggleHref = showInactive ? basePath : `${basePath}?inactive=true`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estoque — {company.name}</h1>
          <p className="text-sm text-muted-foreground">{total} produtos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Can permission="movements:movement:read">
            <Button asChild variant="outline">
              <Link href={`/${companySlug}/inventory/movements`}>Movimentações</Link>
            </Button>
          </Can>
          <Can permission="inventory:product:create">
            <Button asChild>
              <Link href={`/${companySlug}/inventory/new`}>+ Novo produto</Link>
            </Button>
          </Can>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2">
          {showInactive && <input type="hidden" name="inactive" value="true" />}
          <Input
            name="q"
            defaultValue={rawParams.q ?? ""}
            placeholder="Buscar por nome ou SKU..."
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
        <Button asChild variant={showInactive ? "default" : "outline"} size="sm">
          <Link href={toggleHref}>{showInactive ? "Ocultar inativos" : "Mostrar inativos"}</Link>
        </Button>
      </div>

      <ProductTable
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        basePath={basePath}
        searchQuery={rawParams.q}
        createHref={`/${companySlug}/inventory/new`}
        showInactive={showInactive}
        sortBy={sortBy}
        sortDir={sortDir}
      />
    </section>
  );
}
```

- [ ] **Step 3: Verificar tipos e lint**

```bash
npm run typecheck 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inventory/components/product-table.tsx \
        src/app/(dashboard)/[companySlug]/inventory/page.tsx
git commit -m "feat(ux): sortable columns in ProductTable

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: `MovementTable` — headers ordenáveis + página de movimentações

**Files:**

- Modify: `src/modules/inventory/components/movement-table.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/inventory/movements/page.tsx`

- [ ] **Step 1: Atualizar `MovementTable`**

Substituir o arquivo completo:

```tsx
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MovementWithProduct, PaginatedResult } from "../types";

type SortDir = "asc" | "desc";

type Props = Pick<
  PaginatedResult<MovementWithProduct>,
  "data" | "page" | "total" | "totalPages"
> & {
  basePath?: string;
  productId?: string;
  sortBy: string;
  sortDir: SortDir;
};

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
};

const MOVEMENT_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  in: "default",
  out: "destructive",
  adjustment: "secondary",
};

export function MovementTable({
  data,
  page,
  totalPages,
  total,
  basePath = "",
  productId,
  sortBy,
  sortDir,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhuma movimentação encontrada.
      </div>
    );
  }

  const buildSortHref = (col: string, dir: SortDir) => {
    const params = new URLSearchParams();
    params.set("sortBy", col);
    params.set("sortDir", dir);
    params.set("page", "1");
    if (productId) params.set("productId", productId);
    return `${basePath}?${params.toString()}`;
  };

  const sortProps = { currentSort: sortBy, currentDir: sortDir, buildHref: buildSortHref };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="created_at" label="Data" defaultDir="desc" {...sortProps} />
              {!productId && <TableHead>Produto</TableHead>}
              <SortableHeader column="movement_type" label="Tipo" {...sortProps} />
              <SortableHeader column="quantity" label="Quantidade" {...sortProps} align="right" />
              <TableHead className="text-right">Custo unit.</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="text-sm">{formatDate(movement.created_at)}</TableCell>
                {!productId && (
                  <TableCell>
                    <div className="font-medium">{movement.products?.name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {movement.products?.sku}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={MOVEMENT_VARIANTS[movement.movement_type] ?? "secondary"}>
                    {MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(movement.quantity).toFixed(3)}
                </TableCell>
                <TableCell className="text-right">
                  {movement.unit_cost != null ? formatCurrency(Number(movement.unit_cost)) : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {movement.reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background/95 px-1 py-3 text-sm text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span>
          {total} movimentaç{total !== 1 ? "ões" : "ão"}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            params.set("sortBy", sortBy);
            params.set("sortDir", sortDir);
            if (productId) params.set("productId", productId);
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `movements/page.tsx` para passar sort props**

Substituir o arquivo completo:

```tsx
import { listMovements, listProducts } from "@/modules/inventory";
import { MovementForm } from "@/modules/inventory";
import { MovementTable } from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";

export const metadata = { title: "Movimentações — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function MovementsPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const rawParams = await searchParams;

  const sortBy = rawParams.sortBy ?? "created_at";
  const sortDir: "asc" | "desc" = rawParams.sortDir === "asc" ? "asc" : "desc";

  const [movements, products] = await Promise.all([
    listMovements(company.id, rawParams),
    listProducts(company.id, { onlyActive: true, pageSize: 100 }),
  ]);

  const productOptions = products.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: Number(p.stock),
  }));

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Movimentações de Estoque — {company.name}</h1>
        <p className="text-sm text-muted-foreground">Registre entradas, saídas e ajustes</p>
      </header>

      <Can permission="movements:movement:create">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Nova movimentação</h2>
          {productOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre pelo menos um produto ativo para registrar movimentações.
            </p>
          ) : (
            <MovementForm products={productOptions} />
          )}
        </div>
      </Can>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Histórico</h2>
        <MovementTable
          data={movements.data}
          total={movements.total}
          page={movements.page}
          totalPages={movements.totalPages}
          basePath={`/${companySlug}/inventory/movements`}
          sortBy={sortBy}
          sortDir={sortDir}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verificar tipos e lint**

```bash
npm run typecheck 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inventory/components/movement-table.tsx \
        src/app/(dashboard)/[companySlug]/inventory/movements/page.tsx
git commit -m "feat(ux): sortable columns in MovementTable

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Verificação final + push

- [ ] **Step 1: Build de produção**

```bash
npm run build 2>&1 | tail -40
```

Esperado: build completo sem erros de tipo ou compilação.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Marcar PR #32 como pronto para review**

```bash
gh pr ready 32
```
