import type { PrescriptionInput } from "../schemas";

export type PrescriptionFormItem = {
  medication: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
};

export function normalizeDocument(value?: string): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^\dA-Za-z]/g, "").toUpperCase();
  return normalized || null;
}

export function buildConsentVersion(currentMaxVersion?: number | null): number {
  return (currentMaxVersion ?? 0) + 1;
}

export function compactPrescriptionItems(items: PrescriptionInput["items"]) {
  return items.map((item, index) => ({
    ...item,
    medication: item.medication.trim(),
    position: index,
  }));
}

export function extractAnamnesisSummary(anamneses?: Array<Record<string, unknown>> | null): string {
  if (!anamneses?.length) return "";

  const firstWithSummary = anamneses.find(
    (anamnesis) => typeof anamnesis.summary === "string" && anamnesis.summary.trim().length > 0,
  );

  if (!firstWithSummary) return "";
  return String(firstWithSummary.summary);
}

export function mapPrescriptionItemsToFormItems(
  items?: PrescriptionFormItem[] | null,
): PrescriptionFormItem[] {
  if (!items?.length) return [{ medication: "" }];

  return items.map((item) => ({
    medication: item.medication,
    dosage: item.dosage ?? undefined,
    route: item.route ?? undefined,
    frequency: item.frequency ?? undefined,
    duration: item.duration ?? undefined,
    quantity: item.quantity ?? undefined,
    instructions: item.instructions ?? undefined,
  }));
}
