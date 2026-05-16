export const DOENCA_KEYS = [
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "d10",
  "d11",
  "d12",
  "d13",
  "d14",
  "d15",
  "d16",
  "d17",
  "d18",
  "d19",
  "d20",
  "d21",
] as const;

export type DoencaKey = (typeof DOENCA_KEYS)[number];

export const DOENCAS_OPTIONS = [
  { key: "d1", label: "Hipertensão arterial" },
  { key: "d2", label: "Cardiopatia" },
  { key: "d3", label: "Dispnéia aos esforços" },
  { key: "d4", label: "Precordialgia típica" },
  { key: "d5", label: "Diabetes melito" },
  { key: "d6", label: "Distúrbio coagulação" },
  { key: "d7", label: "Tabagismo" },
  { key: "d8", label: "Obesidade" },
  { key: "d9", label: "Etilismo (quantifique)" },
  { key: "d10", label: "Drogadição" },
  { key: "d11", label: "Hepatite/Transmissível" },
  { key: "d12", label: "Doença renal" },
  { key: "d13", label: "Alergia a medicamentos" },
  { key: "d14", label: "Asma/DPOC" },
  { key: "d15", label: "Doença neurológica" },
  { key: "d16", label: "Doença endócrina" },
  { key: "d17", label: "Prótese dentária" },
  { key: "d18", label: "Gravidez atual" },
  { key: "d19", label: "Anestesias anteriores" },
  { key: "d20", label: "Complicações anest." },
  { key: "d21", label: "Outras doenças" },
] as const satisfies ReadonlyArray<{ key: DoencaKey; label: string }>;

export const SEXO_OPTIONS = ["M", "F"] as const;
export const MALLAMPATI_OPTIONS = ["I", "II", "III", "IV"] as const;
export const ASA_OPTIONS = ["ASA I", "ASA II", "ASA III", "ASA IV", "ASA V", "ASA VI"] as const;
export const ASA_STATUS_VALUES = ["I", "II", "III", "IV", "V", "VI"] as const;
export const IOT_CUFF_OPTIONS = ["com", "sem"] as const;
export const IOT_DIFICULDADE_OPTIONS = ["facil", "dificil"] as const;
