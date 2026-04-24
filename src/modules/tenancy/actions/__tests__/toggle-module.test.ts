import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { createClient } from "@/lib/supabase/server";
import { toggleModuleAction } from "../toggle-module";

// -------------------------------------------------------------------
// Tipos compartilhados
// -------------------------------------------------------------------
type ToggleMockOptions = {
  isPlatformAdmin?: boolean;
  rpcError?: { message: string } | null;
  insertModuleError?: { message: string } | null;
  deleteModuleError?: { message: string } | null;
  systemRoles?: Array<{ id: string; code: string }>;
  permissions?: Array<{ code: string }>;
  permsToRemove?: Array<{ code: string }>;
  companyRoles?: Array<{ id: string }>;
};

// -------------------------------------------------------------------
// Factory: mock para o caminho enable=true
// Sequência de produção:
//   company_modules.insert()
//   roles.select("id, code").eq("company_id").eq("is_system", true)
//   permissions.select("code").eq("module_code").in("action", [...])
//   role_permissions.upsert(...)
// -------------------------------------------------------------------
function makeEnableMock({
  isPlatformAdmin = true,
  rpcError = null,
  insertModuleError = null,
  systemRoles = [
    { id: "role-owner", code: "owner" },
    { id: "role-manager", code: "manager" },
    { id: "role-operator", code: "operator" },
  ],
  permissions = [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
}: Pick<
  ToggleMockOptions,
  "isPlatformAdmin" | "rpcError" | "insertModuleError" | "systemRoles" | "permissions"
> = {}) {
  // company_modules: .insert() terminal
  const modulesInsert = vi
    .fn()
    .mockResolvedValue(
      insertModuleError ? { data: null, error: insertModuleError } : { data: null, error: null },
    );

  // roles: .select().eq().eq() — 2 eqs
  const rolesEq2System = vi.fn().mockResolvedValue({ data: systemRoles, error: null });
  const rolesEq1System = vi.fn().mockReturnValue({ eq: rolesEq2System });
  const rolesSelectSystem = vi.fn().mockReturnValue({ eq: rolesEq1System });

  // permissions: .select().eq().in()
  const permsIn = vi.fn().mockResolvedValue({ data: permissions, error: null });
  const permsEqEnable = vi.fn().mockReturnValue({ in: permsIn });
  const permsSelectEnable = vi.fn().mockReturnValue({ eq: permsEqEnable });

  // role_permissions: .upsert() terminal
  const rolePermsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: rpcError }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules") {
        return { insert: modulesInsert };
      }
      if (table === "roles") {
        return { select: rolesSelectSystem };
      }
      if (table === "permissions") {
        return { select: permsSelectEnable };
      }
      if (table === "role_permissions") {
        return { upsert: rolePermsUpsert };
      }
      // fallback para tabelas não esperadas — joga erro para detectar acessos inesperados
      return vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    }),
    // Helpers expostos para inspecionar nos testes
    modulesInsert,
    rolePermsUpsert,
  };
}

// -------------------------------------------------------------------
// Factory: mock para o caminho enable=false
// Sequência de produção:
//   company_modules.delete().eq("company_id").eq("module_code") — sem return, só checa error
//   permissions.select("code").eq("module_code", moduleCode)    — uma eq, resolve array
//   roles.select("id").eq("company_id", companyId)              — uma eq, resolve array
//   role_permissions.delete().in("role_id", roleIds).in("permission_code", codes) — sem return
// -------------------------------------------------------------------
function makeDisableMock({
  isPlatformAdmin = true,
  rpcError = null,
  deleteModuleError = null,
  permsToRemove = [{ code: "inventory:product:read" }],
  companyRoles = [{ id: "role-owner" }, { id: "role-manager" }],
}: Pick<
  ToggleMockOptions,
  "isPlatformAdmin" | "rpcError" | "deleteModuleError" | "permsToRemove" | "companyRoles"
> = {}) {
  // company_modules: .delete().eq().eq() — terminal
  const modulesDeleteEq2 = vi
    .fn()
    .mockResolvedValue(
      deleteModuleError ? { data: null, error: deleteModuleError } : { data: null, error: null },
    );
  const modulesDeleteEq1 = vi.fn().mockReturnValue({ eq: modulesDeleteEq2 });
  const modulesDeleteFn = vi.fn().mockReturnValue({ eq: modulesDeleteEq1 });

  // permissions: .select("code").eq("module_code", moduleCode) — uma eq, resolve array
  const permsEqDisable = vi.fn().mockResolvedValue({ data: permsToRemove, error: null });
  const permsSelectDisable = vi.fn().mockReturnValue({ eq: permsEqDisable });

  // roles: .select("id").eq("company_id", companyId) — uma eq, resolve array
  const rolesEqCompany = vi.fn().mockResolvedValue({ data: companyRoles, error: null });
  const rolesSelectCompany = vi.fn().mockReturnValue({ eq: rolesEqCompany });

  // role_permissions: .delete().in("role_id").in("permission_code") — sem return
  const rolePermsDeleteIn2 = vi.fn().mockResolvedValue({ data: null, error: null });
  const rolePermsDeleteIn1 = vi.fn().mockReturnValue({ in: rolePermsDeleteIn2 });
  const rolePermsDeleteFn = vi.fn().mockReturnValue({ in: rolePermsDeleteIn1 });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: rpcError }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules") {
        return { delete: modulesDeleteFn };
      }
      if (table === "permissions") {
        return { select: permsSelectDisable };
      }
      if (table === "roles") {
        return { select: rolesSelectCompany };
      }
      if (table === "role_permissions") {
        return { delete: rolePermsDeleteFn };
      }
      // fallback para tabelas não esperadas — joga erro para detectar acessos inesperados
      return vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    }),
    // Helpers expostos para inspecionar nos testes
    modulesDeleteFn,
    permsEqDisable,
    rolePermsDeleteIn2,
  };
}

