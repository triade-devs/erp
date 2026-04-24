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
import { updateRolePermissionsAction } from "../update-role-permissions";

// -------------------------------------------------------------------
// Sequência de produção (update-role-permissions.ts):
//   1. requirePermission(companyId, "core:role:manage")
//   2. createClient() → roles.select().eq().eq().maybeSingle()
//   3. checks: roleErr, not found, is_system
//   4. Promise.all([
//        role_permissions.select("permission_code").eq("role_id"),
//        company_modules.select("module_code").eq("company_id"),
//      ])
//   5. permissions.select("code").in("module_code", moduleCodes)
//   6. toRemove → role_permissions.delete().eq("role_id").in("permission_code", toRemove)
//   7. toAdd    → role_permissions.upsert([...])
//   8. audit()
//   9. revalidatePath()
// -------------------------------------------------------------------

type RoleData = {
  id: string;
  is_system: boolean;
  company_id: string;
} | null;

type UpdatePermsMockOptions = {
  roleData?: RoleData;
  roleFetchError?: { message: string } | null;
  currentPerms?: Array<{ permission_code: string }>;
  enabledModules?: Array<{ module_code: string }>;
  validPerms?: Array<{ code: string }>;
  deleteError?: { message: string } | null;
  upsertError?: { message: string } | null;
};

function makeSupabaseMock({
  roleData = { id: "role-1", is_system: false, company_id: "company-1" },
  roleFetchError = null,
  currentPerms = [],
  enabledModules = [{ module_code: "inventory" }],
  validPerms = [
    { code: "inventory:product:read" },
    { code: "inventory:product:create" },
    { code: "inventory:product:delete" },
  ],
  deleteError = null,
  upsertError = null,
}: UpdatePermsMockOptions = {}) {
  // roles: .select().eq().eq().maybeSingle()
  const rolesMaybeSingle = vi.fn().mockResolvedValue({
    data: roleFetchError ? null : roleData,
    error: roleFetchError,
  });
  const rolesEq2 = vi.fn().mockReturnValue({ maybeSingle: rolesMaybeSingle });
  const rolesEq1 = vi.fn().mockReturnValue({ eq: rolesEq2 });
  const rolesSelect = vi.fn().mockReturnValue({ eq: rolesEq1 });

  // role_permissions select: .select("permission_code").eq("role_id") — Promise.all branch 1
  const rpSelectEq = vi.fn().mockResolvedValue({ data: currentPerms, error: null });
  const rpSelectFn = vi.fn().mockReturnValue({ eq: rpSelectEq });

  // company_modules: .select("module_code").eq("company_id") — Promise.all branch 2
  const cmSelectEq = vi.fn().mockResolvedValue({ data: enabledModules, error: null });
  const cmSelectFn = vi.fn().mockReturnValue({ eq: cmSelectEq });

  // permissions: .select("code").in("module_code", moduleCodes)
  const permsIn = vi.fn().mockResolvedValue({ data: validPerms, error: null });
  const permsSelect = vi.fn().mockReturnValue({ in: permsIn });

  // role_permissions delete: .delete().eq("role_id").in("permission_code", toRemove)
  const rpDeleteIn = vi.fn().mockResolvedValue({ data: null, error: deleteError });
  const rpDeleteEq = vi.fn().mockReturnValue({ in: rpDeleteIn });
  const rpDeleteFn = vi.fn().mockReturnValue({ eq: rpDeleteEq });

  // role_permissions upsert: .upsert([...]) — terminal
  const rpUpsert = vi.fn().mockResolvedValue({ data: null, error: upsertError });

  // Controla quantas vezes role_permissions foi chamado para distinguir select vs delete/upsert
  let rpCallCount = 0;

  const mockClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "roles") {
        return { select: rolesSelect };
      }
      if (table === "role_permissions") {
        rpCallCount++;
        // 1ª chamada: select (dentro do Promise.all)
        if (rpCallCount === 1) {
          return { select: rpSelectFn };
        }
        // Chamadas subsequentes: delete ou upsert
        return { delete: rpDeleteFn, upsert: rpUpsert };
      }
      if (table === "company_modules") {
        return { select: cmSelectFn };
      }
      if (table === "permissions") {
        return { select: permsSelect };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    // expostos para inspeção
    rpDeleteIn,
    rpDeleteEq,
    rpUpsert,
    permsIn,
  };

  return mockClient;
}

