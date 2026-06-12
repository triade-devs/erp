import Link from "next/link";
import { notFound } from "next/navigation";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError, Can } from "@/modules/authz";
import { getOccupancy, listSpaces, SpaceCalendar, RequestRentalDialog } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Calendário de Espaços — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

function parseMonth(raw?: string): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(d.getTime())) return startOfMonth(d);
  }
  return startOfMonth(new Date());
}

export default async function SpacesCalendarPage({ params, searchParams }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:space:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para ver o calendário.
        </div>
      );
    }
    throw e;
  }

  const raw = await searchParams;
  const month = parseMonth(raw.month);
  const rangeFrom = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const rangeTo = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

  const occupancy = await getOccupancy(company.id, { from: rangeFrom, to: rangeTo });
  const spacesPage = await listSpaces(company.id, { onlyActive: true, page: 1, pageSize: 100 });

  const basePath = `/${companySlug}/spaces`;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendário geral — {company.name}</h1>
          <p className="text-sm text-muted-foreground">Ocupação de todos os espaços</p>
        </div>
        <div className="flex gap-2">
          <Can permission="spaces:rental:request">
            <RequestRentalDialog
              spaces={spacesPage.data.map((s) => ({
                id: s.id,
                name: s.name,
                bookingMode: s.booking_mode,
              }))}
            />
          </Can>
          <Button asChild variant="outline">
            <Link href={basePath}>Voltar aos espaços</Link>
          </Button>
        </div>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <SpaceCalendar
          month={month}
          rentals={occupancy}
          basePath={`${basePath}/calendar`}
          showSpace
        />
      </div>
    </section>
  );
}
