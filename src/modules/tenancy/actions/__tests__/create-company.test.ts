import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks declarados antes dos imports que os consomem
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/core/config/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    SUPABASE_SERVICE_ROLE_KEY: undefined, // sem service role nos testes
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

import { createClient } from "@/lib/supabase/server";
import { createCompanyAction } from "../create-company";
import type { ActionResult } from "@/lib/errors";

// Estado anterior vazio usado como primeiro arg de useActionState
const PREV: ActionResult = { ok: false };

// -------------------------------------------------------------------
// Helpers para construir FormData de teste
// -------------------------------------------------------------------
function makeValidFormData(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  fd.append("name", "Acme Ltda");
  fd.append("slug", "acme-ltda");
  fd.append("plan", "starter");
  fd.append("modules", "inventory");

  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

// -------------------------------------------------------------------
// Fábrica de mock do Supabase — constrói chains por tabela
// -------------------------------------------------------------------
type SupabaseMockOptions = {
  isPlatformAdmin?: boolean;
  rpcError?: { message: string } | null;
  companyInsertError?: { message: string } | null;
  companyId?: string;
  modulesInsertError?: { message: string } | null;
  rbacError?: { message: string } | null;
};

function makeSupabaseMock({
  isPlatformAdmin = true,
  rpcError = null,
  companyInsertError = null,
  companyId = "company-uuid-1",
  modulesInsertError = null,
  rbacError = null,
}: SupabaseMockOptions = {}) {
  // Chain para companies: .insert().select().single()
  const companiesSingle = vi
    .fn()
    .mockResolvedValue(
      companyInsertError
        ? { data: null, error: companyInsertError }
        : { data: { id: companyId }, error: null },
    );
  const companiesSelect = vi.fn().mockReturnValue({ single: companiesSingle });
  const companiesInsert = vi.fn().mockReturnValue({ select: companiesSelect });

  // Chain para company_modules: .insert() terminal
  const companyModulesInsert = vi
    .fn()
    .mockResolvedValue(
      modulesInsertError ? { data: null, error: modulesInsertError } : { data: null, error: null },
    );

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: vi.fn().mockImplementation((name: string) => {
      if (name === "is_platform_admin") {
        return Promise.resolve({ data: isPlatformAdmin, error: rpcError });
      }
      if (name === "bootstrap_company_rbac") {
        return Promise.resolve({ data: null, error: rbacError });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "companies") {
        return { insert: companiesInsert };
      }
      if (table === "company_modules") {
        return { insert: companyModulesInsert };
      }
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

// -------------------------------------------------------------------
// Testes
// -------------------------------------------------------------------
describe("createCompanyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna { ok: false } e lança AppError quando usuário não é platform admin", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(createCompanyAction(PREV, makeValidFormData())).rejects.toThrow("Acesso negado");
  });

  it("retorna { ok: false, fieldErrors } com FormData sem name e sem slug", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const fd = new FormData();
    // Omite name e slug propositalmente; plan também inválido
    const result = await createCompanyAction(PREV, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.fieldErrors?.slug).toBeDefined();
    }
  });

  it("retorna { ok: false, fieldErrors } com FormData sem módulos selecionados", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    // FormData válido exceto sem modules
    const fd = new FormData();
    fd.append("name", "Empresa X");
    fd.append("slug", "empresa-x");
    fd.append("plan", "starter");
    // modules omitido

    const result = await createCompanyAction(PREV, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.modules).toBeDefined();
    }
  });

  it("retorna { ok: false, message } quando insert em companies falha por slug duplicado", async () => {
    const mock = makeSupabaseMock({
      isPlatformAdmin: true,
      companyInsertError: {
        message: 'duplicate key value violates unique constraint "companies_slug_key"',
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createCompanyAction(PREV, makeValidFormData());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Já existe uma empresa com este slug");
    }
  });

  it("retorna { ok: false, message } quando insert em companies falha por erro genérico", async () => {
    const mock = makeSupabaseMock({
      isPlatformAdmin: true,
      companyInsertError: { message: "Erro interno no banco de dados" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createCompanyAction(PREV, makeValidFormData());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Erro interno no banco de dados");
    }
  });

  it("retorna { ok: true } com FormData válido (name, slug, plan, modules)", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createCompanyAction(PREV, makeValidFormData({ modules: ["inventory"] }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("Acme Ltda");
    }
  });

  it("retorna { ok: true } com múltiplos módulos selecionados", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createCompanyAction(
      PREV,
      makeValidFormData({ modules: ["inventory", "movements"] }),
    );

    expect(result.ok).toBe(true);
  });

  it("retorna { ok: false, message } quando bootstrap_company_rbac falha", async () => {
    const mock = makeSupabaseMock({
      isPlatformAdmin: true,
      rbacError: { message: "Falha ao inicializar RBAC" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createCompanyAction(PREV, makeValidFormData());

    expect(mock.from).toHaveBeenCalledWith("companies");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Falha ao inicializar RBAC");
    }
  });
});
