import "server-only";
import type { ActionResult } from "@/lib/errors";
import { requirePermission, ForbiddenError } from "./authz-service";

export type ActionCtx = { companyId: string; userId: string };

export function withPermission<T>(
  permission: string,
  _action: string,
  handler: (ctx: ActionCtx, formData: FormData) => Promise<T>,
) {
  return async function guarded(ctx: ActionCtx, formData: FormData): Promise<T | ActionResult> {
    try {
      await requirePermission(ctx.companyId, permission);
      return await handler(ctx, formData);
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
