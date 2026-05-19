import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { ForbiddenError, requirePermission } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

export async function getMedicalActionContext(permission: string): Promise<
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      companyId: string;
      userId: string;
      membershipId: string;
    }
  | { ok: false; result: ActionResult }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, result: { ok: false, message: "Não autenticado" } };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, result: { ok: false, message: "Nenhuma empresa ativa" } };

  try {
    await requirePermission(companyId, permission);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { ok: false, result: { ok: false, message: "Acesso negado: permissão insuficiente" } };
    }
    throw e;
  }

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { ok: false, result: { ok: false, message: error.message } };
  if (!membership)
    return { ok: false, result: { ok: false, message: "Membro ativo não encontrado" } };

  return { ok: true, supabase, companyId, userId: user.id, membershipId: membership.id };
}

export async function ensurePatientAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  patientId: string,
): Promise<ActionResult | null> {
  const { data, error } = await supabase.rpc("has_medical_patient_access", {
    p_company: companyId,
    p_patient: patientId,
  });
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Paciente fora da sua carteira de atendimento" };
  return null;
}
