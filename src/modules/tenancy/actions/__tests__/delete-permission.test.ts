import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { deletePermissionAction } from "../delete-permission";

function makeSupabaseMock({
  isPlatformAdmin = true,
  deleteError = null as { message: string } | null,
} = {}) {
  const permDeleteEq2 = vi
    .fn()
    .mockResolvedValue(deleteError ? { error: deleteError } : { error: null });
  const permDeleteEq1 = vi.fn().mockReturnValue({ eq: permDeleteEq2 });
  const permDelete = vi.fn().mockReturnValue({ eq: permDeleteEq1 });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "permissions") return { delete: permDelete };
      return {};
    }),
  };
}

describe("deletePermissionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await deletePermissionAction("inventory", "inventory:product:archive");
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(deletePermissionAction("inventory", "inventory:product:archive")).rejects.toThrow(
      "Acesso negado",
    );
  });
});
