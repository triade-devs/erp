import { describe, expect, it } from "vitest";
import { validateRequestSlots, RentalSlotError } from "../rental-service";

const d = (s: string) => new Date(s);

describe("validateRequestSlots", () => {
  it("normaliza e aceita slots hourly válidos sem conflito", () => {
    const out = validateRequestSlots(
      "hourly",
      [
        { startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") },
        { startsAt: d("2026-07-08T10:00:00"), endsAt: d("2026-07-08T12:00:00") },
      ],
      [],
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.startsAt.getHours()).toBe(10);
  });

  it("normaliza daily para dias inteiros (fim exclusivo no dia seguinte)", () => {
    const out = validateRequestSlots(
      "daily",
      [{ startsAt: d("2026-07-01T15:30:00"), endsAt: d("2026-07-01T15:30:00") }],
      [],
    );
    expect(out[0]?.startsAt.getHours()).toBe(0);
    expect(out[0]?.endsAt.getDate()).toBe(2);
  });

  it("rejeita slot com término antes do início", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [{ startsAt: d("2026-07-01T12:00:00"), endsAt: d("2026-07-01T10:00:00") }],
        [],
      ),
    ).toThrow(RentalSlotError);
  });

  it("rejeita sobreposição entre os próprios slots do pedido", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [
          { startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") },
          { startsAt: d("2026-07-01T11:00:00"), endsAt: d("2026-07-01T13:00:00") },
        ],
        [],
      ),
    ).toThrow(/se sobrepõem/);
  });

  it("rejeita conflito com reserva existente (pending ou confirmed)", () => {
    expect(() =>
      validateRequestSlots(
        "hourly",
        [{ startsAt: d("2026-07-01T10:00:00"), endsAt: d("2026-07-01T12:00:00") }],
        [{ starts_at: "2026-07-01T11:00:00", ends_at: "2026-07-01T13:00:00" }],
      ),
    ).toThrow(/já existe/i);
  });
});
