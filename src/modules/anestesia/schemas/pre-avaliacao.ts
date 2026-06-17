import { z } from "zod";
import { ASA_OPTIONS, DOENCA_KEYS, MALLAMPATI_OPTIONS, SEXO_OPTIONS } from "../types/constants";
import type { DoencaKey } from "../types";

const doencasShape = Object.fromEntries(DOENCA_KEYS.map((key) => [key, z.boolean()])) as Record<
  DoencaKey,
  z.ZodBoolean
>;

export const preAvaliacaoSchema = z.object({
  nomePaciente: z.string(),
  idade: z.string(),
  sexo: z.union([z.enum(SEXO_OPTIONS), z.literal("")]),
  clinica: z.string(),
  registro: z.string(),
  cirurgiaProposta: z.string(),
  doencas: z.object(doencasShape),
  comentariosDoencas: z.string(),
  medicamentosEmUso: z.string(),
  jejumOrientado: z.boolean().nullable(),
  peso: z.string(),
  altura: z.string(),
  pa: z.string(),
  temperatura: z.string(),
  hb: z.string(),
  vg: z.string(),
  leuc: z.string(),
  glic: z.string(),
  na: z.string(),
  k: z.string(),
  outrosExames: z.string(),
  mallampati: z.union([z.enum(MALLAMPATI_OPTIONS), z.literal("")]),
  cabecaPescoco: z.string(),
  sncColuna: z.string(),
  respCV: z.string(),
  suspeitaVAD: z.boolean(),
  condutasVAD: z.string(),
  parecerClinico: z.string(),
  asa: z.union([z.enum(ASA_OPTIONS), z.literal("")]),
  emergencia: z.boolean(),
});
