import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConsent, getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; consentId: string }>;
};

export default async function ConsentDetailPage({ params }: Props) {
  const { companySlug, patientId, consentId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient, timeline }, consent] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getConsent(company.id, consentId),
  ]);

  if (consent.patient_id !== patientId) notFound();

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel={`${consent.template_title} v${consent.template_version}`}
      />
      <div>
        <h2 className="text-xl font-semibold">Consentimento registrado</h2>
        <p className="text-sm text-muted-foreground">Registro imutável do aceite do paciente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {consent.template_title} v{consent.template_version}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aceito em {new Date(consent.accepted_at).toLocaleString("pt-BR")}
          </p>
          {consent.notes ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Observações</p>
              <p className="text-sm text-muted-foreground">{consent.notes}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm font-medium">Conteúdo aceito</p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-4 text-sm">
              {consent.accepted_body}
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
