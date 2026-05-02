import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/modules/authz";
import { listPatients, PatientTable } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

export const metadata = { title: "Prontuário — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function MedicalPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const rawParams = await searchParams;
  const { data, total, page, totalPages } = await listPatients(company.id, rawParams);
  const basePath = `/${companySlug}/medical`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prontuário — {company.name}</h1>
          <p className="text-sm text-muted-foreground">{total} pacientes na carteira acessível</p>
        </div>
        <Can permission="medical:patient:create">
          <Button asChild>
            <Link href={`${basePath}/new`}>Novo paciente</Link>
          </Button>
        </Can>
      </header>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={rawParams.q ?? ""}
          placeholder="Buscar por nome, documento ou telefone..."
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <PatientTable
        data={data}
        total={total}
        page={page}
        totalPages={totalPages}
        basePath={basePath}
        searchQuery={rawParams.q}
      />
    </section>
  );
}
