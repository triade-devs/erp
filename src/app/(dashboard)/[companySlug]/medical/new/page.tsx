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
      <div>
        <h2 className="text-xl font-semibold">Novo paciente</h2>
        <p className="text-sm text-muted-foreground">Cadastro clínico básico</p>
      </div>
      <div className="rounded-lg border p-6">
        <PatientForm />
      </div>
    </section>
  );
}
