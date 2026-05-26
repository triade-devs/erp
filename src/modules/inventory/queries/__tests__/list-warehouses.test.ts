import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { listWarehouses } from "../list-warehouses";

it("lista todos os depósitos da empresa e mapeia is_active para isActive", async () => {
  const order = vi.fn().mockResolvedValue({
    data: [
      { id: "1", name: "Depósito A", is_active: true },
      { id: "2", name: "Depósito B", is_active: false },
    ],
    error: null,
  });
  const eqCompany = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq: eqCompany });

  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({ select }),
  } as never);

  await expect(listWarehouses("company-1")).resolves.toEqual([
    { id: "1", name: "Depósito A", isActive: true },
    { id: "2", name: "Depósito B", isActive: false },
  ]);
  expect(eqCompany).toHaveBeenCalledWith("company_id", "company-1");
});
