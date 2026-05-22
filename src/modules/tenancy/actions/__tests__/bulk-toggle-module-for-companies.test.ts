import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { bulkToggleModuleForCompaniesAction } from "../bulk-toggle-module-for-companies";

// Enable path:
//   rpc is_platform_admin → auth.getUser → companies.select → company_modules.upsert
//   → permissions.select.eq → role_permissions.update({ is_active: true }).in
//   → roles.select.eq → role_permissions.upsert
// Disable path:
//   rpc is_platform_admin → auth.getUser → company_modules.delete.eq
//   → permissions.select.eq → role_permissions.update({ is_active: false }).in

function makeEnableMock({
  isPlatformAdmin = true,
  companies = [{ id: "c1" }, { id: "c2" }],
  upsertError = null as { message: string } | null,
  modulePerms = [] as Array<{ code: string; action: string }>,
  systemRoles = [] as Array<{ id: string; code: string }>,
} = {}) {
  const rolePermsUpdateIn = vi.fn().mockResolvedValue({ data: null, error: null });
  const rolePermsUpdateFn = vi.fn().mockReturnValue({ in: rolePermsUpdateIn });
  const rolePermsUpsert = vi.fn().mockResolvedValue({ error: null });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "companies")
        return { select: vi.fn().mockResolvedValue({ data: companies, error: null }) };
      if (table === "company_modules")
        return {
          upsert: vi.fn().mockResolvedValue(upsertError ? { error: upsertError } : { error: null }),
        };
      if (table === "permissions")
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: modulePerms, error: null }),
          }),
        };
      if (table === "roles")
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: systemRoles, error: null }),
          }),
        };
      if (table === "role_permissions")
        return { update: rolePermsUpdateFn, upsert: rolePermsUpsert };
      return {};
    }),
    rolePermsUpdateFn,
    rolePermsUpdateIn,
    rolePermsUpsert,
  };
}

function makeDisableMock({
  deleteError = null as { message: string } | null,
  permsToDeactivate = [{ code: "kb:article:read" }] as Array<{ code: string }>,
} = {}) {
  const rolePermsUpdateIn = vi.fn().mockResolvedValue({ data: null, error: null });
  const rolePermsUpdateFn = vi.fn().mockReturnValue({ in: rolePermsUpdateIn });

  return {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules")
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(deleteError ? { error: deleteError } : { error: null }),
          }),
        };
      if (table === "permissions")
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: permsToDeactivate, error: null }),
          }),
        };
      if (table === "role_permissions") return { update: rolePermsUpdateFn };
      return {};
    }),
    rolePermsUpdateFn,
    rolePermsUpdateIn,
  };
}

describe("bulkToggleModuleForCompaniesAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ativa para todas as empresas — { ok: true }", async () => {
    vi.mocked(createClient).mockResolvedValue(makeEnableMock() as never);
    const result = await bulkToggleModuleForCompaniesAction("knowledge-base", true);
    expect(result.ok).toBe(true);
  });

  it("desativa para todas as empresas — { ok: true }", async () => {
    vi.mocked(createClient).mockResolvedValue(makeDisableMock() as never);
    const result = await bulkToggleModuleForCompaniesAction("knowledge-base", false);
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(makeEnableMock({ isPlatformAdmin: false }) as never);
    await expect(bulkToggleModuleForCompaniesAction("knowledge-base", true)).rejects.toThrow(
      "Acesso negado",
    );
  });

  it("disable: marca is_active=false em role_permissions globalmente", async () => {
    const mock = makeDisableMock({
      permsToDeactivate: [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await bulkToggleModuleForCompaniesAction("inventory", false);

    expect(result.ok).toBe(true);
    expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: false });
    expect(mock.rolePermsUpdateIn).toHaveBeenCalledWith(
      "permission_code",
      expect.arrayContaining(["inventory:product:read", "inventory:product:create"]),
    );
  });

  it("enable: marca is_active=true em role_permissions globalmente antes do upsert", async () => {
    const mock = makeEnableMock({
      modulePerms: [
        { code: "inventory:product:read", action: "read" },
        { code: "inventory:product:create", action: "create" },
      ],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await bulkToggleModuleForCompaniesAction("inventory", true);

    expect(result.ok).toBe(true);
    expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: true });
    expect(mock.rolePermsUpdateIn).toHaveBeenCalledWith(
      "permission_code",
      expect.arrayContaining(["inventory:product:read", "inventory:product:create"]),
    );
  });

  it("enable: upsert das perms-padrão inclui is_active=true", async () => {
    const mock = makeEnableMock({
      systemRoles: [{ id: "role-owner", code: "owner" }],
      modulePerms: [{ code: "inventory:product:read", action: "read" }],
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await bulkToggleModuleForCompaniesAction("inventory", true);

    expect(mock.rolePermsUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ permission_code: "inventory:product:read", is_active: true }),
      ]),
      expect.objectContaining({ onConflict: "role_id,permission_code" }),
    );
  });
});
