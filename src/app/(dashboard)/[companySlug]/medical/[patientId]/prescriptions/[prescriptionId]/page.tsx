import { notFound } from "next/navigation";
import {
  getPatientRecord,
  getPrescription,
  PatientRecordNav,
  PrescriptionForm,
  updatePrescriptionAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; prescriptionId: string }>;
};

export default async function PrescriptionDetailPage({ params }: Props) {
  const { companySlug, patientId, prescriptionId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient, timeline }, prescription] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getPrescription(company.id, prescriptionId),
  ]);

  if (prescription.patient_id !== patientId) notFound();

  const action = updatePrescriptionAction.bind(null, prescriptionId);
  const detailLabel = new Date(prescription.issued_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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
        detailLabel={detailLabel}
      />
      <div>
        <h2 className="text-xl font-semibold">Editar prescrição</h2>
        <p className="text-sm text-muted-foreground">
          Atualize medicamentos, dose, frequência e orientações
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <PrescriptionForm patientId={patientId} prescription={prescription} action={action} />
      </div>
    </section>
  );
}
