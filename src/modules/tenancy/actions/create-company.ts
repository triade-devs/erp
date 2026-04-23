"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AppError, type ActionResult } from "@/lib/errors";
import { env } from "@/core/config/env";
import { createCompanySchema } from "../schemas/create-company";
import { audit } from "@/modules/audit";

/**
 * Server Action para criar uma nova empresa (apenas administradores de plataforma).
 *
 * Passos:
 * 1. Verifica is_platform_admin()
 * 2. Valida FormData
 * 3. Insere na tabela companies
 * 4. Insere módulos em company_modules
 * 5. Chama bootstrap_company_rbac
 * 6. Convida owner por e-mail (se fornecido e service role disponível)
 * 7. Insere audit_log
 * 8. Revalida cache
 */
export async function createCompanyAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Verifica permissão de plataforma
  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  // 2. Obtém usuário atual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  // 3. Valida FormData (modules vem como múltiplos valores de checkboxes)
  const rawModules = formData.getAll("modules") as string[];
  const rawData = {
    ...Object.fromEntries(formData),
    modules: rawModules,
    // Normaliza ownerEmail vazio para undefined
    ownerEmail: (formData.get("ownerEmail") as string | null) || undefined,
    document: (formData.get("document") as string | null) || undefined,
  };

  const parsed = createCompanySchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, slug, plan, document, modules, ownerEmail } = parsed.data;

  // Nota: estas etapas não são atômicas. Em caso de falha parcial,
  // a empresa pode existir sem módulos ou roles. Mitigação futura: stored procedure transacional.

  // 4. Insere a empresa
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name,
      slug,
      plan,
      document: document ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (companyError) {
    if (companyError.message.includes("slug")) {
      return { ok: false, message: "Já existe uma empresa com este slug" };
    }
    return { ok: false, message: companyError.message };
  }

  const companyId = company.id;

  // 5. Insere módulos habilitados
  const { error: modulesError } = await supabase.from("company_modules").insert(
    modules.map((moduleCode) => ({
      company_id: companyId,
      module_code: moduleCode,
      enabled_by: user.id,
    })),
  );

  if (modulesError) return { ok: false, message: modulesError.message };

  // 6. Inicializa RBAC da empresa (roles padrão)
  const { error: rbacError } = await supabase.rpc("bootstrap_company_rbac", {
    p_company: companyId,
  });
  if (rbacError) return { ok: false, message: rbacError.message };

  // 7. Convida owner por e-mail (opcional)
  if (ownerEmail && env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createAdminClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Convida o usuário via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      ownerEmail,
      {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    );

    if (!inviteError && inviteData.user) {
      const invitedUserId = inviteData.user.id;

      // Cria membership como owner
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          company_id: companyId,
          user_id: invitedUserId,
          is_owner: true,
          status: "invited",
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!membershipError && membership) {
        // Busca role 'owner' da empresa
        const { data: ownerRole } = await supabase
          .from("roles")
          .select("id")
          .eq("company_id", companyId)
          .eq("code", "owner")
          .maybeSingle();

        if (ownerRole) {
          await supabase.from("membership_roles").insert({
            membership_id: membership.id,
            role_id: ownerRole.id,
            assigned_by: user.id,
          });
        }
      }
    }
  }

  // 8. Registra audit log
  await audit({
    companyId: company.id,
    action: "company.create",
    resourceType: "company",
    resourceId: company.id,
    status: "success",
    metadata: { ownerEmail },
  });

  revalidatePath("/admin/companies");
  return { ok: true, message: `Empresa "${name}" criada com sucesso` };
}
