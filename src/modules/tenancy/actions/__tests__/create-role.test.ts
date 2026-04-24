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
import { createRoleAction } from "../create-role";

// -------------------------------------------------------------------
// Sequência de produção (create-role.ts):
//   1. requirePermission(companyId, "core:role:manage")
//   2. createRoleSchema.safeParse(formData)
//   3. createClient() → roles.insert().select("id").single()
//   4. audit()
//   5. revalidatePath()
// -------------------------------------------------------------------

type RoleMockOptions = {
  insertError?: { message: string; code?: string } | null;
  roleId?: string;
};

function makeSupabaseMock({ insertError = null, roleId = "role-new-id" }: RoleMockOptions = {}) {
  // roles: .insert().select("id").single() — terminal
  const rolesSingle = vi
    .fn()
    .mockResolvedValue(
      insertError ? { data: null, error: insertError } : { data: { id: roleId }, error: null },
    );
  const rolesInsertSelect = vi.fn().mockReturnValue({ single: rolesSingle });
  const rolesInsert = vi.fn().mockReturnValue({ select: rolesInsertSelect });

  const mockClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "roles") {
        return { insert: rolesInsert };
      }
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rolesInsert,
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

describe("createRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando core:role:manage é negado", async () => {
    // Arrange
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden:core:role:manage"));
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Nova Role" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false, fieldErrors } quando name está vazio (FormData inválido)", async () => {
    // Arrange
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("retorna { ok: false } quando name é muito curto (< 2 caracteres)", async () => {
    // Arrange
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "A" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it("retorna { ok: false, message } quando insert falha por conflito de code (23505)", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      insertError: { message: "duplicate key value", code: "23505" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Gerente" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("nome");
    }
  });

  it("retorna { ok: false, message } quando insert falha por outro erro de banco", async () => {
    // Arrange
    const mock = makeSupabaseMock({ insertError: { message: "conexão perdida" } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Operador" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("conexão perdida");
    }
  });

  it("retorna { ok: true } no caminho feliz e verifica que code foi gerado a partir do name", async () => {
    // Arrange
    const mock = makeSupabaseMock({ roleId: "role-abc-123" });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Supervisor Geral", description: "Supervisiona tudo" });

    // Act
    const result = await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("Supervisor Geral");
    }
    // Verifica que o insert foi chamado com o code gerado a partir do name
    expect(mock.rolesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "supervisor-geral",
        name: "Supervisor Geral",
        is_system: false,
        company_id: "company-1",
      }),
    );
  });

  it("gera code sem acentos e caracteres especiais", async () => {
    // Arrange
    const mock = makeSupabaseMock({ roleId: "role-xyz" });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData({ name: "Técnico de Manutenção" });

    // Act
    await createRoleAction("company-1", { ok: true }, fd);

    // Assert
    expect(mock.rolesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "tecnico-de-manutencao",
      }),
    );
  });
});
