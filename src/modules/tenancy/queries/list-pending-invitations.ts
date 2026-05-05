import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PendingInvitation = {
  id: string;
  email: string;
  invitedByName: string;
  shortCode: string;
  expiresAt: string;
  createdAt: string;
};

export async function listPendingInvitations(companyId: string): Promise<PendingInvitation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_invitations")
    .select(`
      id,
      email,
      short_code,
      expires_at,
      created_at,
      invited_by
    `)
    .eq("company_id", companyId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // Resolve invited_by names
  const inviterIds = [...new Set(data.map((r) => r.invited_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", inviterIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    invitedByName: profileMap.get(row.invited_by) ?? "—",
    shortCode: row.short_code,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}
