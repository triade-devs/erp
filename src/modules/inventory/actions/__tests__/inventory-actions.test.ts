import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/modules/tenancy", () => ({ getActiveCompanyId: vi.fn() }));
vi.mock("@/modules/authz", () => {
  class ForbiddenError extends Error {
    permission: string;
    constructor(p: string) {
      super(`forbidden:${p}`);
      this.permission = p;
    }
  }
  return { requirePermission: vi.fn(), ForbiddenError };
});

import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { createProductAction } from "../create-product";
import { updateProductAction } from "../update-product";
import { deleteProductAction } from "../delete-product";
import { registerMovementAction } from "../register-movement";

const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PRODUCT_UUID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Retorna um mock de SupabaseClient que suporta .from().insert(), .from().update().eq().eq(),
// e .from().select().eq().single() com respostas configuráveis.
function makeSupabaseMock({
  userId = "user-xyz",
  insertError = null as unknown,
  updateRows = 1,
  stockValue = 100,
} = {}) {
  const insertChain = { insert: vi.fn().mockResolvedValue({ error: insertError }) };
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { stock: stockValue }, error: null }),
  };
  const updateChain = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null, count: updateRows }),
      }),
    }),
  };

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
    from: vi.fn((table: string) => {
      if (table === "stock_movements") return insertChain;
      // products: suporta insert E update E select dependendo do método chamado
      return {
        insert: vi.fn().mockResolvedValue({ error: insertError }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { stock: stockValue }, error: null }),
      };
    }),
  };
}

const validProductData = {
  sku: "PROD-001",
  name: "Produto Teste",
  unit: "UN",
  costPrice: "10",
  salePrice: "20",
  minStock: "0",
};

const validMovementData = {
  productId: PRODUCT_UUID,
  type: "in",
  quantity: "5",
};

// ─── createProductAction ──────────────────────────────────────────────────────

describe("createProductAction — isolamento por empresa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia quando nenhuma empresa ativa está definida", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const result = await createProductAction({ ok: false }, makeFormData(validProductData));

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/empresa ativa/i);
  });

  it("retorna acesso negado quando requirePermission lança ForbiddenError", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("inventory:product:create"));

    const result = await createProductAction({ ok: false }, makeFormData(validProductData));

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("passa o companyId correto para requirePermission", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    await createProductAction({ ok: false }, makeFormData(validProductData));

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "inventory:product:create");
  });

  it("empresa B não afeta verificação da empresa A (isolamento de contexto)", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_B);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    await createProductAction({ ok: false }, makeFormData(validProductData));

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_B, "inventory:product:create");
    expect(requirePermission).not.toHaveBeenCalledWith(COMPANY_A, expect.anything());
  });

  it("retorna fieldErrors quando input é inválido (antes de checar permissão)", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const result = await createProductAction({ ok: false }, makeFormData({ sku: "", name: "x" }));

    expect(result.ok).toBe(false);
    // Zod falhou → requirePermission não deve ser chamado
    expect(requirePermission).not.toHaveBeenCalled();
  });
});

// ─── updateProductAction ──────────────────────────────────────────────────────

describe("updateProductAction — controle de permissão", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia operador sem permissão de update", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("inventory:product:update"));

    const result = await updateProductAction(
      "prod-id-1",
      { ok: false },
      makeFormData(validProductData),
    );

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("chama requirePermission com a permissão correta de update", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    await updateProductAction("prod-id-1", { ok: false }, makeFormData(validProductData));

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "inventory:product:update");
  });
});

// ─── deleteProductAction ──────────────────────────────────────────────────────

describe("deleteProductAction — controle de permissão", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia operador sem permissão de delete", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("inventory:product:delete"));

    const result = await deleteProductAction(
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

    // redirect() do Next.js é mockado — não lança de verdade no teste
    await deleteProductAction("default-company", "prod-id-1", { ok: false }, new FormData());

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "inventory:product:delete");
  });
});

// ─── registerMovementAction ───────────────────────────────────────────────────

describe("registerMovementAction — controle de permissão", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia quando requirePermission nega movements:movement:create", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("movements:movement:create"));

    const result = await registerMovementAction({ ok: false }, makeFormData(validMovementData));

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("chama requirePermission com a permissão correta de movimento", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ stockValue: 100 }) as never);

    await registerMovementAction({ ok: false }, makeFormData(validMovementData));

    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "movements:movement:create");
  });

  it("bloqueia quando nenhuma empresa ativa está definida", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const result = await registerMovementAction({ ok: false }, makeFormData(validMovementData));

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/empresa ativa/i);
  });
});
