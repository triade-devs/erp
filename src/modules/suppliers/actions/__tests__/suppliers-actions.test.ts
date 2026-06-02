import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
import { createSupplierAction } from "../create-supplier";
import { updateSupplierAction } from "../update-supplier";
import { deactivateSupplierAction } from "../deactivate-supplier";

const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SUPPLIER_UUID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function makeSupabaseMock({ userId = "user-xyz", insertError = null as unknown } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: insertError }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    })),
  };
}

const validSupplier = { name: "Fornecedor X", isActive: "true" };

// ─── createSupplierAction ─────────────────────────────────────────────────────

describe("createSupplierAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia sem empresa ativa", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const r = await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/empresa ativa/i);
  });

  it("nega quando sem permissão", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("suppliers:supplier:create"));
    const r = await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("chama requirePermission com o code correto", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "suppliers:supplier:create");
  });

  it("retorna fieldErrors para nome inválido (antes de checar permissão)", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const r = await createSupplierAction({ ok: false }, makeFormData({ name: "X" }));
    expect(r.ok).toBe(false);
    expect(requirePermission).not.toHaveBeenCalled();
  });
});

// ─── updateSupplierAction ─────────────────────────────────────────────────────

describe("updateSupplierAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chama requirePermission com suppliers:supplier:update", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    await updateSupplierAction(SUPPLIER_UUID, { ok: false }, makeFormData(validSupplier));
    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "suppliers:supplier:update");
  });

  it("nega quando sem permissão de update", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("suppliers:supplier:update"));
    const r = await updateSupplierAction(SUPPLIER_UUID, { ok: false }, makeFormData(validSupplier));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/acesso negado/i);
  });
});

// ─── deactivateSupplierAction ─────────────────────────────────────────────────

describe("deactivateSupplierAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chama requirePermission com suppliers:supplier:delete", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    await deactivateSupplierAction(COMPANY_A, SUPPLIER_UUID, { ok: false }, new FormData());
    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "suppliers:supplier:delete");
  });

  it("nega quando sem permissão de desativar", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("suppliers:supplier:delete"));
    const r = await deactivateSupplierAction(
      COMPANY_A,
      SUPPLIER_UUID,
      { ok: false },
      new FormData(),
    );
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/acesso negado/i);
  });
});
