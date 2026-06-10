import { describe, it, expect } from "vitest";
import { formatPriceDisplay, parsePriceToDecimal } from "../price-formatter";

describe("formatPriceDisplay", () => {
  it("inteiro sem separador vira X,00", () => {
    expect(formatPriceDisplay("15")).toBe("15,00");
  });
  it("milhar inteiro recebe ponto de milhar e ,00", () => {
    expect(formatPriceDisplay("1000")).toBe("1.000,00");
  });
  it("vírgula preserva centavos", () => {
    expect(formatPriceDisplay("15,01")).toBe("15,01");
  });
  it("ponto digitado é tratado como decimal", () => {
    expect(formatPriceDisplay("1500.50")).toBe("1.500,50");
  });
  it("string vazia vira 0,00", () => {
    expect(formatPriceDisplay("")).toBe("0,00");
  });
});

describe("parsePriceToDecimal", () => {
  it("converte exibição BR para decimal SQL", () => {
    expect(parsePriceToDecimal("1.000,00")).toBe("1000.00");
    expect(parsePriceToDecimal("15,01")).toBe("15.01");
    expect(parsePriceToDecimal("15,00")).toBe("15.00");
  });
});
