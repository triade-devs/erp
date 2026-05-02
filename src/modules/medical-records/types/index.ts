import type { Database } from "@/types/database.types";

export type MedicalPatient = Database["public"]["Tables"]["medical_patients"]["Row"];
export type MedicalPatientAssignment =
  Database["public"]["Tables"]["medical_patient_assignments"]["Row"];
export type MedicalConsultation = Database["public"]["Tables"]["medical_consultations"]["Row"];
export type MedicalAnamnesis = Database["public"]["Tables"]["medical_anamneses"]["Row"];
export type MedicalPrescription = Database["public"]["Tables"]["medical_prescriptions"]["Row"];
export type MedicalPrescriptionItem =
  Database["public"]["Tables"]["medical_prescription_items"]["Row"];
export type MedicalConsentTemplate =
  Database["public"]["Tables"]["medical_consent_templates"]["Row"];
export type MedicalPatientConsent = Database["public"]["Tables"]["medical_patient_consents"]["Row"];

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PatientTimeline = {
  consultations: MedicalConsultation[];
  prescriptions: (MedicalPrescription & {
    medical_prescription_items?: MedicalPrescriptionItem[];
  })[];
  consents: MedicalPatientConsent[];
  assignments: (MedicalPatientAssignment & {
    memberships?: { user_id: string; profiles?: { full_name: string | null } | null } | null;
  })[];
};