// -------------------------------------------------------------------
// Wrapper que usa a factory correta por path
// -------------------------------------------------------------------
async function callToggle(
  mock: ReturnType<typeof makeEnableMock> | ReturnType<typeof makeDisableMock>,
  companyId: string,
  moduleCode: string,
  enable: boolean,
) {
  vi.mocked(createClient).mockResolvedValue(mock as never);
  return toggleModuleAction(companyId, moduleCode, enable);
}

// -------------------------------------------------------------------
// Testes
// -------------------------------------------------------------------
describe("toggleModuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } e lança AppError quando usuário não é platform admin", async () => {
    const mock = makeEnableMock({ isPlatformAdmin: false });
    await expect(callToggle(mock, "company-1", "inventory", true)).rejects.toThrow("Acesso negado");
  });

  it("retorna { ok: false, message } quando rpc is_platform_admin retorna erro", async () => {
    const mock = makeEnableMock({
      isPlatformAdmin: true,
      rpcError: { message: "RPC indisponível" },
    });
    const result = await callToggle(mock, "company-1", "inventory", true);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("RPC indisponível");
    }
  });

  it("retorna { ok: true } ao habilitar módulo e chama upsert em role_permissions", async () => {
    const mock = makeEnableMock({ isPlatformAdmin: true });
    const result = await callToggle(mock, "company-1", "inventory", true);

    expect(result.ok).toBe(true);
    // Verifica que upsert foi chamado (ao menos uma vez para alguma role)
    expect(mock.rolePermsUpsert).toHaveBeenCalled();
  });

  it("ao habilitar módulo passa os campos corretos para upsert de role_permissions", async () => {
    const mock = makeEnableMock({
      isPlatformAdmin: true,
      systemRoles: [{ id: "role-owner-id", code: "owner" }],
      permissions: [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
    });
    await callToggle(mock, "company-1", "inventory", true);

    expect(mock.rolePermsUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ permission_code: "inventory:product:read" }),
        expect.objectContaining({ permission_code: "inventory:product:create" }),
      ]),
      expect.objectContaining({ onConflict: "role_id,permission_code" }),
    );
  });

  it("retorna { ok: true } ao desabilitar módulo", async () => {
    const mock = makeDisableMock({ isPlatformAdmin: true });
    const result = await callToggle(mock, "company-1", "inventory", false);

    expect(result.ok).toBe(true);
  });

  it("ao desabilitar módulo chama delete em company_modules", async () => {
    const mock = makeDisableMock({ isPlatformAdmin: true });
    await callToggle(mock, "company-1", "inventory", false);

    expect(mock.modulesDeleteFn).toHaveBeenCalled();
  });

  it("ao desabilitar módulo chama delete em role_permissions com os ids corretos", async () => {
    const mock = makeDisableMock({
      isPlatformAdmin: true,
      companyRoles: [{ id: "role-a" }, { id: "role-b" }],
      permsToRemove: [{ code: "inventory:product:read" }],
    });
    await callToggle(mock, "company-1", "inventory", false);

    expect(mock.permsEqDisable).toHaveBeenCalledWith("module_code", "inventory");

    // Verifica que o segundo .in() foi chamado com os permission_codes corretos
    expect(mock.rolePermsDeleteIn2).toHaveBeenCalledWith(
      "permission_code",
      expect.arrayContaining(["inventory:product:read"]),
    );
  });

  it("retorna { ok: false, message } quando insert em company_modules falha ao habilitar", async () => {
    const mock = makeEnableMock({
      isPlatformAdmin: true,
      insertModuleError: { message: "Módulo já habilitado" },
    });
    const result = await callToggle(mock, "company-1", "inventory", true);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Módulo já habilitado");
    }
  });

  it("retorna { ok: false, message } quando delete em company_modules falha ao desabilitar", async () => {
    const mock = makeDisableMock({
      isPlatformAdmin: true,
      deleteModuleError: { message: "Falha ao remover módulo" },
    });
    const result = await callToggle(mock, "company-1", "inventory", false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Falha ao remover módulo");
    }
  });

  it("retorna mensagem de sucesso correta ao habilitar módulo", async () => {
    const mock = makeEnableMock({ isPlatformAdmin: true });
    const result = await callToggle(mock, "company-1", "inventory", true);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("habilitado");
    }
  });

  it("retorna mensagem de sucesso correta ao desabilitar módulo", async () => {
    const mock = makeDisableMock({ isPlatformAdmin: true });
    const result = await callToggle(mock, "company-1", "inventory", false);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("desabilitado");
    }
  });
});
