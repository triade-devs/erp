import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ModulePermission = Tables<"permissions">;
export type ModuleWithPermissions = Tables<"modules"> & { permissions: ModulePermission[] };

/**
 * Retorna um módulo específico com todas as suas permissões associadas.
 * Usado pela interface administrativa para visualizar/editar permissões de um módulo.
 */
export async function getModuleWithPermissions(
  code: string,
): Promise<ModuleWithPermissions | null> {
  const supabase = await createClient();

  const [{ data: module, error: modErr }, { data: permissions, error: permErr }] =
    await Promise.all([
      supabase.from("modules").select("*").eq("code", code).maybeSingle(),
      supabase
        .from("permissions")
        .select("*")
        .eq("module_code", code)
        .order("resource")
        .order("action"),
    ]);

  if (modErr) throw modErr;
  if (permErr) throw permErr;
  if (!module) return null;

  return { ...module, permissions: permissions ?? [] };
}
