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
      try {
        await audit({
          companyId: ctx.companyId,
          action,
          permission,
          status: "success",
          metadata: { userId: ctx.userId },
        });
      } catch (auditErr) {
        console.error("[audit] falha ao registrar log de sucesso:", auditErr);
      }
      return result;
    } catch (e) {
      // Re-throw Next.js internal errors (redirect, notFound) sem auditar como erro
      if (
        e instanceof Error &&
        "digest" in e &&
        typeof (e as { digest: unknown }).digest === "string" &&
        ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
          (e as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
      ) {
        throw e;
      }
      const status = e instanceof ForbiddenError ? "denied" : "error";
      try {
        await audit({
          companyId: ctx.companyId,
          action,
          permission,
          status,
          metadata: { userId: ctx.userId },
        });
      } catch (auditErr) {
        console.error("[audit] falha ao registrar log de erro:", auditErr);
      }
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
