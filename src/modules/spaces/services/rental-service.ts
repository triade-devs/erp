import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RentalInput } from "../schemas";
import type { RentalKind, SpaceRental } from "../types";

export class RentalOverlapError extends Error {
  constructor() {
    super("Já existe um aluguel para este espaço no período selecionado");
    this.name = "RentalOverlapError";
  }
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Normaliza o período de uma reserva conforme o tipo:
 * - `daily`: ocupa dias inteiros. Início vira 00:00 do dia inicial e fim vira
 *   00:00 do dia seguinte ao dia final (intervalo semiaberto `[início, fim)`),
 *   garantindo que o último dia escolhido fique reservado.
 * - `hourly`: usa os horários exatos informados.
 */
export function normalizeRentalPeriod(
  kind: RentalKind,
  startsAt: Date,
  endsAt: Date,
): { startsAt: Date; endsAt: Date } {
  if (kind === "daily") {
    return { startsAt: startOfDay(startsAt), endsAt: addDays(startOfDay(endsAt), 1) };
  }
  return { startsAt, endsAt };
}

/**
 * Pré-checagem de conflito (UX). A verdade final é o exclusion constraint
 * `space_rentals_no_overlap` no banco — nunca confie só nesta verificação.
 * Recebe os aluguéis confirmados já existentes do espaço no intervalo consultado.
 */
export function hasOverlap(
  candidate: { startsAt: Date; endsAt: Date },
  existing: Pick<SpaceRental, "starts_at" | "ends_at">[],
): boolean {
  const cs = candidate.startsAt.getTime();
  const ce = candidate.endsAt.getTime();
  return existing.some((r) => {
    const rs = new Date(r.starts_at).getTime();
    const re = new Date(r.ends_at).getTime();
    // Sobreposição de intervalos semiabertos [s, e)
    return cs < re && rs < ce;
  });
}

/**
 * Texto legível do período de um aluguel. Para diárias, o `ends_at` é
 * exclusivo (00:00 do dia seguinte), então mostramos o último dia ocupado.
 */
export function formatRentalPeriod(kind: RentalKind, startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (kind === "daily") {
    const lastDay = addDays(end, -1);
    const startStr = format(start, "dd/MM/yyyy", { locale: ptBR });
    const endStr = format(lastDay, "dd/MM/yyyy", { locale: ptBR });
    return startStr === endStr ? startStr : `${startStr} — ${endStr}`;
  }
  return `${format(start, "dd/MM/yyyy HH:mm", { locale: ptBR })} — ${format(end, "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
}

export function validateNoOverlap(
  input: Pick<RentalInput, "bookingKind" | "startsAt" | "endsAt">,
  existing: Pick<SpaceRental, "starts_at" | "ends_at">[],
): { startsAt: Date; endsAt: Date } {
  const period = normalizeRentalPeriod(input.bookingKind, input.startsAt, input.endsAt);
  if (hasOverlap(period, existing)) throw new RentalOverlapError();
  return period;
}
