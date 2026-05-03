import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createModuleAction } from "../create-module";

// Sequência de produção:
//   1. supabase.rpc("is_platform_admin")
//   2. modules.insert(data)

function makeSupabaseMock({
  isPlatformAdmin = true,
  rpcError = null as { message: string } | null,
  insertError = null as { message: string; code?: string } | null,
} = {}) {
  const modulesInsert = vi
    .fn()
    .mockResolvedValue(
      insertError ? { data: null, error: insertError } : { data: null, error: null },
    );

  const mockClient = {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: rpcError }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { insert: modulesInsert };
      return {};
    }),
  };
  return mockClient;
}

function fd(fields: Record<string, string | number | boolean>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return form;
}

describe("createModuleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: false } quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      createModuleAction(
        { ok: true },
        fd({ code: "test", name: "Teste", sort_order: 100, is_system: false }),
      ),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna fieldErrors quando code é inválido", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "INVALID CODE!", name: "Teste", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.code).toBeDefined();
  });

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "my-module", name: "Meu Módulo", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: false } em conflito de código único", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ insertError: { message: "dup", code: "23505" } }) as never,
    );
    const result = await createModuleAction(
      { ok: true },
      fd({ code: "my-module", name: "Meu Módulo", sort_order: 100, is_system: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/código/i);
  });
});
