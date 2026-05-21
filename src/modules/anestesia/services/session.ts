import type {
  AnestesiaSession,
  FichaAnestesiaData,
  PreAvaliacaoData,
  VitalsTimeSlot,
} from "../types";
import { defaultFichaAnestesia, defaultPreAvaliacao } from "../types/defaults";

const VITALS_SLOTS_COUNT = 12;
const DEFAULT_VITALS_INTERVAL: VitalsInterval = 5;

export type VitalsInterval = 5 | 10;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseTimeToDate(time: string, reference = new Date()): Date {
  const [hours = "0", minutes = "0"] = time.split(":");
  const next = new Date(reference);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return next;
}

export function roundToInterval(
  date: Date,
  interval: VitalsInterval = DEFAULT_VITALS_INTERVAL,
): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  rounded.setMinutes(minutes - (minutes % interval), 0, 0);
  return rounded;
}

/** @deprecated Use roundToInterval */
export const roundToQuarterHour = (date: Date) => roundToInterval(date, 5);

export function buildVitalsSlots(
  startAt = new Date(),
  interval: VitalsInterval = DEFAULT_VITALS_INTERVAL,
): VitalsTimeSlot[] {
  const start = roundToInterval(startAt, interval);
  return Array.from({ length: VITALS_SLOTS_COUNT }, (_, index) => {
    const slotDate = new Date(start);
    slotDate.setMinutes(start.getMinutes() + index * interval);

    return {
      hora: formatTime(slotDate),
      pasSis: "",
      paDia: "",
      pam: "",
      fc: "",
      fr: "",
    };
  });
}

export function buildTimeLabels(
  startTime: string,
  interval: VitalsInterval = DEFAULT_VITALS_INTERVAL,
): string[] {
  const start = parseTimeToDate(startTime);
  return Array.from({ length: VITALS_SLOTS_COUNT }, (_, index) => {
    const slotDate = new Date(start);
    slotDate.setMinutes(start.getMinutes() + index * interval);
    return formatTime(slotDate);
  });
}

export function syncVitalsWithStartHour(
  startTime: string,
  vitals: VitalsTimeSlot[],
  interval: VitalsInterval = DEFAULT_VITALS_INTERVAL,
): VitalsTimeSlot[] {
  const labels = buildTimeLabels(startTime, interval);
  return labels.map((hora, index) => ({
    hora,
    pasSis: vitals[index]?.pasSis ?? "",
    paDia: vitals[index]?.paDia ?? "",
    pam: vitals[index]?.pam ?? "",
    fc: vitals[index]?.fc ?? "",
    fr: vitals[index]?.fr ?? "",
  }));
}

export function getVitalsChartY(value: number, min = 20, max = 220, height = 350): number {
  const clamped = Math.min(max, Math.max(min, value));
  return ((max - clamped) / (max - min)) * height;
}

export function normalizeTimelineValues(values: string[], length = VITALS_SLOTS_COUNT): string[] {
  return Array.from({ length }, (_, index) => values[index] ?? "");
}

export function buildVitalsSeriesPath(
  values: Array<number | null>,
  colWidth: number,
  min = 20,
  max = 220,
  height = 350,
): string {
  let previousWasGap = true;

  return values.reduce((path, value, index) => {
    if (value === null) {
      previousWasGap = true;
      return path;
    }

    const command = previousWasGap ? "M" : "L";
    previousWasGap = false;
    const x = (index + 0.5) * colWidth;
    return `${path}${path ? " " : ""}${command}${x},${getVitalsChartY(value, min, max, height)}`;
  }, "");
}

export function normalizeAsaStatus(asa?: string): FichaAnestesiaData["asaStatus"] {
  if (!asa) return "";
  return asa.replace(/^ASA\s+/i, "") as FichaAnestesiaData["asaStatus"];
}

export function buildSessionId(paciente: string, data: string): string {
  const slug = paciente
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\wÀ-ÿ-]/g, "_");
  return `${slug || "sessao"}:${data}`;
}

export function createAnestesiaSession({
  paciente,
  data,
  now = new Date(),
}: {
  paciente: string;
  data: string;
  now?: Date;
}): AnestesiaSession {
  const createdAt = now.toISOString();
  const preAvaliacao = defaultPreAvaliacao();
  preAvaliacao.nomePaciente = paciente;

  return {
    id: buildSessionId(paciente, data),
    paciente,
    data,
    preAvaliacao,
    fichaAnestesia: defaultFichaAnestesia({ nomePaciente: paciente }),
    criadaEm: createdAt,
    atualizadaEm: createdAt,
  };
}

