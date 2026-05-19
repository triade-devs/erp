import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { updateModuleAction } from "../update-module";

function makeSupabaseMock({
  isPlatformAdmin = true,
  updateError = null as { message: string } | null,
  notFound = false,
} = {}) {
  const modulesSelect = vi
    .fn()
    .mockResolvedValue(
      updateError
        ? { data: null, error: updateError }
        : notFound
          ? { data: [], error: null }
          : { data: [{ code: "inventory" }], error: null },
    );
  const modulesEq = vi.fn().mockReturnValue({ select: modulesSelect });
  const modulesUpdate = vi.fn().mockReturnValue({ eq: modulesEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { update: modulesUpdate };
      return {};
    }),
  };
}

function fd(fields: Record<string, string | number>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return form;
}

describe("updateModuleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateModuleAction(
      "inventory",
      { ok: true },
      fd({ name: "Estoque v2", sort_order: 10 }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: false } quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      updateModuleAction("inventory", { ok: true }, fd({ name: "Estoque", sort_order: 10 })),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna fieldErrors quando name é muito curto", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateModuleAction(
      "inventory",
      { ok: true },
      fd({ name: "A", sort_order: 10 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.name).toBeDefined();
  });

  it("retorna { ok: false } quando módulo não existe (0 rows)", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ notFound: true }) as never);
    const result = await updateModuleAction(
      "inexistente",
      { ok: true },
      fd({ name: "Módulo X", sort_order: 10 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("Módulo não encontrado");
  });
});
