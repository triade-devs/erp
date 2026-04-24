import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "./list-audit-logs";

export type { AuditLog };

export type GlobalAuditFilters = {
  companyId?: string;
  action?: string;
  status?: string;
};

export async function listAuditLogsGlobal(filters: GlobalAuditFilters = {}): Promise<AuditLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
