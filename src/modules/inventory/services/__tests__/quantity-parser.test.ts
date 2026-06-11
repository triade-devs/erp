import { describe, it, expect } from "vitest";
import { unitFromQuantity } from "../quantity-parser";

describe("unitFromQuantity", () => {
  it("gramas → KG", () => expect(unitFromQuantity("395 g")).toBe("KG"));
  it("quilos → KG", () => expect(unitFromQuantity("1 kg")).toBe("KG"));
  it("litros → L", () => expect(unitFromQuantity("1 L")).toBe("L"));
  it("mililitros → L", () => expect(unitFromQuantity("500 ml")).toBe("L"));
  it("multipack → CX", () => expect(unitFromQuantity("6 x 1 L")).toBe("CX"));
  it("vazio → UN", () => expect(unitFromQuantity("")).toBe("UN"));
  it("desconhecido → UN", () => expect(unitFromQuantity("12 unidades")).toBe("UN"));
});
