import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";
import { listVisibleColumns } from "../field-rules";

describe("listVisibleColumns", () => {
  it("retorna colunas do RPC quando há resultado", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: ["id", "name", "sale_price"], error: null }),
    });

    const cols = await listVisibleColumns("co-1", "products");
    expect(cols).toEqual(["id", "name", "sale_price"]);
  });

  it("retorna ['id'] quando RPC retorna vazio (fallback)", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const cols = await listVisibleColumns("co-1", "products");
    expect(cols).toEqual(["id"]);
  });

  it("lança quando RPC erra", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    await expect(listVisibleColumns("co-1", "products")).rejects.toThrow();
  });
});
