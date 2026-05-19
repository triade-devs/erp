import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function PrescriptionsListPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);
  const basePath = `/${companySlug}/medical/${patientId}`;

  const counts = {
    consultations: timeline.consultations.length,
    prescriptions: timeline.prescriptions.length,
    consents: timeline.consents.length,
  };

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={counts}
      />

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Prescrições</h2>
          <p className="text-sm text-muted-foreground">
            {counts.prescriptions} prescrição{counts.prescriptions !== 1 ? "ões" : ""} registrada
            {counts.prescriptions !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:prescription:write">
          <Button asChild>
            <Link href={`${basePath}/prescriptions/new`}>Nova prescrição</Link>
          </Button>
        </Can>
      </header>

      {timeline.prescriptions.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhuma prescrição registrada.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.prescriptions.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/prescriptions/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {new Date(item.issued_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(item.medical_prescription_items ?? []).length} item
                  {(item.medical_prescription_items ?? []).length !== 1 ? "ns" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
