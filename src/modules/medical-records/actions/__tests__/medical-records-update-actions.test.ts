import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../helpers", () => ({
  getMedicalActionContext: vi.fn(),
  ensurePatientAccess: vi.fn(),
}));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));

import { updateConsultationAction } from "../update-consultation";
import { updatePrescriptionAction } from "../update-prescription";
import { updateConsentTemplateAction } from "../update-consent-template";

describe("medical-records update actions", () => {
  it("retorna fieldErrors ao validar atualização de consulta", async () => {
    const result = await updateConsultationAction(
      "11111111-1111-1111-1111-111111111111",
      { ok: false },
      new FormData(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toBeDefined();
  });

  it("retorna fieldErrors ao validar atualização de prescrição", async () => {
    const result = await updatePrescriptionAction(
      "22222222-2222-2222-2222-222222222222",
      { ok: false },
      new FormData(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toBeDefined();
  });

  it("retorna fieldErrors ao validar atualização de template de consentimento", async () => {
    const result = await updateConsentTemplateAction(
      "33333333-3333-3333-3333-333333333333",
      { ok: false },
      new FormData(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toBeDefined();
  });
});
