import { describe, expect, it } from "vitest";
import {
  buildConsentVersion,
  compactPrescriptionItems,
  normalizeDocument,
} from "../clinical-service";

describe("clinical-service", () => {
  it("normaliza documento removendo pontuação", () => {
    expect(normalizeDocument("123.456.789-00")).toBe("12345678900");
  });

  it("calcula próxima versão de termo", () => {
    expect(buildConsentVersion(null)).toBe(1);
    expect(buildConsentVersion(3)).toBe(4);
  });

  it("compacta itens de prescrição com posição", () => {
    const items = compactPrescriptionItems([
      { medication: " Dipirona ", dosage: "500mg" },
      { medication: "Ibuprofeno" },
    ]);

    expect(items[0]).toMatchObject({ medication: "Dipirona", position: 0 });
    expect(items[1]).toMatchObject({ medication: "Ibuprofeno", position: 1 });
  });
});
