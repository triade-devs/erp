import { notFound } from "next/navigation";
import {
  ConsultationForm,
  getConsultation,
  getPatientRecord,
  PatientRecordNav,
  updateConsultationAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; consultationId: string }>;
};

export default async function ConsultationDetailPage({ params }: Props) {
  const { companySlug, patientId, consultationId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient }, consultation] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getConsultation(company.id, consultationId),
  ]);

  if (consultation.patient_id !== patientId) notFound();

  const action = updateConsultationAction.bind(null, consultationId);

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
        <h2 className="text-xl font-semibold">Editar consulta</h2>
        <p className="text-sm text-muted-foreground">Atualize o registro clínico da consulta</p>
      </div>
      <div className="rounded-lg border p-6">
        <ConsultationForm patientId={patientId} consultation={consultation} action={action} />
      </div>
    </section>
  );
}
