import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function ConsentsListPage({ params }: Props) {
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
          <h2 className="text-xl font-semibold">Consentimentos</h2>
          <p className="text-sm text-muted-foreground">
            {counts.consents} consentimento{counts.consents !== 1 ? "s" : ""} registrado
            {counts.consents !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:consent:accept">
          <Button asChild>
            <Link href={`${basePath}/consents/new`}>Novo consentimento</Link>
          </Button>
        </Can>
      </header>

      {timeline.consents.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhum consentimento registrado.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.consents.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/consents/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {item.template_title} v{item.template_version}
                </p>
                <p className="text-sm text-muted-foreground">
                  Aceito em {new Date(item.accepted_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
