import { z } from "zod";
import type { AnestesiaSession } from "../types";
import { fichaAnestesiaSchema } from "../schemas/ficha-anestesia";
import { preAvaliacaoSchema } from "../schemas/pre-avaliacao";
import { buildSessionId, normalizeTimelineValues, syncVitalsWithStartHour } from "./session";

export const LS_KEY = "erp:anestesia:sessions";
export const ACTIVE_SESSION_KEY = "erp:anestesia:active-session";

const anestesiaSessionSchema = z.object({
  id: z.string(),
  paciente: z.string(),
  data: z.string(),
  preAvaliacao: preAvaliacaoSchema,
  fichaAnestesia: fichaAnestesiaSchema,
  criadaEm: z.string(),
  atualizadaEm: z.string(),
});

const anestesiaSessionsSchema = z.array(anestesiaSessionSchema);

type StorageLike = Pick<Storage, "setItem" | "removeItem">;

export function parseStoredSessions(raw: string | null): AnestesiaSession[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed)
      ? parsed.map((session) => {
          const fichaAnestesia = session?.fichaAnestesia;
          if (!fichaAnestesia || typeof fichaAnestesia !== "object") return session;

          return {
            ...session,
            fichaAnestesia: {
              ...fichaAnestesia,
              vitals: syncVitalsWithStartHour(
                typeof fichaAnestesia.vitalsHoraInicio === "string"
                  ? fichaAnestesia.vitalsHoraInicio
                  : "00:00",
                Array.isArray(fichaAnestesia.vitals) ? fichaAnestesia.vitals : [],
                fichaAnestesia.vitalsInterval === 10 ? 10 : 5,
              ),
              spo2: normalizeTimelineValues(
                Array.isArray(fichaAnestesia.spo2) ? fichaAnestesia.spo2 : [],
              ),
              temp: normalizeTimelineValues(
                Array.isArray(fichaAnestesia.temp) ? fichaAnestesia.temp : [],
              ),
              diurese: normalizeTimelineValues(
                Array.isArray(fichaAnestesia.diurese) ? fichaAnestesia.diurese : [],
              ),
              pvc: normalizeTimelineValues(
                Array.isArray(fichaAnestesia.pvc) ? fichaAnestesia.pvc : [],
              ),
              ritmo: normalizeTimelineValues(
                Array.isArray(fichaAnestesia.ritmo) ? fichaAnestesia.ritmo : [],
              ),
            },
          };
        })
      : parsed;
    const result = anestesiaSessionsSchema.safeParse(normalized);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function hasSessionConflict(
  sessions: AnestesiaSession[],
  paciente: string,
  data: string,
): boolean {
  const nextId = buildSessionId(paciente, data);
  return sessions.some((session) => session.id === nextId);
}

export function persistSessions(
  storage: StorageLike,
  sessions: AnestesiaSession[],
  activeSessionId: string | null,
): { ok: true } | { ok: false; reason: "quota" | "unknown" } {
  try {
    storage.setItem(LS_KEY, JSON.stringify(sessions));
    if (activeSessionId) storage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    else storage.removeItem(ACTIVE_SESSION_KEY);
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unknown" };
  }
}
