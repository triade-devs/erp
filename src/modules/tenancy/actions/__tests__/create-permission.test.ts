import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createPermissionAction } from "../create-permission";

function makeSupabaseMock({
  isPlatformAdmin = true,
  insertError = null as { message: string; code?: string } | null,
} = {}) {
  const permInsert = vi
    .fn()
    .mockResolvedValue(insertError ? { error: insertError } : { error: null });

  return {
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "permissions") return { insert: permInsert };
      return {};
    }),
  };
}

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

describe("createPermissionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createPermissionAction(
      "inventory",
      { ok: true },
      fd({ code: "inventory:product:archive", resource: "product", action: "archive" }),
    );
    expect(result.ok).toBe(true);
  });

  it("retorna fieldErrors quando code contém caracteres inválidos", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await createPermissionAction(
      "inventory",
      { ok: true },
      fd({ code: "INVALID CODE", resource: "product", action: "archive" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.code).toBeDefined();
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      createPermissionAction(
        "inventory",
        { ok: true },
        fd({ code: "inventory:product:archive", resource: "product", action: "archive" }),
      ),
    ).rejects.toThrow("Acesso negado");
  });
});
