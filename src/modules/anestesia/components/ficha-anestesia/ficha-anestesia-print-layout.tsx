"use client";

import { forwardRef } from "react";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import {
  buildTimeLabels,
  calcularIMC,
  classificarIMC,
  formatarIMC,
  syncVitalsWithStartHour,
} from "../../utils/session";

type Props = {
  data: FichaAnestesiaData;
  preAvaliacao: PreAvaliacaoData;
};

function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="flex cursor-default items-center gap-1.5">
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-gray-500 text-[9px] font-bold"
        aria-hidden
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-[11px] leading-[14px]">{label}</span>
    </label>
  );
}

function PrintField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="flex h-7 w-full items-center border border-gray-300 bg-white px-2 text-[11px] text-gray-900">
        {value ?? ""}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-blue-800">
      <h2 className="text-[10px] font-bold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-gray-200 bg-white p-2.5 shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

const estadoAdmissaoLabels: Record<string, string> = {
  calmo: "Calmo",
  tenso: "Tenso",
  sonolento: "Sonolento",
  dormindo: "Dormindo",
};

const tecnicaLabels: Record<string, string> = {
  geral: "Geral",
  raqui: "Raquianestesia",
  sedacao: "Sedação",
  peridural: "Peridural",
  caudal: "Caudal",
  bloqueioplexo: "Bloqueio de Plexo",
};

const viaAereaLabels: Record<string, string> = {
  iot: "IOT",
  mascaraFacialO2: "Máscara Facial O2",
  cateterNasal: "Cateter Nasal",
  mascaraLaringea: "Máscara Laríngea",
  outra: "Outra",
};

const ventilacaoLabels: Record<string, string> = {
  espontanea: "Espontânea",
  assistida: "Assistida",
  contMecanica: "Cont. Mecânica",
  contManual: "Cont. Manual",
  comReinalante: "Com Reinalante",
  semReinalante: "Sem Reinalante",
};

const monitoracaoLabels: Record<string, string> = {
  oximetria: "Oximetria",
  ecg: "ECG (DII/V5)",
  pani: "PANI",
  capnografia: "Capnografia",
};

