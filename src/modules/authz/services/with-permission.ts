import "server-only";
import type { ActionResult } from "@/lib/errors";
import { requirePermission, ForbiddenError } from "./authz-service";
import { audit } from "@/modules/audit";

export type ActionCtx = { companyId: string; userId: string };

export function withPermission<T>(
  permission: string,
  action: string,
  handler: (ctx: ActionCtx, formData: FormData) => Promise<T>,
) {
  return async function guarded(ctx: ActionCtx, formData: FormData): Promise<T | ActionResult> {
    try {
      await requirePermission(ctx.companyId, permission);
      const result = await handler(ctx, formData);
      // Auditoria assíncrona — erro não propaga para o usuário
      void audit({
        companyId: ctx.companyId,
        action,
        permission,
        status: "success",
        metadata: { userId: ctx.userId },
      });
      return result;
    } catch (e) {
      const status = e instanceof ForbiddenError ? "denied" : "error";
      void audit({
        companyId: ctx.companyId,
        action,
        permission,
        status,
        metadata: { userId: ctx.userId, error: (e as Error).message },
      });
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
