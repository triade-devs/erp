import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/modules/authz", () => ({ requirePermission: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { updateRoleScopesAction } from "../update-role-scopes";

function makeSupabaseMock(options?: {
  roleData?: { id: string } | null;
  roleError?: { message: string } | null;
  rpcError?: { message: string } | null;
}) {
  const roleMaybeSingle = vi.fn().mockResolvedValue({
    data: options?.roleError
      ? null
      : options && "roleData" in options
        ? (options.roleData ?? null)
        : { id: "role-1" },
    error: options?.roleError ?? null,
  });
  const roleEqCompany = vi.fn().mockReturnValue({ maybeSingle: roleMaybeSingle });
  const roleEqId = vi.fn().mockReturnValue({ eq: roleEqCompany });
  const roleSelect = vi.fn().mockReturnValue({ eq: roleEqId });
  const rpc = vi.fn().mockResolvedValue({ error: options?.rpcError ?? null });

  return {
    from: vi.fn((table: string) => {
      if (table === "roles") {
        return { select: roleSelect };
      }

      throw new Error(`Tabela inesperada: ${table}`);
    }),
    rpc,
    roleEqId,
    roleEqCompany,
  };
}

describe("updateRoleScopesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando não possui permissão para gerenciar roles", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden"));

    const result = await updateRoleScopesAction("company-1", "role-1", "warehouse", ["wh-1"]);

    expect(result).toEqual({ ok: false, message: "Sem permissão para gerenciar roles" });
  });

  it("valida que a role pertence à empresa antes de atualizar os escopos", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateRoleScopesAction("company-1", "role-1", "warehouse", [
      "wh-1",
      "wh-2",
    ]);

    expect(result).toEqual({ ok: true, message: "Escopos atualizados com sucesso" });
    expect(mock.roleEqId).toHaveBeenCalledWith("id", "role-1");
    expect(mock.roleEqCompany).toHaveBeenCalledWith("company_id", "company-1");
    expect(mock.rpc).toHaveBeenCalledWith("set_role_scopes", {
      p_company_id: "company-1",
      p_role_id: "role-1",
      p_dimension_code: "warehouse",
      p_scope_values: ["wh-1", "wh-2"],
    });
    expect(audit).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/[companySlug]/settings/roles");
  });

  it("retorna erro quando a role não pertence à empresa", async () => {
    const mock = makeSupabaseMock({ roleData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateRoleScopesAction("company-1", "role-1", "warehouse", ["wh-1"]);

    expect(result).toEqual({ ok: false, message: "Role não encontrada" });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("envia array vazio para o rpc quando scopeValues está vazio", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateRoleScopesAction("company-1", "role-1", "warehouse", []);

    expect(result).toEqual({ ok: true, message: "Escopos atualizados com sucesso" });
    expect(mock.rpc).toHaveBeenCalledWith("set_role_scopes", {
      p_company_id: "company-1",
      p_role_id: "role-1",
      p_dimension_code: "warehouse",
      p_scope_values: [],
    });
  });
});
