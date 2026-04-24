import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CompanyMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  status: string;
  isOwner: boolean;
  joinedAt: string | null;
  roles: { id: string; name: string; code: string }[];
};

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const supabase = await createClient();

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select(
      `
      id,
      user_id,
      status,
      is_owner,
      joined_at,
      membership_roles (
        roles ( id, name, code )
      )
    `,
    )
    .eq("company_id", companyId)
    .order("joined_at", { ascending: false });

  if (memErr) throw memErr;

  if (!memberships?.length) return [];

  const userIds = memberships.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return memberships.map((row) => ({
    membershipId: row.id,
    userId: row.user_id,
    fullName: profileMap.get(row.user_id) ?? "—",
    status: row.status,
    isOwner: row.is_owner,
    joinedAt: row.joined_at,
    roles: (row.membership_roles ?? [])
      .map((mr) => mr.roles)
      .filter((r): r is { id: string; name: string; code: string } => r !== null),
  }));
}
