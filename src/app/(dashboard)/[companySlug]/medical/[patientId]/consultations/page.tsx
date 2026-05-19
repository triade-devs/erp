import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function ConsultationsListPage({ params }: Props) {
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
          <h2 className="text-xl font-semibold">Consultas</h2>
          <p className="text-sm text-muted-foreground">
            {counts.consultations} consulta{counts.consultations !== 1 ? "s" : ""} registrada
            {counts.consultations !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:consultation:write">
          <Button asChild>
            <Link href={`${basePath}/consultations/new`}>Nova consulta</Link>
          </Button>
        </Can>
      </header>

      {timeline.consultations.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhuma consulta registrada.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.consultations.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/consultations/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {new Date(item.consultation_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.chief_complaint ?? "Sem queixa registrada"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
