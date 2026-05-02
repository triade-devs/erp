import { describe, expect, it } from "vitest";
import {
  consentTemplateSchema,
  patientAssignmentSchema,
  patientSchema,
  prescriptionSchema,
} from "./index";

describe("medical-records schemas", () => {
  it("valida cadastro clínico básico de paciente", () => {
    const parsed = patientSchema.parse({
      fullName: "Maria Silva",
      document: "123.456.789-00",
      birthDate: "1980-01-10",
      sex: "female",
      email: "maria@example.com",
    });

    expect(parsed.fullName).toBe("Maria Silva");
    expect(parsed.sex).toBe("female");
  });

  it("rejeita vínculo sem paciente válido", () => {
    const parsed = patientAssignmentSchema.safeParse({
      patientId: "x",
      membershipId: "00000000-0000-0000-0000-000000000000",
    });

    expect(parsed.success).toBe(false);
  });

  it("exige pelo menos um item de prescrição", () => {
    const parsed = prescriptionSchema.safeParse({
      patientId: "00000000-0000-0000-0000-000000000000",
      items: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("versiona termo com texto mínimo", () => {
    const parsed = consentTemplateSchema.safeParse({
      title: "Consentimento de atendimento",
      body: "Declaro ciência e consentimento para atendimento clínico.",
    });

    expect(parsed.success).toBe(true);
  });
});
