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
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/core/config/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePermission } from "@/modules/authz";
import { inviteMemberAction } from "../invite-member";

// -------------------------------------------------------------------
// Sequência de produção (invite-member.ts):
//   1. env.SUPABASE_SERVICE_ROLE_KEY check
//   2. createAnonClient() → auth.getUser()
//   3. requirePermission(companyId, "core:member:invite")
//   4. createServiceClient() → auth.admin.inviteUserByEmail()
//   5. anonClient.from("memberships").select().eq().eq().maybeSingle()
//   6. anonClient.from("memberships").insert().select("id").single()
//   7. anonClient.from("membership_roles").insert()
//   8. audit()
//   9. revalidatePath()
// -------------------------------------------------------------------

type InviteMockOptions = {
  userId?: string;
  userNull?: boolean;
  inviteError?: { message: string } | null;
  invitedUserId?: string;
  existingMembership?: { id: string; status: string } | null;
  membershipInsertError?: { message: string } | null;
  membershipId?: string;
  rolesInsertError?: { message: string } | null;
};

function makeAnonMock({
  userId = "user-1",
  userNull = false,
  existingMembership = null,
  membershipInsertError = null,
  membershipId = "membership-abc",
  rolesInsertError = null,
}: InviteMockOptions = {}) {
  // memberships: select chain .select().eq().eq().maybeSingle()
  const membershipsMaybeSingle = vi.fn().mockResolvedValue({
    data: existingMembership,
    error: null,
  });
  const membershipsEq2Select = vi.fn().mockReturnValue({ maybeSingle: membershipsMaybeSingle });
  const membershipsEq1Select = vi.fn().mockReturnValue({ eq: membershipsEq2Select });
  const membershipsSelect = vi.fn().mockReturnValue({ eq: membershipsEq1Select });

  // memberships: insert chain .insert().select("id").single()
  const membershipsSingle = vi
    .fn()
    .mockResolvedValue(
      membershipInsertError
        ? { data: null, error: membershipInsertError }
        : { data: { id: membershipId }, error: null },
    );
  const membershipsInsertSelect = vi.fn().mockReturnValue({ single: membershipsSingle });
  const membershipsInsert = vi.fn().mockReturnValue({ select: membershipsInsertSelect });

  // membership_roles: .insert() terminal
  const membershipRolesInsert = vi
    .fn()
    .mockResolvedValue(
      rolesInsertError ? { data: null, error: rolesInsertError } : { data: null, error: null },
    );

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userNull ? null : { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "memberships") {
        return {
          select: membershipsSelect,
          insert: membershipsInsert,
        };
      }
      if (table === "membership_roles") {
        return { insert: membershipRolesInsert };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    // expostos para inspeção
    membershipRolesInsert,
    membershipsInsert,
  };

  return mockClient;
}

function makeServiceMock({
  inviteError = null,
  invitedUserId = "invited-user-id",
}: { inviteError?: { message: string } | null; invitedUserId?: string } = {}) {
  const inviteUserByEmail = vi
    .fn()
    .mockResolvedValue(
      inviteError
        ? { data: null, error: inviteError }
        : { data: { user: { id: invitedUserId } }, error: null },
    );

  return {
    auth: {
      admin: {
        inviteUserByEmail,
      },
    },
    inviteUserByEmail,
  };
}

describe("inviteMemberAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando SUPABASE_SERVICE_ROLE_KEY está ausente", async () => {
    // Arrange: sobrescreve o módulo env temporariamente com chave ausente
    const { env } = await import("@/core/config/env");
    const originalKey = env.SUPABASE_SERVICE_ROLE_KEY;
    (env as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY = "";

    const anonMock = makeAnonMock();
    vi.mocked(createClient).mockResolvedValue(anonMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "test@example.com", []);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Service role");
    }

    // Restaura
    (env as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("retorna { ok: false } quando requirePermission lança ForbiddenError", async () => {
    // Arrange
    const { requirePermission: rp } = await import("@/modules/authz");
    vi.mocked(rp).mockRejectedValueOnce(new Error("forbidden:core:member:invite"));

    const anonMock = makeAnonMock();
    const serviceMock = makeServiceMock();
    vi.mocked(createClient).mockResolvedValue(anonMock as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "novo@empresa.com", []);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false } quando auth.admin.inviteUserByEmail falha", async () => {
    // Arrange
    const anonMock = makeAnonMock();
    const serviceMock = makeServiceMock({ inviteError: { message: "E-mail inválido" } });
    vi.mocked(createClient).mockResolvedValue(anonMock as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "bad-email", []);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("E-mail inválido");
    }
  });

  it("retorna { ok: true } no caminho feliz com membership e membership_roles inseridas", async () => {
    // Arrange
    const anonMock = makeAnonMock({
      existingMembership: null,
      membershipId: "mem-xyz",
    });
    const serviceMock = makeServiceMock({ invitedUserId: "invited-user-123" });
    vi.mocked(createClient).mockResolvedValue(anonMock as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "novo@empresa.com", [
      "role-id-1",
      "role-id-2",
    ]);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("novo@empresa.com");
    }
    // Verifica que memberships.insert foi chamado
    expect(anonMock.membershipsInsert).toHaveBeenCalled();
    // Verifica que membership_roles.insert foi chamado com os roleIds corretos
    expect(anonMock.membershipRolesInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role_id: "role-id-1", membership_id: "mem-xyz" }),
        expect.objectContaining({ role_id: "role-id-2", membership_id: "mem-xyz" }),
      ]),
    );
  });

  it("retorna { ok: false } quando membro já existe com status diferente de 'invited'", async () => {
    // Arrange
    const anonMock = makeAnonMock({
      existingMembership: { id: "mem-existing", status: "active" },
    });
    const serviceMock = makeServiceMock({ invitedUserId: "invited-user-123" });
    vi.mocked(createClient).mockResolvedValue(anonMock as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "existente@empresa.com", []);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("membro");
    }
  });

  it("não insere membership_roles quando lista de roles está vazia", async () => {
    // Arrange
    const anonMock = makeAnonMock({ existingMembership: null, membershipId: "mem-empty-roles" });
    const serviceMock = makeServiceMock({ invitedUserId: "invited-user-456" });
    vi.mocked(createClient).mockResolvedValue(anonMock as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceMock as never);

    // Act
    const result = await inviteMemberAction("company-1", "sem-roles@empresa.com", []);

    // Assert
    expect(result.ok).toBe(true);
    expect(anonMock.membershipRolesInsert).not.toHaveBeenCalled();
  });
});
