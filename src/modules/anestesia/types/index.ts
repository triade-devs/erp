import type {
  ASA_OPTIONS,
  ASA_STATUS_VALUES,
  DOENCA_KEYS,
  IOT_CUFF_OPTIONS,
  IOT_DIFICULDADE_OPTIONS,
  MALLAMPATI_OPTIONS,
  SEXO_OPTIONS,
} from "./constants";
import type { VitalsInterval } from "../services/session";

export type PreAvaliacaoData = {
  nomePaciente: string;
  idade: string;
  sexo: (typeof SEXO_OPTIONS)[number] | "";
  clinica: string;
  registro: string;
  cirurgiaProposta: string;
  doencas: Record<(typeof DOENCA_KEYS)[number], boolean>;
  comentariosDoencas: string;
  medicamentosEmUso: string;
  jejumOrientado: boolean | null;
  peso: string;
  altura: string;
  pa: string;
  temperatura: string;
  hb: string;
  vg: string;
  leuc: string;
  glic: string;
  na: string;
  k: string;
  outrosExames: string;
  mallampati: (typeof MALLAMPATI_OPTIONS)[number] | "";
  cabecaPescoco: string;
  sncColuna: string;
  respCV: string;
  suspeitaVAD: boolean;
  condutasVAD: string;
  parecerClinico: string;
  asa: (typeof ASA_OPTIONS)[number] | "";
  emergencia: boolean;
};

export type VitalsTimeSlot = {
  hora: string;
  pasSis: string;
  paDia: string;
  pam: string;
  fc: string;
  fr: string;
};

export type MedicacaoItem = {
  id: string;
  descricao: string;
  hora: string;
  via: string;
  infContinua: boolean;
};

export type LabResult = {
  id: string;
  hora: string;
  ph: string;
  pco2: string;
  po2: string;
  bicBe: string;
  k: string;
  na: string;
  gluc: string;
  lact: string;
};

export type FichaAnestesiaData = {
  paciente: string;
  data: string;
  clinica: string;
  cirurgia: string;
  cirurgiao: string;
  anestesiologista: string;
  asaStatus: (typeof ASA_STATUS_VALUES)[number] | "";
  emergencia: boolean;
  premedRealizada: boolean;
  premedDescricao: string;
  estadoAdmissao: {
    calmo: boolean;
    tenso: boolean;
    sonolento: boolean;
    dormindo: boolean;
  };
  tecnica: {
    geral: boolean;
    raqui: boolean;
    sedacao: boolean;
    peridural: boolean;
    caudal: boolean;
    bloqueioplexo: boolean;
  };
  inicioAnestesia: string;
  inicioCirurgia: string;
  terminoCirurgia: string;
  terminoAnestesia: string;
  ventilacao: {
    espontanea: boolean;
    assistida: boolean;
    contMecanica: boolean;
    contManual: boolean;
    comReinalante: boolean;
    semReinalante: boolean;
  };
  viaAerea: {
    iot: boolean;
    mascaraFacialO2: boolean;
    cateterNasal: boolean;
    mascaraLaringea: boolean;
    outra: boolean;
  };
  iotCuff: (typeof IOT_CUFF_OPTIONS)[number] | "";
  iotDificuldade: (typeof IOT_DIFICULDADE_OPTIONS)[number] | "";
  iotTubo: string;
  vitals: VitalsTimeSlot[];
  vitalsHoraInicio: string;
  vitalsInterval: VitalsInterval;
  spo2: string[];
  temp: string[];
  diurese: string[];
  pvc: string[];
  ritmo: string[];
  acessoPeriferico: { ativo: boolean; calibre: string; local: string }[];
  acessoIntraosseo: { ativo: boolean; calibre: string; local: string };
  acessoVenosoCentral: { ativo: boolean; calibre: string; local: string };
  acessoPAI: { ativo: boolean; calibre: string; local: string };
  medicacoes: MedicacaoItem[];
  alergias: string;
  comentariosAdicionais: string;
  monitoracao: {
    oximetria: boolean;
    ecg: boolean;
    pani: boolean;
    capnografia: boolean;
  };
  labResults: LabResult[];
};

export type AnestesiaSession = {
  id: string;
  paciente: string;
  data: string;
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
  criadaEm: string;
  atualizadaEm: string;
};

export {
  DOENCAS_OPTIONS,
  DOENCA_KEYS,
  ASA_OPTIONS,
  ASA_STATUS_VALUES,
  MALLAMPATI_OPTIONS,
} from "./constants";
export type { DoencaKey } from "./constants";
