import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/modules/authz", () => ({ requirePermission: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { createWarehouseAction } from "../create-warehouse";
import { updateWarehouseAction } from "../update-warehouse";
import { toggleWarehouseActiveAction } from "../toggle-warehouse-active";

function makeFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function makeSupabaseMock(options?: {
  insertError?: { code?: string; message: string } | null;
  updateError?: { message: string } | null;
}) {
  const insertSingle = vi.fn().mockResolvedValue({
    data: options?.insertError ? null : { id: "warehouse-1" },
    error: options?.insertError ?? null,
  });
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  const updateEqCompany = vi.fn().mockResolvedValue({ error: options?.updateError ?? null });
  const updateEqId = vi.fn().mockReturnValue({ eq: updateEqCompany });
  const update = vi.fn().mockReturnValue({ eq: updateEqId });

  return {
    from: vi.fn((table: string) => {
      if (table === "warehouses") {
        return { insert, update };
      }

      throw new Error(`Tabela inesperada: ${table}`);
    }),
    insert,
    update,
    updateEqId,
    updateEqCompany,
  };
}

describe("warehouse actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando não possui permissão para criar depósito", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden"));

    const result = await createWarehouseAction(
      "company-1",
      { ok: true },
      makeFormData({ name: "Depósito A" }),
    );

    expect(result).toEqual({ ok: false, message: "Sem permissão para gerenciar depósitos" });
  });

  it("retorna fieldErrors quando os dados do depósito são inválidos", async () => {
    const result = await createWarehouseAction(
      "company-1",
      { ok: true },
      makeFormData({ name: "A" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
    }
    expect(requirePermission).toHaveBeenCalledWith("company-1", "core:inventory:manage");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("cria depósito, audita e revalida a rota", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createWarehouseAction(
      "company-1",
      { ok: true },
      makeFormData({ name: "Depósito A" }),
    );

    expect(result).toEqual({ ok: true, message: "Depósito criado com sucesso" });
    expect(mock.insert).toHaveBeenCalledWith({
      company_id: "company-1",
      name: "Depósito A",
    });
    expect(audit).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/[companySlug]/settings/warehouses");
  });

  it("atualiza o nome do depósito", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateWarehouseAction(
      "company-1",
      "warehouse-1",
      { ok: true },
      makeFormData({ name: "Depósito Renomeado" }),
    );

    expect(result).toEqual({ ok: true, message: "Depósito atualizado com sucesso" });
    expect(mock.update).toHaveBeenCalledWith({ name: "Depósito Renomeado" });
    expect(mock.updateEqId).toHaveBeenCalledWith("id", "warehouse-1");
    expect(mock.updateEqCompany).toHaveBeenCalledWith("company_id", "company-1");
  });

  it("ativa ou desativa o depósito", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await toggleWarehouseActiveAction("company-1", "warehouse-1", false);

    expect(result).toEqual({ ok: true, message: "Depósito desativado com sucesso" });
    expect(mock.update).toHaveBeenCalledWith({ is_active: false });
    expect(audit).toHaveBeenCalled();
  });
});
