import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { listMyRentals, MyRentalsList } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Minhas reservas — ERP" };

type Props = { params: Promise<{ companySlug: string }> };

export default async function MyRentalsPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:rental:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para ver reservas.
        </div>
      );
    }
    throw e;
  }

  const rentals = await listMyRentals(company.id);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas reservas</h1>
          <p className="text-sm text-muted-foreground">
            {rentals.length} {rentals.length === 1 ? "reserva" : "reservas"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/spaces/calendar`}>Voltar ao calendário</Link>
        </Button>
      </header>

      <MyRentalsList rentals={rentals} />
    </section>
  );
}
