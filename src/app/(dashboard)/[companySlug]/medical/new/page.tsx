import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function NewPatientPage({ params }: Props) {
  const { companySlug } = await params;
  await resolveCompany(companySlug);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo paciente</h1>
          <p className="text-sm text-muted-foreground">Cadastro clínico básico</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/medical`}>Voltar</Link>
        </Button>
      </header>
      <div className="rounded-lg border p-6">
        <PatientForm />
      </div>
    </section>
  );
}
