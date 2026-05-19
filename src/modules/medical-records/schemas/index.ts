import { z } from "zod";

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((value) => (value ? value : undefined));

export const patientSchema = z.object({
  fullName: z.string().trim().min(2, "Nome obrigatório").max(160, "Máximo 160 caracteres"),
  document: optionalText(32),
  birthDate: optionalText(10),
  sex: z.enum(["female", "male", "other", "unknown"]).default("unknown"),
  phone: optionalText(32),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: optionalText(500),
  emergencyContactName: optionalText(160),
  emergencyContactPhone: optionalText(32),
  notes: optionalText(4000),
});

export const patientAssignmentSchema = z.object({
  patientId: z.string().uuid("Paciente inválido"),
  membershipId: z.string().uuid("Membro inválido"),
  relationship: z
    .enum(["primary_physician", "physician", "nursing", "assistant", "therapist", "other"])
    .default("physician"),
  isPrimary: z.coerce.boolean().default(false),
  notes: optionalText(500),
});

export const consultationSchema = z.object({
  patientId: z.string().uuid("Paciente inválido"),
  consultationAt: z.string().min(1, "Informe a data da consulta"),
  chiefComplaint: optionalText(2000),
  clinicalEvolution: optionalText(6000),
  diagnosisText: optionalText(2000),
  conduct: optionalText(4000),
  notes: optionalText(4000),
  anamnesisSummary: optionalText(6000),
});

export const prescriptionItemSchema = z.object({
  medication: z.string().trim().min(2, "Medicamento obrigatório").max(200),
  dosage: optionalText(120),
  route: optionalText(80),
  frequency: optionalText(120),
  duration: optionalText(120),
  quantity: optionalText(80),
  instructions: optionalText(1000),
});

export const prescriptionSchema = z.object({
  patientId: z.string().uuid("Paciente inválido"),
  consultationId: z.string().uuid().optional(),
  generalInstructions: optionalText(2000),
  items: z.array(prescriptionItemSchema).min(1, "Inclua pelo menos um item"),
});

export const consentTemplateSchema = z.object({
  title: z.string().trim().min(3, "Título obrigatório").max(160),
  body: z.string().trim().min(20, "Texto do termo muito curto").max(20000),
});

export const consentAcceptSchema = z.object({
  patientId: z.string().uuid("Paciente inválido"),
  templateId: z.string().uuid("Termo inválido"),
  notes: optionalText(1000),
});

export const listPatientsSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeArchived: z.coerce.boolean().default(false),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type PatientAssignmentInput = z.infer<typeof patientAssignmentSchema>;
export type ConsultationInput = z.infer<typeof consultationSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type ConsentTemplateInput = z.infer<typeof consentTemplateSchema>;
export type ConsentAcceptInput = z.infer<typeof consentAcceptSchema>;
