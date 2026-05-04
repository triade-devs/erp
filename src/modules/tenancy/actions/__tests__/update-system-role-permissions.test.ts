import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateSystemRolePermissionsAction } from "../update-system-role-permissions";

// Sequência de produção:
//   1. rpc("is_platform_admin")
//   2. rpc("update_system_role_permissions", { role_code, permission_codes })

function makeSupabaseMock({
  isPlatformAdmin = true,
  rpcAdminError = null as { message: string } | null,
  rpcUpdateError = null as { message: string } | null,
} = {}) {
  return {
    rpc: vi.fn().mockImplementation((name: string) => {
      if (name === "is_platform_admin")
        return Promise.resolve({ data: isPlatformAdmin, error: rpcAdminError });
      if (name === "update_system_role_permissions")
        return Promise.resolve({ data: null, error: rpcUpdateError });
      return Promise.resolve({ data: null, error: null });
    }),
  };
}

function fd(perms: string[]): FormData {
  const form = new FormData();
  for (const p of perms) form.append("permission_code", p);
  return form;
}

describe("updateSystemRolePermissionsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: true } no caminho feliz", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateSystemRolePermissionsAction(
      "operator",
      { ok: true },
      fd(["inventory:product:read", "kb:article:read"]),
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/platform/roles");
  });

  it("retorna { ok: true } com array vazio de permissões", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const result = await updateSystemRolePermissionsAction("operator", { ok: true }, fd([]));
    expect(result.ok).toBe(true);
  });

  it("lança quando não é platform admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ isPlatformAdmin: false }) as never,
    );
    await expect(
      updateSystemRolePermissionsAction("operator", { ok: true }, fd([])),
    ).rejects.toThrow("Acesso negado");
  });

  it("retorna { ok: false } quando RPC falha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ rpcUpdateError: { message: "permission denied" } }) as never,
    );
    const result = await updateSystemRolePermissionsAction("operator", { ok: true }, fd([]));
    expect(result.ok).toBe(false);
  });

  it("retorna { ok: false } quando is_platform_admin retorna erro de RPC", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ rpcAdminError: { message: "connection error" } }) as never,
    );
    const result = await updateSystemRolePermissionsAction("operator", { ok: true }, fd([]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("connection error");
  });
});
