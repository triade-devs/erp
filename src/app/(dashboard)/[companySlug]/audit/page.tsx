import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { listAuditLogs, AuditLogTable } from "@/modules/audit";
import { AppError } from "@/lib/errors";

export default async function AuditPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "core:audit:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para ver os logs de auditoria.
        </div>
      );
    }
    throw e;
  }

  const logs = await listAuditLogs(company.id);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Logs de Auditoria — {company.name}</h1>
      <AuditLogTable logs={logs} />
    </section>
  );
}
