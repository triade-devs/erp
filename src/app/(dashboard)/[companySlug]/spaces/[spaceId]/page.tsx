import Link from "next/link";
import { notFound } from "next/navigation";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveCompany, listCompanyMembers } from "@/modules/tenancy";
import { requirePermission, ForbiddenError, hasPermission, Can } from "@/modules/authz";
import { getCurrentUser } from "@/modules/auth";
import {
  getSpace,
  getOccupancy,
  listRentals,
  SpaceCalendar,
  RentalForm,
  RentalTable,
} from "@/modules/spaces";
import { formatCurrency } from "@/lib/utils";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Gestão de Espaço — ERP" };

type Props = {
  params: Promise<{ companySlug: string; spaceId: string }>;
  searchParams: Promise<Record<string, string>>;
};

function parseMonth(raw?: string): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(d.getTime())) return startOfMonth(d);
  }
  return startOfMonth(new Date());
}

export default async function SpaceManagePage({ params, searchParams }: Props) {
  const { companySlug, spaceId } = await params;

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
          Acesso negado: você não tem permissão para ver este espaço.
        </div>
      );
    }
    throw e;
  }

  const space = await getSpace(company.id, spaceId);
  if (!space) notFound();

  const raw = await searchParams;
  const month = parseMonth(raw.month);
  const rangeFrom = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const rangeTo = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

  const [occupancy, rentalsPage, members, currentUser, canCancelAny] = await Promise.all([
    getOccupancy(company.id, { from: rangeFrom, to: rangeTo }, spaceId),
    listRentals(company.id, { spaceId, includeCancelled: true, pageSize: 50 }),
    listCompanyMembers(company.id),
    getCurrentUser(),
    hasPermission(company.id, "spaces:rental:cancel"),
  ]);

  const memberOptions = members
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.userId, full_name: m.fullName }));

  const basePath = `/${companySlug}/spaces`;
  const managePath = `${basePath}/${spaceId}`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{space.name}</h1>
            {!space.is_active && <Badge variant="outline">Inativo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {space.location ? `${space.location} · ` : ""}
            Valor padrão: {space.default_price > 0 ? formatCurrency(space.default_price) : "Grátis"}
          </p>
          {space.description && (
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">{space.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={basePath}>Voltar</Link>
          </Button>
          <Can permission="spaces:space:manage">
            <Button asChild variant="outline">
              <Link href={`${managePath}/edit`}>Editar espaço</Link>
            </Button>
          </Can>
        </div>
      </header>

      <Can permission="spaces:rental:create">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-medium">Novo aluguel</h2>
          {space.is_active ? (
            <RentalForm
              spaceId={space.id}
              bookingMode={space.booking_mode}
              defaultPrice={space.default_price}
              members={memberOptions}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Este espaço está inativo e não pode receber novos aluguéis.
            </p>
          )}
        </div>
      </Can>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Calendário de ocupação</h2>
        <SpaceCalendar month={month} rentals={occupancy} basePath={managePath} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Aluguéis</h2>
        <RentalTable
          rentals={rentalsPage.data}
          canCancelAny={canCancelAny}
          currentUserId={currentUser?.id}
        />
      </div>
    </section>
  );
}
