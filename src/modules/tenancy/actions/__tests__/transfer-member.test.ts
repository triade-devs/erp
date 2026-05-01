import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { createClient } from "@/lib/supabase/server";
import { transferMemberAction } from "../transfer-member";

// Sequência de produção:
// 1. createClient() → rpc("is_platform_admin")
// 2. from("memberships").select(...).eq("id").eq("company_id").maybeSingle() [origem]
// 3. from("memberships").select(...).eq("company_id").eq("user_id").maybeSingle() [destino - checar duplicata]
// 4. from("memberships").insert({...}).select("id").single() [criar na destino]
// 5. Se !keepInSource: from("memberships").delete().eq("id").eq("company_id") [remover da origem]
// 6. audit()
// 7. revalidatePath()

function makeSupabaseMock({
  isPlatformAdmin = true,
  sourceMembership = {
    id: "mem-1",
    user_id: "user-1",
    is_owner: false,
    membership_roles: [] as Array<{ role_id: string }>,
  } as {
    id: string;
    user_id: string;
    is_owner: boolean;
    membership_roles: Array<{ role_id: string }>;
  } | null,
  existingDestMembership = null as { id: string; status: string } | null,
  insertError = null as { message: string } | null,
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: null });

  // chain para select membership de origem
  const sourceSingle = vi.fn().mockResolvedValue({ data: sourceMembership, error: null });
  const sourceEq2 = vi.fn().mockReturnValue({ maybeSingle: sourceSingle });
  const sourceEq1 = vi.fn().mockReturnValue({ eq: sourceEq2 });
  const sourceSelect = vi.fn().mockReturnValue({ eq: sourceEq1 });

  // chain para checar membership existente no destino
  const destSingle = vi.fn().mockResolvedValue({ data: existingDestMembership, error: null });
  const destEq2 = vi.fn().mockReturnValue({ maybeSingle: destSingle });
  const destEq1 = vi.fn().mockReturnValue({ eq: destEq2 });
  const destSelect = vi.fn().mockReturnValue({ eq: destEq1 });

  // insert membership destino
  const insertSingle = vi
    .fn()
    .mockResolvedValue(
      insertError ? { data: null, error: insertError } : { data: { id: "mem-new" }, error: null },
    );
  const insertSelectFn = vi.fn().mockReturnValue({ single: insertSingle });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  // delete origem
  const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq1 });

  // insert membership_roles
  const rolesInsert = vi.fn().mockResolvedValue({ error: null });
  const membershipRolesFrom = { insert: rolesInsert };

  let membershipsCallCount = 0;
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "memberships") {
      membershipsCallCount++;
      if (membershipsCallCount === 1) return { select: sourceSelect };
      if (membershipsCallCount === 2) return { select: destSelect };
      if (membershipsCallCount === 3) return { insert: insertFn };
      if (membershipsCallCount === 4) return { delete: deleteFn };
    }
    if (table === "membership_roles") return membershipRolesFrom;
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });

  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-user" } } }),
  };

  return { rpc, from, auth };
}

describe("transferMemberAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna { ok: false } quando usuário não é platform admin", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("negado");
  });

  it("retorna { ok: false } quando membership de origem não é encontrada", async () => {
    const mock = makeSupabaseMock({ sourceMembership: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("não encontrado");
  });

  it("retorna { ok: false } quando usuário já é membro da empresa destino", async () => {
    const mock = makeSupabaseMock({
      existingDestMembership: { id: "mem-existing", status: "active" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("membro");
  });

  it("retorna { ok: true } e mantém membro na origem quando keepInSource=true", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", true);

    expect(result.ok).toBe(true);
  });

  it("retorna { ok: true } e remove da origem quando keepInSource=false", async () => {
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(true);
  });

  it("copia as roles do membro para a empresa destino", async () => {
    const mock = makeSupabaseMock({
      sourceMembership: {
        id: "mem-1",
        user_id: "user-1",
        is_owner: false,
        membership_roles: [{ role_id: "role-editor" }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await transferMemberAction("mem-1", "comp-src", "comp-dest", false);

    expect(result.ok).toBe(true);
    expect(mock.from).toHaveBeenCalledWith("membership_roles");
  });
});
