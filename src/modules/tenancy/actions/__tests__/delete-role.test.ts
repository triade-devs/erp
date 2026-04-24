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
import { deleteRoleAction } from "../delete-role";

// -------------------------------------------------------------------
// Sequência de produção (delete-role.ts):
//   1. requirePermission(companyId, "core:role:manage")
//   2. createClient() → roles.select().eq().eq().maybeSingle()
//   3. checks: fetchError, not found, is_system
//   4. membership_roles.select("id", {count:"exact", head:true}).eq("role_id")
//   5. check: count > 0
//   6. roles.delete().eq("id").eq("company_id")
//   7. audit()
//   8. revalidatePath()
// -------------------------------------------------------------------

type RoleData = {
  id: string;
  is_system: boolean;
  company_id: string;
} | null;

type DeleteMockOptions = {
  roleData?: RoleData;
  roleFetchError?: { message: string } | null;
  memberCount?: number | null;
  countError?: { message: string } | null;
  deleteError?: { message: string } | null;
};

function makeSupabaseMock({
  roleData = { id: "role-1", is_system: false, company_id: "company-1" },
  roleFetchError = null,
  memberCount = 0,
  countError = null,
  deleteError = null,
}: DeleteMockOptions = {}) {
  // roles select: .select().eq().eq().maybeSingle()
  const rolesMaybeSingle = vi.fn().mockResolvedValue({
    data: roleFetchError ? null : roleData,
    error: roleFetchError,
  });
  const rolesEq2Select = vi.fn().mockReturnValue({ maybeSingle: rolesMaybeSingle });
  const rolesEq1Select = vi.fn().mockReturnValue({ eq: rolesEq2Select });
  const rolesSelectFetch = vi.fn().mockReturnValue({ eq: rolesEq1Select });

  // roles delete: .delete().eq().eq()
  const rolesDeleteEq2 = vi.fn().mockResolvedValue({
    data: null,
    error: deleteError,
  });
  const rolesDeleteEq1 = vi.fn().mockReturnValue({ eq: rolesDeleteEq2 });
  const rolesDeleteFn = vi.fn().mockReturnValue({ eq: rolesDeleteEq1 });

  // membership_roles count: .select("id", {count:"exact", head:true}).eq()
  const mrEq = vi.fn().mockResolvedValue({
    count: memberCount,
    error: countError,
  });
  const mrSelect = vi.fn().mockReturnValue({ eq: mrEq });

  const mockClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "roles") {
        return {
          select: rolesSelectFetch,
          delete: rolesDeleteFn,
        };
      }
      if (table === "membership_roles") {
        return { select: mrSelect };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rolesDeleteFn,
  };

  return mockClient;
}

describe("deleteRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando core:role:manage é negado", async () => {
    // Arrange
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden:core:role:manage"));
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-1");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false } quando role não é encontrada", async () => {
    // Arrange
    const mock = makeSupabaseMock({ roleData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-inexistente");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("encontrada");
    }
  });

  it("retorna { ok: false } quando role é is_system = true", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleData: { id: "role-system", is_system: true, company_id: "company-1" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-system");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("sistema");
    }
  });

  it("retorna { ok: false } quando há membros com essa role (membership_roles count > 0)", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleData: { id: "role-1", is_system: false, company_id: "company-1" },
      memberCount: 3,
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-1");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("membros");
    }
  });

  it("retorna { ok: true } quando role custom não possui membros", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleData: { id: "role-custom", is_system: false, company_id: "company-1" },
      memberCount: 0,
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-custom");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("Role excluída");
    }
    // Verifica que delete foi chamado
    expect(mock.rolesDeleteFn).toHaveBeenCalled();
  });

  it("retorna { ok: false, message } quando delete falha com erro do banco", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleData: { id: "role-1", is_system: false, company_id: "company-1" },
      memberCount: 0,
      deleteError: { message: "Erro ao excluir role" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-1");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Erro ao excluir role");
    }
  });

  it("retorna { ok: false } quando fetch de role retorna erro do banco", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleFetchError: { message: "Falha na consulta" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Act
    const result = await deleteRoleAction("company-1", "role-1");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Falha na consulta");
    }
  });
});
