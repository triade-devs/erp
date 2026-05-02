import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { toggleModuleActiveAction } from "../toggle-module-active";

function makeSupabaseMock({
  isPlatformAdmin = true,
  updateError = null as { message: string } | null,
} = {}) {
  const modulesEq = vi
    .fn()
    .mockResolvedValue(updateError ? { error: updateError } : { error: null });
  const modulesUpdate = vi.fn().mockReturnValue({ eq: modulesEq });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "modules") return { update: modulesUpdate };
      return {};
    }),
  };
}

describe("toggleModuleActiveAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } ao ativar", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await toggleModuleActiveAction("inventory", true);
    expect(result.ok).toBe(true);
  });

  it("retorna { ok: true } ao desativar", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await toggleModuleActiveAction("inventory", false);
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(toggleModuleActiveAction("inventory", true)).rejects.toThrow("Acesso negado");
  });
});
