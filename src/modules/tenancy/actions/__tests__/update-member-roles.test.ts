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
import { updateMemberRolesAction } from "../update-member-roles";

// -------------------------------------------------------------------
// Sequência de produção (update-member-roles.ts):
//   1. createClient() → auth.getUser()
//   2. check: user autenticado
//   3. requirePermission(companyId, "core:member:manage")
//   4. memberships.select("id, user_id").eq("id").eq("company_id").maybeSingle()
//   5. checks: fetchError, not found
//   6. se roleIds.length > 0: roles.select("id").eq("company_id").in("id", roleIds)
//      → valida que todos os roleIds existem
//   7. rpc("set_member_roles", {p_company_id, p_membership_id, p_role_ids})
//   8. audit()
//   9. revalidatePath()
// -------------------------------------------------------------------

type MembershipData = { id: string; user_id: string } | null;

type UpdateMemberRolesMockOptions = {
  user?: { id: string } | null;
  membershipData?: MembershipData;
  membershipFetchError?: { message: string } | null;
  validRoles?: Array<{ id: string }> | null;
  rpcError?: { message: string } | null;
};

function makeSupabaseMock({
  user = { id: "user-1" },
  membershipData = { id: "membership-1", user_id: "user-2" },
  membershipFetchError = null,
  validRoles = null,
  rpcError = null,
}: UpdateMemberRolesMockOptions = {}) {
  // auth.getUser()
  const getUser = vi.fn().mockResolvedValue({ data: { user } });

  // memberships: .select("id, user_id").eq("id").eq("company_id").maybeSingle()
  const membershipsMaybeSingle = vi.fn().mockResolvedValue({
    data: membershipFetchError ? null : membershipData,
    error: membershipFetchError,
  });
  const membershipsEq2 = vi.fn().mockReturnValue({ maybeSingle: membershipsMaybeSingle });
  const membershipsEq1 = vi.fn().mockReturnValue({ eq: membershipsEq2 });
  const membershipsSelect = vi.fn().mockReturnValue({ eq: membershipsEq1 });

  // roles: .select("id").eq("company_id").in("id", roleIds)
  const rolesIn = vi.fn().mockResolvedValue({ data: validRoles, error: null });
  const rolesEq = vi.fn().mockReturnValue({ in: rolesIn });
  const rolesSelect = vi.fn().mockReturnValue({ eq: rolesEq });

  // rpc("set_member_roles")
  const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });

  const mockClient = {
    auth: { getUser },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "memberships") {
        return { select: membershipsSelect };
      }
      if (table === "roles") {
        return { select: rolesSelect };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc,
    rolesIn,
  };

  return mockClient;
}

describe("updateMemberRolesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando usuário não está autenticado", async () => {
    const mock = makeSupabaseMock({ user: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", ["role-1"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("autenticado");
    }
  });

  it("retorna { ok: false } quando core:member:manage é negado", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden:core:member:manage"));
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", ["role-1"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false } quando membro não é encontrado", async () => {
    const mock = makeSupabaseMock({ membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-inexistente", []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("encontrado");
    }
  });

  it("retorna { ok: false } quando fetch de membership retorna erro do banco", async () => {
    const mock = makeSupabaseMock({ membershipFetchError: { message: "Falha na consulta" } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Falha na consulta");
    }
  });

  it("retorna { ok: false } quando uma ou mais roles são inválidas para a company", async () => {
    // Solicita 2 roles mas banco retorna apenas 1 válida
    const mock = makeSupabaseMock({
      validRoles: [{ id: "role-1" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", [
      "role-1",
      "role-invalida",
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("inválidas");
    }
  });

  it("retorna { ok: false } quando rpc set_member_roles retorna erro", async () => {
    const mock = makeSupabaseMock({
      validRoles: [{ id: "role-1" }],
      rpcError: { message: "Erro no RPC" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", ["role-1"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Erro no RPC");
    }
  });

  it("retorna { ok: true } no caminho feliz com roles válidas e chama rpc corretamente", async () => {
    const mock = makeSupabaseMock({
      validRoles: [{ id: "role-1" }, { id: "role-2" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", ["role-1", "role-2"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("atualizadas");
    }
    expect(mock.rpc).toHaveBeenCalledWith("set_member_roles", {
      p_company_id: "company-1",
      p_membership_id: "membership-1",
      p_role_ids: ["role-1", "role-2"],
    });
  });

  it("retorna { ok: true } e pula validação de roles quando lista está vazia", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await updateMemberRolesAction("company-1", "membership-1", []);

    expect(result.ok).toBe(true);
    // Não deve consultar tabela de roles para lista vazia
    expect(mock.rolesIn).not.toHaveBeenCalled();
    // Deve chamar rpc com lista vazia
    expect(mock.rpc).toHaveBeenCalledWith("set_member_roles", {
      p_company_id: "company-1",
      p_membership_id: "membership-1",
      p_role_ids: [],
    });
  });
});
