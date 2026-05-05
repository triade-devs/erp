import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ResetRequestRow = {
  id: string;
  email: string;
  source: string;
  status: string;
  createdAt: string;
  userId: string;
};

export async function listResetRequestsForCompany(companyId: string): Promise<ResetRequestRow[]> {
  const supabase = await createClient();
  // password_reset_requests não está em database.types.ts ainda (migration pendente de sync)
  // biome-ignore lint: tabela não tipada até db:types ser regenerado
  const { data, error } = await (supabase as unknown as { from: (t: string) => unknown } & typeof supabase)
    .from("password_reset_requests")
    .select(
      `
      id,
      user_id,
      email,
      source,
      status,
      created_at,
      memberships!inner(company_id)
    `,
    )
    .eq("memberships.company_id", companyId)
    .in("status", ["pending_review", "approved"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (
    data as Array<{
      id: string;
      user_id: string;
      email: string;
      source: string;
      status: string;
      created_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
  }));
}