function makeFormData(permissionCodes: string[]): FormData {
  const fd = new FormData();
  for (const code of permissionCodes) {
    fd.append("permission_code", code);
  }
  return fd;
}

describe("updateRolePermissionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } quando core:role:manage é negado", async () => {
    // Arrange
    vi.mocked(requirePermission).mockRejectedValueOnce(new Error("forbidden:core:role:manage"));
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData(["inventory:product:read"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("permissão");
    }
  });

  it("retorna { ok: false } quando role é is_system = true", async () => {
    // Arrange
    const mock = makeSupabaseMock({
      roleData: { id: "role-sys", is_system: true, company_id: "company-1" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData(["inventory:product:read"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-sys", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("sistema");
    }
  });

  it("retorna { ok: true } e chama upsert quando adiciona novas permissões", async () => {
    // Arrange — currentPerms vazio, solicita 2 permissões válidas
    const mock = makeSupabaseMock({
      currentPerms: [],
      enabledModules: [{ module_code: "inventory" }],
      validPerms: [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData(["inventory:product:read", "inventory:product:create"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(true);
    expect(mock.rpUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ permission_code: "inventory:product:read" }),
        expect.objectContaining({ permission_code: "inventory:product:create" }),
      ]),
      expect.objectContaining({ onConflict: "role_id,permission_code" }),
    );
  });

  it("retorna { ok: true } e chama delete quando remove permissões", async () => {
    // Arrange — role já tem 2 perms, solicita remover uma delas
    const mock = makeSupabaseMock({
      currentPerms: [
        { permission_code: "inventory:product:read" },
        { permission_code: "inventory:product:create" },
      ],
      enabledModules: [{ module_code: "inventory" }],
      validPerms: [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Solicita manter só read (remove create)
    const fd = makeFormData(["inventory:product:read"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(true);
    // Verifica que delete foi chamado com "inventory:product:create" no toRemove
    expect(mock.rpDeleteIn).toHaveBeenCalledWith(
      "permission_code",
      expect.arrayContaining(["inventory:product:create"]),
    );
  });

  it("ignora permissões de módulos não habilitados (não estão no validSet)", async () => {
    // Arrange — módulo "crm" não está habilitado → permissão "crm:contact:read" não está no validSet
    const mock = makeSupabaseMock({
      currentPerms: [],
      enabledModules: [{ module_code: "inventory" }],
      validPerms: [{ code: "inventory:product:read" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // Solicita uma permissão válida + uma de módulo não habilitado
    const fd = makeFormData(["inventory:product:read", "crm:contact:read"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(true);
    // upsert deve ter sido chamado apenas com a permissão válida
    expect(mock.rpUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ permission_code: "inventory:product:read" }),
      ]),
      expect.anything(),
    );
    // "crm:contact:read" NÃO deve estar no upsert
    const upsertArgs = mock.rpUpsert.mock.calls[0]?.[0] as Array<{ permission_code: string }>;
    const insertedCodes = upsertArgs?.map((r) => r.permission_code) ?? [];
    expect(insertedCodes).not.toContain("crm:contact:read");
  });

  it("retorna { ok: true } sem chamar delete nem upsert quando não há mudanças", async () => {
    // Arrange — role já tem exactly as perms solicitadas
    const mock = makeSupabaseMock({
      currentPerms: [{ permission_code: "inventory:product:read" }],
      enabledModules: [{ module_code: "inventory" }],
      validPerms: [{ code: "inventory:product:read" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData(["inventory:product:read"]);

    // Act
    const result = await updateRolePermissionsAction("company-1", "role-1", { ok: true }, fd);

    // Assert
    expect(result.ok).toBe(true);
    expect(mock.rpDeleteIn).not.toHaveBeenCalled();
    expect(mock.rpUpsert).not.toHaveBeenCalled();
  });

  it("retorna { ok: false } quando role não é encontrada", async () => {
    // Arrange
    const mock = makeSupabaseMock({ roleData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = makeFormData([]);

    // Act
    const result = await updateRolePermissionsAction(
      "company-1",
      "role-inexistente",
      { ok: true },
      fd,
    );

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("encontrada");
    }
  });
});
