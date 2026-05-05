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

  // Busca user_ids de membros ativos da empresa
  const { data: members, error: membersError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (membersError ?? !members?.length) return [];

  const userIds = members.map((m) => m.user_id);

  const { data, error } = await supabase
    .from("password_reset_requests")
    .select("id, user_id, email, source, status, requested_at")
    .in("user_id", userIds)
    .in("status", ["pending_review", "approved"])
    .order("requested_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.requested_at,
  }));
}
