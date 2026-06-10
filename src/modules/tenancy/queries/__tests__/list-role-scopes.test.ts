import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { listRoleScopes } from "../list-role-scopes";

it("lista os escopos da role", async () => {
  const secondOrder = vi.fn().mockResolvedValue({
    data: [
      { dimension_code: "warehouse", scope_value: "wh-1" },
      { dimension_code: "warehouse", scope_value: "wh-2" },
    ],
    error: null,
  });
  const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
  const eq = vi.fn().mockReturnValue({ order: firstOrder });
  const select = vi.fn().mockReturnValue({ eq });

  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ select }),
  } as never);

  await expect(listRoleScopes("role-1")).resolves.toEqual([
    { dimensionCode: "warehouse", scopeValue: "wh-1" },
    { dimensionCode: "warehouse", scopeValue: "wh-2" },
  ]);
});
