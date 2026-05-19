import { ConsultationForm, getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
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
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
      />
      <div>
        <h2 className="text-xl font-semibold">Nova consulta</h2>
        <p className="text-sm text-muted-foreground">Registro clínico e anamnese da consulta</p>
      </div>
      <div className="rounded-lg border p-6">
        <ConsultationForm patientId={patientId} />
      </div>
    </section>
  );
}