export const FichaAnestesiaPrintLayout = forwardRef<HTMLDivElement, Props>(
  function FichaAnestesiaPrintLayout({ data, preAvaliacao }, ref) {
    const today = data.data
      ? new Date(data.data + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

    const timeLabels = buildTimeLabels(data.vitalsHoraInicio);
    const syncedVitals = syncVitalsWithStartHour(data.vitalsHoraInicio, data.vitals);
    const imc = calcularIMC(preAvaliacao.peso, preAvaliacao.altura);

    const extraMetrics = [
      { key: "spo2" as const, label: "SpO₂" },
      { key: "temp" as const, label: "Temp" },
      { key: "diurese" as const, label: "Diurese" },
      { key: "pvc" as const, label: "PVC" },
      { key: "ritmo" as const, label: "Ritmo" },
    ];

    const accessFields = [
      { key: "acessoPeriferico" as const, label: "Acesso Periférico" },
      { key: "acessoIntraosseo" as const, label: "Intraósseo" },
      { key: "acessoVenosoCentral" as const, label: "Venoso Central" },
      { key: "acessoPAI" as const, label: "PAI" },
    ];

    return (
      <div
        ref={ref}
        className="bg-white font-sans text-gray-900"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        {/* Document Header */}
        <div className="mb-4 flex items-end justify-between border-b-2 border-blue-800 pb-2">
          <h1 className="text-[16px] font-bold text-gray-900">Ficha de Anestesia</h1>
          <div className="space-y-0.5 text-right">
            {preAvaliacao.registro ? (
              <div className="flex justify-end gap-1">
                <span className="text-[9px] font-bold uppercase text-gray-500">Prontuário:</span>
                <span className="text-[9px] font-bold text-gray-900">#{preAvaliacao.registro}</span>
              </div>
            ) : null}
            <div className="flex justify-end gap-1">
              <span className="text-[9px] font-bold uppercase text-gray-500">Data:</span>
              <span className="text-[9px] font-bold text-gray-900">{today}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Dados do Paciente */}
          <SectionCard>
            <SectionHeader title="Dados do Paciente" />
            <div className="grid grid-cols-12 gap-2">
              <PrintField label="Paciente" value={data.paciente} className="col-span-5" />
              <PrintField label="Data" value={today} className="col-span-2" />
              <PrintField label="Clínica" value={data.clinica} className="col-span-3" />
              <PrintField
                label="ASA"
                value={data.asaStatus ? `ASA ${data.asaStatus}` : ""}
                className="col-span-2"
              />
              <PrintField label="Cirurgia" value={data.cirurgia} className="col-span-5" />
              <PrintField label="Cirurgião" value={data.cirurgiao} className="col-span-4" />
              <PrintField
                label="Anestesiologista"
                value={data.anestesiologista}
                className="col-span-3"
              />
              {/* Sinais vitais da pré-avaliação */}
              <PrintField
                label="Peso"
                value={preAvaliacao.peso ? `${preAvaliacao.peso} kg` : ""}
                className="col-span-2"
              />
              <PrintField
                label="Altura"
                value={preAvaliacao.altura ? `${preAvaliacao.altura} m` : ""}
                className="col-span-2"
              />
              <div className="col-span-3">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  IMC
                </p>
                <div className="flex h-7 w-full items-center gap-1 border border-gray-300 bg-blue-50 px-2">
                  <span className="text-[11px] font-semibold text-blue-800">
                    {formatarIMC(imc)}
                  </span>
                  {imc !== null && (
                    <span className="text-[9px] text-gray-500">kg/m² · {classificarIMC(imc)}</span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Técnica + Admissão + Pré-med + Horários */}
          <div className="grid grid-cols-12 gap-2">
            {/* Técnica Anestésica + Estado Admissão */}
            <SectionCard className="col-span-5">
              <SectionHeader title="Técnica e Admissão" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">
                    Técnica Anestésica
                  </p>
                  <div className="space-y-1">
                    {Object.entries(tecnicaLabels).map(([key, label]) => (
                      <PrintCheckbox
                        key={key}
                        checked={data.tecnica[key as keyof typeof data.tecnica]}
                        label={label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">
                    Estado de Admissão
                  </p>
                  <div className="space-y-1">
                    {Object.entries(estadoAdmissaoLabels).map(([key, label]) => (
                      <PrintCheckbox
                        key={key}
                        checked={data.estadoAdmissao[key as keyof typeof data.estadoAdmissao]}
                        label={label}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <PrintCheckbox checked={data.emergencia} label="Procedimento de Emergência" />
                  </div>
                  <div className="mt-1">
                    <PrintCheckbox checked={data.premedRealizada} label="Pré-medicação Realizada" />
                    {data.premedRealizada && data.premedDescricao ? (
                      <p className="mt-0.5 pl-5 text-[10px] text-gray-700">
                        {data.premedDescricao}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Via Aérea + Ventilação */}
            <SectionCard className="col-span-4">
              <SectionHeader title="Via Aérea e Ventilação" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Via Aérea</p>
                  <div className="space-y-1">
                    {Object.entries(viaAereaLabels).map(([key, label]) => (
                      <PrintCheckbox
                        key={key}
                        checked={data.viaAerea[key as keyof typeof data.viaAerea]}
                        label={label}
                      />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] text-gray-500">
                      Cuff:{" "}
                      <span className="font-semibold text-gray-900">
                        {data.iotCuff ? (data.iotCuff === "com" ? "Com" : "Sem") : "—"}
                      </span>{" "}
                      · Dificuldade:{" "}
                      <span className="font-semibold text-gray-900">
                        {data.iotDificuldade
                          ? data.iotDificuldade === "facil"
                            ? "Fácil"
                            : "Difícil"
                          : "—"}
                      </span>
                    </p>
                    <p className="text-[9px] text-gray-500">
                      Tubo nº:{" "}
                      <span className="font-semibold text-gray-900">{data.iotTubo || "—"}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Ventilação</p>
                  <div className="space-y-1">
                    {Object.entries(ventilacaoLabels).map(([key, label]) => (
                      <PrintCheckbox
                        key={key}
                        checked={data.ventilacao[key as keyof typeof data.ventilacao]}
                        label={label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Horários */}
            <SectionCard className="col-span-3">
              <SectionHeader title="Horários" />
              <div className="space-y-2">
                {[
                  { key: "inicioAnestesia", label: "Início Anestesia" },
                  { key: "inicioCirurgia", label: "Início Cirurgia" },
                  { key: "terminoCirurgia", label: "Término Cirurgia" },
                  { key: "terminoAnestesia", label: "Término Anestesia" },
                ].map((item) => (
                  <PrintField
                    key={item.key}
                    label={item.label}
                    value={data[item.key as keyof FichaAnestesiaData] as string}
                  />
                ))}
              </div>
              <div className="mt-2">
                <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Monitoração</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(monitoracaoLabels).map(([key, label]) => (
                    <PrintCheckbox
                      key={key}
                      checked={data.monitoracao[key as keyof typeof data.monitoracao]}
                      label={label}
                    />
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Grade de Sinais Vitais */}
          <SectionCard>
            <SectionHeader title="Grade de Sinais Vitais" />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-1 py-1 text-left font-bold text-gray-600">
                      Parâmetro
                    </th>
                    {timeLabels.map((label) => (
                      <th
                        key={label}
                        className="border border-gray-300 px-1 py-1 text-center font-bold text-gray-600"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { key: "pasSis" as const, label: "PA SIS" },
                      { key: "paDia" as const, label: "PA DIA" },
                      { key: "pam" as const, label: "PAM" },
                      { key: "fc" as const, label: "FC" },
                      { key: "fr" as const, label: "FR" },
                    ] as const
                  ).map((row, rowIndex) => (
                    <tr key={row.key} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-1 py-1 font-semibold text-gray-700">
                        {row.label}
                      </td>
                      {syncedVitals.map((slot, index) => (
                        <td
                          key={index}
                          className="border border-gray-300 px-1 py-1 text-center text-gray-900"
                        >
                          {slot[row.key] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {extraMetrics.map((metric, rowIndex) => (
                    <tr
                      key={metric.key}
                      className={(rowIndex + 5) % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-1 py-1 font-semibold text-gray-700">
                        {metric.label}
                      </td>
                      {timeLabels.map((label, index) => (
                        <td
                          key={label}
                          className="border border-gray-300 px-1 py-1 text-center text-gray-900"
                        >
                          {data[metric.key][index] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Acessos Vasculares */}
          <SectionCard>
            <SectionHeader title="Acessos Vasculares" />
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold text-gray-600">
                    Tipo
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold text-gray-600">
                    Ativo
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold text-gray-600">
                    Calibre
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold text-gray-600">
                    Local
                  </th>
                </tr>
              </thead>
              <tbody>
                {accessFields.map((field, index) => {
                  const acesso = data[field.key];
                  return (
                    <tr key={field.key} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1 font-medium text-gray-800">
                        {field.label}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        <span
                          className={`text-[10px] font-bold ${acesso.ativo ? "text-green-700" : "text-gray-400"}`}
                        >
                          {acesso.ativo ? "✓" : "—"}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-900">
                        {acesso.calibre || ""}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-900">
                        {acesso.local || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>

          {/* Medicações e Exames Lab em duas colunas */}
          <div className="grid grid-cols-12 gap-2">
            {/* Medicações / Ocorrências */}
            <SectionCard className="col-span-7">
              <SectionHeader title="Medicações / Ocorrências" />
              {data.medicacoes.length > 0 ? (
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-1 py-1 text-left font-bold text-gray-600">
                        Nº
                      </th>
                      <th className="border border-gray-300 px-1 py-1 text-left font-bold text-gray-600">
                        Descrição
                      </th>
                      <th className="border border-gray-300 px-1 py-1 text-left font-bold text-gray-600">
                        Hora
                      </th>
                      <th className="border border-gray-300 px-1 py-1 text-left font-bold text-gray-600">
                        Via
                      </th>
                      <th className="border border-gray-300 px-1 py-1 text-center font-bold text-gray-600">
                        Inf.Cont.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.medicacoes.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-1 py-1 text-gray-500">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-900">
                          {item.descricao}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-900">
                          {item.hora}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-900">
                          {item.via}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-center font-bold text-gray-900">
                          {item.infContinua ? "✓" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[10px] italic text-gray-400">Nenhuma medicação registrada.</p>
              )}
            </SectionCard>

            {/* Alertas + Exames Laboratoriais */}
            <div className="col-span-5 space-y-2">
              <SectionCard>
                <SectionHeader title="Alertas e Monitoração" />
                <div className="space-y-1.5">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-gray-500">Alergias</p>
                    <p
                      className={`text-[11px] ${data.alergias ? "font-semibold text-red-700" : "text-gray-400"}`}
                    >
                      {data.alergias || "Nenhuma registrada"}
                    </p>
                  </div>
                  {data.comentariosAdicionais ? (
                    <div>
                      <p className="text-[9px] font-bold uppercase text-gray-500">Comentários</p>
                      <p className="text-[11px] text-gray-900">{data.comentariosAdicionais}</p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              {data.labResults.length > 0 ? (
                <SectionCard>
                  <SectionHeader title="Exames Laboratoriais" />
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[9px]">
                      <thead>
                        <tr className="bg-gray-50">
                          {["Hora", "pH", "pCO₂", "pO₂", "bic/BE", "K⁺", "Na⁺", "Gluc", "Lact"].map(
                            (col) => (
                              <th
                                key={col}
                                className="border border-gray-300 px-1 py-0.5 font-bold text-gray-600"
                              >
                                {col}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {data.labResults.map((row, index) => (
                          <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {(
                              [
                                "hora",
                                "ph",
                                "pco2",
                                "po2",
                                "bicBe",
                                "k",
                                "na",
                                "gluc",
                                "lact",
                              ] as const
                            ).map((col) => (
                              <td
                                key={col}
                                className="border border-gray-300 px-1 py-0.5 text-center text-gray-900"
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>

          {/* Signature */}
          <SectionCard>
            <div className="grid grid-cols-3 gap-8 pt-2">
              <div className="text-center">
                <div className="mb-1 h-8 border-b border-gray-700" />
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                  Anestesiologista Responsável
                </p>
              </div>
              <div className="text-center">
                <div className="mb-1 h-8 border-b border-gray-700" />
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                  CRM / RQE
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-[11px] text-gray-800">{today}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                  Data do Procedimento
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  },
);
