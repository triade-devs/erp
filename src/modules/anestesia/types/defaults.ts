import type { FichaAnestesiaData, LabResult, MedicacaoItem, PreAvaliacaoData } from "./index";
import { DOENCA_KEYS } from "./constants";
import { buildVitalsSlots, normalizeAsaStatus } from "../services/session";

function emptyStringArray(length: number): string[] {
  return Array.from({ length }, () => "");
}

function defaultMedicacaoItem(): MedicacaoItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `med-${Date.now()}`,
    medicamento: "",
    dose: "",
    hora: "",
    via: "",
    infContinua: false,
  };
}

function defaultLabResult(id: string): LabResult {
  return {
    id,
    hora: "",
    ph: "",
    pco2: "",
    po2: "",
    bicBe: "",
    k: "",
    na: "",
    gluc: "",
    lact: "",
  };
}

export function defaultPreAvaliacao(): PreAvaliacaoData {
  const doencas = Object.fromEntries(
    DOENCA_KEYS.map((key) => [key, false]),
  ) as PreAvaliacaoData["doencas"];

  return {
    nomePaciente: "",
    idade: "",
    sexo: "",
    clinica: "",
    registro: "",
    cirurgiaProposta: "",
    doencas,
    comentariosDoencas: "",
    medicamentosEmUso: "",
    jejumOrientado: null,
    peso: "",
    altura: "",
    pa: "",
    temperatura: "",
    hb: "",
    vg: "",
    leuc: "",
    glic: "",
    na: "",
    k: "",
    outrosExames: "",
    mallampati: "",
    cabecaPescoco: "",
    sncColuna: "",
    respCV: "",
    suspeitaVAD: false,
    condutasVAD: "",
    parecerClinico: "",
    asa: "",
    emergencia: false,
  };
}

export function defaultFichaAnestesia(
  preAvaliacao: Partial<PreAvaliacaoData> = {},
): FichaAnestesiaData {
  const vitals = buildVitalsSlots();
  const vitalsHoraInicio = vitals[0]?.hora ?? "00:00";

  return {
    paciente: preAvaliacao.nomePaciente ?? "",
    data: "",
    clinica: preAvaliacao.clinica ?? "",
    cirurgia: preAvaliacao.cirurgiaProposta ?? "",
    cirurgiao: "",
    anestesiologista: "",
    asaStatus: normalizeAsaStatus(preAvaliacao.asa),
    emergencia: preAvaliacao.emergencia ?? false,
    premedRealizada: false,
    premedDescricao: "",
    estadoAdmissao: { calmo: false, tenso: false, sonolento: false, dormindo: false },
    tecnica: {
      geral: false,
      raqui: false,
      sedacao: false,
      peridural: false,
      caudal: false,
      bloqueioplexo: false,
    },
    inicioAnestesia: "",
    inicioCirurgia: "",
    terminoCirurgia: "",
    terminoAnestesia: "",
    ventilacao: {
      espontanea: false,
      assistida: false,
      contMecanica: false,
      contManual: false,
      comReinalante: false,
      semReinalante: false,
    },
    viaAerea: {
      iot: false,
      mascaraFacialO2: false,
      cateterNasal: false,
      mascaraLaringea: false,
      outra: false,
    },
    iotCuff: "",
    iotDificuldade: "",
    iotTubo: "",
    vitals,
    vitalsHoraInicio,
    vitalsInterval: 5,
    spo2: emptyStringArray(12),
    temp: emptyStringArray(12),
    diurese: emptyStringArray(12),
    pvc: emptyStringArray(12),
    ritmo: emptyStringArray(12),
    acessoPeriferico: [{ ativo: false, calibre: "", local: "" }],
    acessoIntraosseo: { ativo: false, calibre: "", local: "" },
    acessoVenosoCentral: { ativo: false, calibre: "", local: "" },
    acessoPAI: { ativo: false, calibre: "", local: "" },
    medicacoes: [defaultMedicacaoItem()],
    alergias: "",
    comentariosAdicionais: "",
    monitoracao: { oximetria: false, ecg: false, pani: false, capnografia: false },
    labResults: [defaultLabResult("lab-1"), defaultLabResult("lab-2"), defaultLabResult("lab-3")],
  };
}