export function insertSessionWithLimit(
  sessions: AnestesiaSession[],
  nextSession: AnestesiaSession,
  maxSessions = 50,
): AnestesiaSession[] {
  const withoutSameId = sessions.filter((session) => session.id !== nextSession.id);
  const next = [...withoutSameId, nextSession];
  if (next.length <= maxSessions) return next;

  const sorted = [...next].sort(
    (a, b) => new Date(a.criadaEm).getTime() - new Date(b.criadaEm).getTime(),
  );
  const idsToKeep = new Set(sorted.slice(-maxSessions).map((session) => session.id));
  return next.filter((session) => idsToKeep.has(session.id));
}

export function updateSessionPreAvaliacao(
  session: AnestesiaSession,
  partial: Partial<PreAvaliacaoData>,
  now = new Date(),
): AnestesiaSession {
  const preAvaliacao = { ...session.preAvaliacao, ...partial };
  const fichaAnestesia: FichaAnestesiaData = {
    ...session.fichaAnestesia,
    paciente: partial.nomePaciente ?? session.fichaAnestesia.paciente,
    clinica: partial.clinica ?? session.fichaAnestesia.clinica,
    cirurgia: partial.cirurgiaProposta ?? session.fichaAnestesia.cirurgia,
    asaStatus: partial.asa ? normalizeAsaStatus(partial.asa) : session.fichaAnestesia.asaStatus,
    emergencia: partial.emergencia ?? session.fichaAnestesia.emergencia,
  };

  return {
    ...session,
    paciente: partial.nomePaciente ?? session.paciente,
    preAvaliacao,
    fichaAnestesia,
    atualizadaEm: now.toISOString(),
  };
}

export function updateSessionFichaAnestesia(
  session: AnestesiaSession,
  partial: Partial<FichaAnestesiaData>,
  now = new Date(),
): AnestesiaSession {
  const nextStartTime = partial.vitalsHoraInicio ?? session.fichaAnestesia.vitalsHoraInicio;
  const baseVitals = partial.vitals ?? session.fichaAnestesia.vitals;
  const interval = partial.vitalsInterval ?? session.fichaAnestesia.vitalsInterval;

  return {
    ...session,
    fichaAnestesia: {
      ...session.fichaAnestesia,
      ...partial,
      vitalsHoraInicio: nextStartTime,
      vitals: syncVitalsWithStartHour(nextStartTime, baseVitals, interval),
    },
    atualizadaEm: now.toISOString(),
  };
}

/**
 * Calcula o IMC (Índice de Massa Corporal) com base no peso (kg) e altura (m).
 * Retorna null se os valores forem inválidos ou ausentes.
 */
export function calcularIMC(peso: string, altura: string): number | null {
  const pesoNum = parseFloat(peso.replace(",", "."));
  const alturaNum = parseFloat(altura.replace(",", "."));

  if (!isFinite(pesoNum) || !isFinite(alturaNum) || alturaNum <= 0 || pesoNum <= 0) {
    return null;
  }

  // altura pode ser informada em cm (ex: 170) ou em metros (ex: 1.70)
  const alturaMetros = alturaNum > 3 ? alturaNum / 100 : alturaNum;
  return pesoNum / (alturaMetros * alturaMetros);
}

/**
 * Formata o IMC com 1 casa decimal e classificação da OMS.
 */
export function formatarIMC(imc: number | null): string {
  if (imc === null) return "—";
  return imc.toFixed(1);
}

/**
 * Retorna a classificação do IMC segundo a OMS.
 */
export function classificarIMC(imc: number | null): string {
  if (imc === null) return "";
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidade grau I";
  if (imc < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

/**
 * Calcula o Peso Predito (Peso Corporal Ideal) pela fórmula de Devine.
 * Retorna null se altura ou sexo forem inválidos/ausentes.
 */
export function calcularPesoPredito(altura: string, sexo: "M" | "F" | string): number | null {
  if (sexo !== "M" && sexo !== "F") return null;

  const alturaNum = parseFloat(altura.replace(",", "."));
  if (!isFinite(alturaNum) || alturaNum <= 0) return null;

  const alturaCm = alturaNum > 3 ? alturaNum : alturaNum * 100;
  const base = sexo === "M" ? 50 : 45.5;
  return base + 0.91 * (alturaCm - 152.4);
}

/**
 * Formata o Peso Predito com 1 casa decimal. Retorna "—" se null.
 */
export function formatarPesoPredito(pp: number | null): string {
  if (pp === null) return "—";
  return pp.toFixed(1);
}
