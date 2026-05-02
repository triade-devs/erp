import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { bulkToggleModuleForCompaniesAction } from "../bulk-toggle-module-for-companies";

// Sequência enable=true:
//   rpc is_platform_admin → auth.getUser → companies.select("id") → company_modules.upsert(rows)
// Sequência enable=false:
//   rpc is_platform_admin → auth.getUser → company_modules.delete().eq("module_code")

function makeEnableMock({
  isPlatformAdmin = true,
  companies = [{ id: "c1" }, { id: "c2" }],
  upsertError = null as { message: string } | null,
} = {}) {
  const companiesSelect = vi.fn().mockResolvedValue({ data: companies, error: null });
  const companiesFrom = { select: companiesSelect };

  const cmUpsert = vi
    .fn()
    .mockResolvedValue(upsertError ? { error: upsertError } : { error: null });
  const cmFrom = { upsert: cmUpsert };

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "companies") return companiesFrom;
      if (table === "company_modules") return cmFrom;
      return {};
    }),
  };
}

function makeDisableMock({ deleteError = null as { message: string } | null } = {}) {
  const cmDeleteEq = vi
    .fn()
    .mockResolvedValue(deleteError ? { error: deleteError } : { error: null });
  const cmDelete = vi.fn().mockReturnValue({ eq: cmDeleteEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules") return { delete: cmDelete };
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
