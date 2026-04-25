import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

type AuditEntry = {
  companyId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  permission?: string;
  status?: "success" | "denied" | "error";
  metadata?: Record<string, unknown>;
};

export async function audit(e: AuditEntry): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const h = await headers();

  const requestId = h.get("x-request-id");

  const { error: insertError } = await supabase.from("audit_logs").insert({
    company_id: e.companyId ?? null,
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: e.action,
    resource_type: e.resourceType ?? null,
    resource_id: e.resourceId ?? null,
    permission: e.permission ?? null,
    status: e.status ?? "success",
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || null,
    user_agent: h.get("user-agent") ?? null,
    metadata: {
      ...(e.metadata ?? {}),
      ...(requestId ? { request_id: requestId } : {}),
    } as Json,
  });
  if (insertError) console.error("[audit] falha ao inserir log:", insertError.message);
}
