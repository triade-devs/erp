import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/core/config/env";

export async function GET(req: Request) {
  // Validate CRON_SECRET if set
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET) {
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const serviceClient = createServiceClient();
  const now = new Date().toISOString();

  // Expire invitations
  const { error: invError } = await serviceClient
    .from("company_invitations")
    .update({ status: "expired" })
    .lt("expires_at", now)
    .eq("status", "pending");

  if (invError) {
    console.error("Erro ao expirar convites:", invError.message);
  }

  // Expire password reset requests
  const { error: resetError } = await (serviceClient
    .from("password_reset_requests" as any)
    .update({ status: "expired" })
    .lt("expires_at", now)
    .in("status", ["pending_review", "approved"]));

  if (resetError) {
    console.error("Erro ao expirar reset requests:", resetError.message);
  }

  // Clean up old short_code_attempts (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: attemptsError } = await (serviceClient
    .from("short_code_attempts" as any)
    .delete()
    .lt("created_at", sevenDaysAgo));

  if (attemptsError) {
    console.error("Erro ao limpar tentativas:", attemptsError.message);
  }

  return NextResponse.json({
    ok: true,
    message: "Limpeza de tokens expirados concluída",
  });
}
