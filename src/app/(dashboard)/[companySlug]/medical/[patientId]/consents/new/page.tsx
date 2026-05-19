import {
  ConsentAcceptForm,
  ConsentTemplateForm,
  getPatientRecord,
  listConsentTemplates,
  PatientRecordNav,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function NewConsentPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const [{ patient }, templates] = await Promise.all([
    getPatientRecord(company.id, patientId),
    listConsentTemplates(company.id),
  ]);

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
      />
      <div>
        <h2 className="text-xl font-semibold">Consentimentos</h2>
        <p className="text-sm text-muted-foreground">Modelos versionados e aceite do paciente</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Registrar aceite</h2>
          <ConsentAcceptForm patientId={patientId} templates={templates} />
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Novo modelo</h2>
          <ConsentTemplateForm />
        </div>
      </div>
    </section>
  );
}
