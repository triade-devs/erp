import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsultationForm, getPatientRecord } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function NewConsultationPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient } = await getPatientRecord(company.id, patientId);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nova consulta</h1>
          <p className="text-sm text-muted-foreground">{patient.full_name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/medical/${patientId}`}>Voltar</Link>
        </Button>
      </header>
      <div className="rounded-lg border p-6">
        <ConsultationForm patientId={patientId} />
      </div>
    </section>
  );
}
