import { describe, expect, it } from "vitest";
import {
  buildSessionId,
  buildVitalsSlots,
  createAnestesiaSession,
  insertSessionWithLimit,
  syncVitalsWithStartHour,
  updateSessionFichaAnestesia,
  updateSessionPreAvaliacao,
  getVitalsChartY,
  buildVitalsSeriesPath,
} from "../session";
import { defaultPreAvaliacao, defaultFichaAnestesia } from "../../types/defaults";

describe("anestesia defaults", () => {
  it("cria pré-avaliação com 21 doenças e campos vazios", () => {
    const data = defaultPreAvaliacao();

    expect(Object.keys(data.doencas)).toHaveLength(21);
    expect(Object.values(data.doencas).every((value) => value === false)).toBe(true);
    expect(data.jejumOrientado).toBeNull();
    expect(data.sexo).toBe("");
    expect(data.mallampati).toBe("");
  });

  it("pré-popula ficha a partir da pré-avaliação e gera 12 slots de 15 minutos", () => {
    const ficha = defaultFichaAnestesia({
      nomePaciente: "Ricardo Santos",
      clinica: "Clínica Central",
      cirurgiaProposta: "Herniorrafia",
      asa: "ASA III",
      emergencia: true,
    });

    expect(ficha.paciente).toBe("Ricardo Santos");
    expect(ficha.clinica).toBe("Clínica Central");
    expect(ficha.cirurgia).toBe("Herniorrafia");
    expect(ficha.asaStatus).toBe("III");
    expect(ficha.emergencia).toBe(true);
    expect(ficha.vitals).toHaveLength(12);
    expect(ficha.spo2).toHaveLength(12);
    expect(ficha.temp).toHaveLength(12);
    expect(ficha.vitals[0]?.hora).toMatch(/^\d{2}:\d{2}$/);
    expect(ficha.vitals[1]?.hora).not.toBe(ficha.vitals[0]?.hora);
  });
});

describe("session helpers", () => {
  it("gera id estável de sessão usando paciente e data", () => {
    expect(buildSessionId("Ricardo Santos", "2024-05-16")).toBe("Ricardo_Santos:2024-05-16");
  });

  it("sincroniza nome do paciente da pré-avaliação na ficha ativa", () => {
    const session = createAnestesiaSession({
      paciente: "Paciente Inicial",
      data: "2024-05-16",
      now: new Date("2024-05-16T08:00:00.000Z"),
    });

    const updated = updateSessionPreAvaliacao(
      session,
      { nomePaciente: "Paciente Atualizado" },
      new Date("2024-05-16T08:05:00.000Z"),
    );

    expect(updated.preAvaliacao.nomePaciente).toBe("Paciente Atualizado");
    expect(updated.fichaAnestesia.paciente).toBe("Paciente Atualizado");
    expect(updated.atualizadaEm).toBe("2024-05-16T08:05:00.000Z");
  });

  it("mantém no máximo 50 sessões removendo a mais antiga", () => {
    const sessions = Array.from({ length: 50 }, (_, index) =>
      createAnestesiaSession({
        paciente: `Paciente ${index + 1}`,
        data: `2024-05-${String((index % 28) + 1).padStart(2, "0")}`,
        now: new Date(`2024-05-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`),
      }),
    );

    const next = createAnestesiaSession({
      paciente: "Paciente 51",
      data: "2024-06-01",
      now: new Date("2024-06-01T08:00:00.000Z"),
    });

    const limited = insertSessionWithLimit(sessions, next);

    expect(limited).toHaveLength(50);
    expect(limited.some((session) => session.paciente === "Paciente 1")).toBe(false);
    expect(limited.at(-1)?.paciente).toBe("Paciente 51");
  });

  it("gera slots a cada 15 minutos a partir do quarto de hora anterior", () => {
    const vitals = buildVitalsSlots(new Date(2024, 4, 16, 8, 7, 0));

    expect(vitals).toHaveLength(12);
    expect(vitals[0]?.hora).toBe("08:00");
    expect(vitals[1]?.hora).toBe("08:15");
    expect(vitals[11]?.hora).toBe("10:45");
  });

  it("relabela os horários mantendo os valores já digitados", () => {
    const synced = syncVitalsWithStartHour("09:00", [
      { hora: "08:00", pasSis: "120", paDia: "80", pam: "93", fc: "75", fr: "12" },
      { hora: "08:15", pasSis: "118", paDia: "78", pam: "91", fc: "74", fr: "11" },
    ]);

    expect(synced[0]).toEqual({
      hora: "09:00",
      pasSis: "120",
      paDia: "80",
      pam: "93",
      fc: "75",
      fr: "12",
    });
    expect(synced[1]?.hora).toBe("09:15");
    expect(synced[1]?.fc).toBe("74");
    expect(synced[11]?.hora).toBe("11:45");
  });

  it("atualiza a ficha e sincroniza os horários quando a hora inicial muda", () => {
    const session = createAnestesiaSession({
      paciente: "Paciente Inicial",
      data: "2024-05-16",
      now: new Date("2024-05-16T08:00:00.000Z"),
    });

    const updated = updateSessionFichaAnestesia(
      {
        ...session,
        fichaAnestesia: {
          ...session.fichaAnestesia,
          vitalsHoraInicio: "08:00",
          vitals: [
            { hora: "08:00", pasSis: "120", paDia: "80", pam: "93", fc: "75", fr: "12" },
            ...session.fichaAnestesia.vitals.slice(1),
          ],
        },
      },
      { vitalsHoraInicio: "09:30" },
      new Date("2024-05-16T09:35:00.000Z"),
    );

    expect(updated.fichaAnestesia.vitalsHoraInicio).toBe("09:30");
    expect(updated.fichaAnestesia.vitals[0]?.hora).toBe("09:30");
    expect(updated.fichaAnestesia.vitals[0]?.pasSis).toBe("120");
    expect(updated.fichaAnestesia.vitals[0]?.fr).toBe("12");
    expect(updated.atualizadaEm).toBe("2024-05-16T09:35:00.000Z");
  });

  it("mantém valores no gráfico dentro da área visível", () => {
    expect(getVitalsChartY(12)).toBe(350);
    expect(getVitalsChartY(20)).toBe(350);
    expect(getVitalsChartY(220)).toBe(0);
  });

  it("quebra a linha do gráfico quando existem lacunas entre os pontos", () => {
    const path = buildVitalsSeriesPath([120, null, null, 110], 10);

    expect(path.startsWith("M0,")).toBe(true);
    expect(path).toContain(" M30,");
    expect(path).not.toContain("L30,");
  });
});
