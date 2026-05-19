import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AssignableMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  status: string;
};

export async function listAssignableMembers(companyId: string): Promise<AssignableMember[]> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("id, user_id, status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error) throw error;
  if (!memberships?.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      memberships.map((m) => m.user_id),
    );

  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user_id,
    fullName: names.get(m.user_id) ?? "Sem nome",
    status: m.status,
  }));
}
