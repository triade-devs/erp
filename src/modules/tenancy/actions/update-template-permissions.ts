"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function updateTemplatePermissionsAction(
  templateCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const requested = (formData.getAll("permission_code") as string[]).filter(Boolean);

  const { data: validPerms } = await supabase.from("permissions").select("code");
  const validSet = new Set((validPerms ?? []).map((p) => p.code));
  const filteredRequested = requested.filter((c) => validSet.has(c));

  const { data: current } = await supabase
    .from("template_permissions")
    .select("permission_code")
    .eq("template_code", templateCode);

  const currentSet = new Set((current ?? []).map((c) => c.permission_code));
  const desiredSet = new Set(filteredRequested);

  const toAdd = filteredRequested.filter((c) => !currentSet.has(c));
  const toRemove = [...currentSet].filter((c) => !desiredSet.has(c));

  if (toRemove.length) {
    const { error: delErr } = await supabase
      .from("template_permissions")
      .delete()
      .eq("template_code", templateCode)
      .in("permission_code", toRemove);
    if (delErr) return { ok: false, message: delErr.message };
  }

  if (toAdd.length) {
    const { error: insErr } = await supabase
      .from("template_permissions")
      .insert(toAdd.map((c) => ({ template_code: templateCode, permission_code: c })));
    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId: null,
    action: "platform.role_template.permissions_update",
    resourceType: "role_template",
    resourceId: templateCode,
    status: "success",
    metadata: { added: toAdd, removed: toRemove },
  });

  revalidatePath(`/admin/platform/role-templates/${templateCode}`);
  return { ok: true, message: "Permissões do template atualizadas" };
}
