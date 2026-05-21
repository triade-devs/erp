import { z } from "zod";
import { ASA_STATUS_VALUES, IOT_CUFF_OPTIONS, IOT_DIFICULDADE_OPTIONS } from "../types/constants";

const vitalsTimeSlotSchema = z.object({
  hora: z.string(),
  pasSis: z.string(),
  paDia: z.string(),
  pam: z.string(),
  fc: z.string(),
  fr: z.string(),
});

const medicacaoItemSchema = z.object({
  id: z.string(),
  medicamento: z.string(),
  dose: z.string().default(""),
  hora: z.string(),
  via: z.string(),
  infContinua: z.boolean(),
});

const labResultSchema = z.object({
  id: z.string(),
  hora: z.string(),
  ph: z.string(),
  pco2: z.string(),
  po2: z.string(),
  bicBe: z.string(),
  k: z.string(),
  na: z.string(),
  gluc: z.string(),
  lact: z.string(),
});

const acessoSchema = z.object({
  ativo: z.boolean(),
  calibre: z.string(),
  local: z.string(),
});

export const fichaAnestesiaSchema = z.object({
  paciente: z.string(),
  data: z.string(),
  clinica: z.string(),
  cirurgia: z.string(),
  cirurgiao: z.string(),
  anestesiologista: z.string(),
  asaStatus: z.union([z.enum(ASA_STATUS_VALUES), z.literal("")]),
  emergencia: z.boolean(),
  premedRealizada: z.boolean(),
  premedDescricao: z.string(),
  estadoAdmissao: z.object({
    calmo: z.boolean(),
    tenso: z.boolean(),
    sonolento: z.boolean(),
    dormindo: z.boolean(),
  }),
  tecnica: z.object({
    geral: z.boolean(),
    raqui: z.boolean(),
    raquiDescricao: z.string().default(""),
    sedacao: z.boolean(),
    peridural: z.boolean(),
    periduralDescricao: z.string().default(""),
    caudal: z.boolean(),
    bloqueioplexo: z.boolean(),
    bloqueioplexoDescricao: z.string().default(""),
  }),
  inicioAnestesia: z.string(),
  inicioCirurgia: z.string(),
  terminoCirurgia: z.string(),
  terminoAnestesia: z.string(),
  ventilacao: z.object({
    espontanea: z.boolean(),
    assistida: z.boolean(),
    contMecanica: z.boolean(),
    contManual: z.boolean(),
    comReinalante: z.boolean(),
    semReinalante: z.boolean(),
  }),
  viaAerea: z.object({
    iot: z.boolean(),
    mascaraFacialO2: z.boolean(),
    cateterNasal: z.boolean(),
    mascaraLaringea: z.boolean(),
    outra: z.boolean(),
  }),
  iotCuff: z.union([z.enum(IOT_CUFF_OPTIONS), z.literal("")]),
  iotDificuldade: z.union([z.enum(IOT_DIFICULDADE_OPTIONS), z.literal("")]),
  iotTubo: z.string(),
  vitals: z.array(vitalsTimeSlotSchema),
  vitalsHoraInicio: z.string(),
  vitalsInterval: z.union([z.literal(5), z.literal(10)]).default(5),
  spo2: z.array(z.string()),
  temp: z.array(z.string()),
  diurese: z.array(z.string()),
  pvc: z.array(z.string()),
  ritmo: z.array(z.string()),
  acessoPeriferico: z.array(acessoSchema).default([{ ativo: false, calibre: "", local: "" }]),
  acessoIntraosseo: acessoSchema,
  acessoVenosoCentral: acessoSchema,
  acessoPAI: acessoSchema,
  medicacoes: z.array(medicacaoItemSchema),
  alergias: z.string(),
  comentariosAdicionais: z.string(),
  monitoracao: z.object({
    oximetria: z.boolean(),
    ecg: z.boolean(),
    pani: z.boolean(),
    capnografia: z.boolean(),
  }),
  labResults: z.array(labResultSchema),
});
