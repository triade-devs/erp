import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only para não lançar exceção fora do ambiente Next.js
vi.mock("server-only", () => ({}));

// Mock do createClient do Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getEffectivePermissions,
  hasPermission,
  requirePermission,
  ForbiddenError,
} from "../authz-service";

type MembershipData = {
  id: string;
  membership_roles: Array<{
    role: {
      role_permissions: Array<{ permission_code: string }>;
    };
  }>;
} | null;

function makeSupabaseMock({
  userId = "user-123",
  userNull = false,
  isPlatformAdmin = false,
  membershipData = null as MembershipData,
  membershipError = null as unknown,
  rpcError = null as unknown,
} = {}) {
  // A cadeia de query é: .from().select().eq().eq().eq().maybeSingle()
  // Todos os métodos intermediários retornam `this` exceto maybeSingle que resolve
  const queryChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: membershipData, error: membershipError }),
  };

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userNull ? null : { id: userId } },
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPlatformAdmin, error: rpcError }),
    from: vi.fn().mockReturnValue(queryChain),
  };

  return mockClient;
}

describe("getEffectivePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna Set vazio para usuário não autenticado", async () => {
    const mock = makeSupabaseMock({ userNull: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const perms = await getEffectivePermissions("company-1");
    expect(perms.size).toBe(0);
  });

  it("retorna Set(['*']) para platform admin", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const perms = await getEffectivePermissions("company-1");
    expect(perms.has("*")).toBe(true);
    expect(perms.size).toBe(1);
  });

  it("faz união de permissões de múltiplas roles (sem duplicatas)", async () => {
    const membershipData: MembershipData = {
      id: "mem-1",
      membership_roles: [
        {
          role: {
            role_permissions: [
              { permission_code: "inventory:product:read" },
              { permission_code: "inventory:product:create" },
            ],
          },
        },
        {
          role: {
            role_permissions: [
              { permission_code: "inventory:product:read" }, // duplicata — deve ser dedupada pelo Set
              { permission_code: "movements:movement:read" },
            ],
          },
        },
      ],
    };

    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const perms = await getEffectivePermissions("company-1");
    expect(perms.has("inventory:product:read")).toBe(true);
    expect(perms.has("inventory:product:create")).toBe(true);
    expect(perms.has("movements:movement:read")).toBe(true);
    expect(perms.size).toBe(3); // duplicatas eliminadas pelo Set
  });

  it("retorna Set vazio quando membership não existe", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const perms = await getEffectivePermissions("company-1");
    expect(perms.size).toBe(0);
  });
});

describe("hasPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true quando permissão está no Set", async () => {
    const membershipData: MembershipData = {
      id: "mem-1",
      membership_roles: [
        {
          role: {
            role_permissions: [{ permission_code: "inventory:product:read" }],
          },
        },
      ],
    };
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    expect(await hasPermission("company-1", "inventory:product:read")).toBe(true);
  });

  it("retorna false quando permissão não está no Set", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    expect(await hasPermission("company-1", "inventory:product:delete")).toBe(false);
  });

  it("retorna true para platform admin (sentinela '*')", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    expect(await hasPermission("company-1", "any:permission:here")).toBe(true);
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolve sem valor quando usuário tem a permissão", async () => {
    const membershipData: MembershipData = {
      id: "mem-1",
      membership_roles: [
        {
          role: {
            role_permissions: [{ permission_code: "core:audit:read" }],
          },
        },
      ],
    };
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(requirePermission("company-1", "core:audit:read")).resolves.toBeUndefined();
  });

  it("lança ForbiddenError quando usuário não tem a permissão", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(requirePermission("company-1", "core:audit:read")).rejects.toThrow(ForbiddenError);
  });

  it("ForbiddenError inclui o código da permissão negada", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: false, membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    try {
      await requirePermission("company-1", "inventory:product:delete");
      expect.fail("deveria ter lançado ForbiddenError");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as ForbiddenError).permission).toBe("inventory:product:delete");
    }
  });

  it("resolve para platform admin mesmo sem membership explícita", async () => {
    const mock = makeSupabaseMock({ isPlatformAdmin: true, membershipData: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(requirePermission("company-1", "some:restricted:action")).resolves.toBeUndefined();
  });
});
