import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { bulkToggleModuleForCompaniesAction } from "../bulk-toggle-module-for-companies";

// Enable path:
//   rpc is_platform_admin → auth.getUser → companies.select → company_modules.upsert
//   → permissions.select.eq → roles.select.eq → role_permissions.upsert
// Disable path:
//   rpc is_platform_admin → auth.getUser → company_modules.delete.eq
//   → permissions.select.eq → role_permissions.delete.in

function makeEnableMock({
  isPlatformAdmin = true,
  companies = [{ id: "c1" }, { id: "c2" }],
  upsertError = null as { message: string } | null,
} = {}) {
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
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      if (table === "roles")
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      if (table === "role_permissions")
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    }),
  };
}

function makeDisableMock({ deleteError = null as { message: string } | null } = {}) {
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
            eq: vi.fn().mockResolvedValue({ data: [{ code: "kb:article:read" }], error: null }),
          }),
        };
      if (table === "role_permissions")
        return {
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      return {};
    }),
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
});
