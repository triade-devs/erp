import { describe, expect, it } from "vitest";
import {
  ACTIVE_SESSION_KEY,
  LS_KEY,
  hasSessionConflict,
  parseStoredSessions,
  persistSessions,
} from "../storage";
import { createAnestesiaSession } from "../session";

describe("storage helpers", () => {
  it("descarta payload inválido do localStorage", () => {
    const parsed = parseStoredSessions('[{"id":"1"}]');

    expect(parsed).toEqual([]);
  });

  it("valida payload completo do localStorage", () => {
    const session = createAnestesiaSession({
      paciente: "Paciente Teste",
      data: "2024-05-16",
      now: new Date("2024-05-16T08:00:00.000Z"),
    });

    const parsed = parseStoredSessions(JSON.stringify([session]));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe(session.id);
  });

  it("normaliza séries incompletas para evitar perda da sessão ao salvar novamente", () => {
    const session = createAnestesiaSession({
      paciente: "Paciente Teste",
      data: "2024-05-16",
      now: new Date("2024-05-16T08:00:00.000Z"),
    });
    const legacyPayload = JSON.stringify([
      {
        ...session,
        fichaAnestesia: {
          ...session.fichaAnestesia,
          spo2: ["98"],
          temp: ["36,4"],
          diurese: [],
          pvc: [],
          ritmo: ["SR"],
        },
      },
    ]);

    const parsed = parseStoredSessions(legacyPayload);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.fichaAnestesia.spo2).toHaveLength(12);
    expect(parsed[0]?.fichaAnestesia.spo2[0]).toBe("98");
    expect(parsed[0]?.fichaAnestesia.spo2[1]).toBe("");
  });

  it("detecta colisão de sessão por paciente e data", () => {
    const sessions = [
      createAnestesiaSession({
        paciente: "Paciente Teste",
        data: "2024-05-16",
        now: new Date("2024-05-16T08:00:00.000Z"),
      }),
    ];

    expect(hasSessionConflict(sessions, "Paciente Teste", "2024-05-16")).toBe(true);
    expect(hasSessionConflict(sessions, "Paciente Teste", "2024-05-17")).toBe(false);
  });

  it("retorna erro de quota sem explodir quando o storage falha", () => {
    const storage = {
      setItem() {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem() {},
    };

    const result = persistSessions(storage, [], null);

    expect(result.ok).toBe(false);
    if (result.ok) {
      expect.unreachable("persistSessions deveria retornar erro de quota");
    }
    expect(result.reason).toBe("quota");
  });

  it("persiste sessões e sessão ativa quando o storage aceita gravação", () => {
    const calls: Array<[string, string]> = [];
    const storage = {
      setItem(key: string, value: string) {
        calls.push([key, value]);
      },
      removeItem() {
        throw new Error("não deveria remover");
      },
    };

    const session = createAnestesiaSession({
      paciente: "Paciente Teste",
      data: "2024-05-16",
      now: new Date("2024-05-16T08:00:00.000Z"),
    });

    const result = persistSessions(storage, [session], session.id);

    expect(result.ok).toBe(true);
    expect(calls[0]?.[0]).toBe(LS_KEY);
    expect(calls[1]?.[0]).toBe(ACTIVE_SESSION_KEY);
  });
});
