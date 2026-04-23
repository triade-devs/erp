import "server-only";
import { requirePermission, ForbiddenError } from "./authz-service";

type ActionResult = { ok: true; message?: string } | { ok: false; message?: string };

// HOC que envolve uma Server Action com verificação de permissão + audit logging
export function withPermission<T extends ActionResult>(
  permission: string,
  handler: (companyId: string, formData: FormData) => Promise<T>,
) {
  return async function guarded(companyId: string, formData: FormData): Promise<T | ActionResult> {
    try {
      await requirePermission(companyId, permission);
      return await handler(companyId, formData);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return {
          ok: false,
          message: "Acesso negado: permissão insuficiente",
        } satisfies ActionResult;
      }
      throw e;
    }
  };
}
