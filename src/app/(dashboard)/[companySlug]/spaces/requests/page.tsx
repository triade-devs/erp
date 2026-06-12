import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { listPendingRequests, PendingRequestCard } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Solicitações de Reserva — ERP" };

type Props = { params: Promise<{ companySlug: string }> };

export default async function SpaceRequestsPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:rental:approve");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para aprovar solicitações.
        </div>
      );
    }
    throw e;
  }

  const batches = await listPendingRequests(company.id);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Solicitações de reserva</h1>
          <p className="text-sm text-muted-foreground">
            {batches.length}{" "}
            {batches.length === 1 ? "solicitação pendente" : "solicitações pendentes"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/spaces`}>Voltar aos espaços</Link>
        </Button>
      </header>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
      ) : (
        <div className="space-y-4">
          {batches.map((b) => (
            <PendingRequestCard key={b.batchId} batch={b} />
          ))}
        </div>
      )}
    </section>
  );
}
