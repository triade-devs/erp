"use server";

import { createClient } from "@/lib/supabase/server";

export type UserSearchResult = {
  userId: string;
  fullName: string;
  email: string;
};

export async function searchUsersForCompanyAction(
  companyId: string,
  query: string,
): Promise<{ ok: true; users: UserSearchResult[] } | { ok: false; message: string }> {
  if (!query || query.trim().length < 2) return { ok: true, users: [] };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_users_for_company", {
    p_query: query.trim(),
    p_company_id: companyId,
  });

  if (error) return { ok: false, message: error.message };

  const users: UserSearchResult[] = (data ?? []).map(
    (row: { user_id: string; full_name: string; email: string }) => ({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
    }),
  );

  return { ok: true, users };
}
