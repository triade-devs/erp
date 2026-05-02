import type { PrescriptionInput } from "../schemas";

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
