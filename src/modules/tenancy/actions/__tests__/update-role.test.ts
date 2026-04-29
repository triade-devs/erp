import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/authz", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  ForbiddenError: class ForbiddenError extends Error {
    constructor(public permission: string) {
      super(`forbidden:${permission}`);
    }
  },
}));

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/authz";
import { updateRoleAction } from "../update-role";

// -------------------------------------------------------------------
// Sequência de produção (update-role.ts):
//   1. requirePermission(companyId, "core:role:manage")
//   2. updateRoleSchema.safeParse(formData)
//   3. createClient() → roles.select().eq().eq().maybeSingle()
//   4. checks: fetchError, not found, is_system
//   5. roles.update({name, description, updated_at}).eq("id")
//   6. audit()
//   7. revalidatePath()
// -------------------------------------------------------------------

type RoleData = {
  id: string;
  is_system: boolean;
  company_id: string;
} | null;

type UpdateRoleMockOptions = {
  roleData?: RoleData;
  roleFetchError?: { message: string } | null;
  updateError?: { message: string } | null;
};

function makeSupabaseMock({
  roleData = { id: "role-1", is_system: false, company_id: "company-1" },
  roleFetchError = null,
  updateError = null,
}: UpdateRoleMockOptions = {}) {
  // roles select: .select().eq().eq().maybeSingle()
  const rolesMaybeSingle = vi.fn().mockResolvedValue({
    data: roleFetchError ? null : roleData,
    error: roleFetchError,
  });
  const rolesEq2Select = vi.fn().mockReturnValue({ maybeSingle: rolesMaybeSingle });
  const rolesEq1Select = vi.fn().mockReturnValue({ eq: rolesEq2Select });
  const rolesSelectFetch = vi.fn().mockReturnValue({ eq: rolesEq1Select });

  // roles update: .update({...}).eq("id")
  const rolesUpdateEq = vi.fn().mockResolvedValue({ data: null, error: updateError });
  const rolesUpdateFn = vi.fn().mockReturnValue({ eq: rolesUpdateEq });

  const mockClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "roles") {
        return {
          select: rolesSelectFetch,
          update: rolesUpdateFn,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rolesUpdateFn,
    rolesUpdateEq,
  };

  return mockClient;
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

describe("updateRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando core:role:manage é negado", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden:core:role:manage"));
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false, fieldErrors } quando name está vazio", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("retorna { ok: false, fieldErrors } quando name é muito curto (< 2 caracteres)", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "A" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("retorna { ok: false } quando role não é encontrada", async () => {
    const mock = makeSupabaseMock({ roleData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente" });

    const result = await updateRoleAction("company-1", "role-inexistente", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("encontrada");
    }
  });

  it("retorna { ok: false } quando role é is_system = true", async () => {
    const mock = makeSupabaseMock({
      roleData: { id: "role-sys", is_system: true, company_id: "company-1" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Admin" });

    const result = await updateRoleAction("company-1", "role-sys", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("sistema");
    }
  });

  it("retorna { ok: false } quando fetch de role retorna erro do banco", async () => {
    const mock = makeSupabaseMock({ roleFetchError: { message: "Falha na consulta" } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Falha na consulta");
    }
  });

  it("retorna { ok: false, message } quando update falha com erro do banco", async () => {
    const mock = makeSupabaseMock({ updateError: { message: "Erro ao atualizar role" } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Erro ao atualizar role");
    }
  });

  it("retorna { ok: true } no caminho feliz e chama update com os dados corretos", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente de Vendas", description: "Gerencia vendas" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("Role atualizada");
    }
    expect(mock.rolesUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Gerente de Vendas",
        description: "Gerencia vendas",
      }),
    );
  });

  it("aceita description opcional (undefined) e envia null ao banco", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Operador" });

    const result = await updateRoleAction("company-1", "role-1", { ok: true }, fd);

    expect(result.ok).toBe(true);
    expect(mock.rolesUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Operador",
        description: null,
      }),
    );
  });
});
