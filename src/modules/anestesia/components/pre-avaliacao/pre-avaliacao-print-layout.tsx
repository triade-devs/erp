"use client";

import { forwardRef } from "react";
import type { PreAvaliacaoData } from "../../types";
import { DOENCAS_OPTIONS } from "../../types";
import { calcularIMC, formatarIMC, classificarIMC } from "../../services/session";

type Props = {
  data: PreAvaliacaoData;
  dataAvaliacao?: string; // "DD/MM/AAAA"
};

function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="flex cursor-default items-start gap-2">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-gray-500 text-[10px] font-bold"
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
      <div className="flex h-8 w-full items-center border border-gray-300 bg-white px-2 text-[12px] text-gray-900">
        {value ?? ""}
      </div>
    </div>
  );
}

function PrintTextarea({
  label,
  value,
  rows = 3,
}: {
  label: string;
  value?: string;
  rows?: number;
}) {
  return (
    <div>
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <div
        className="min-h-0 w-full border border-gray-300 bg-white px-2 py-1 text-[12px] text-gray-900"
        style={{ minHeight: `${rows * 20}px` }}
      >
        {value ?? ""}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-blue-800">
      <h2 className="text-[11px] font-bold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-gray-200 bg-white p-3 shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

export const PreAvaliacaoPrintLayout = forwardRef<HTMLDivElement, Props>(
  function PreAvaliacaoPrintLayout({ data, dataAvaliacao }, ref) {
    const today =
      dataAvaliacao ??
      new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

    const imc = calcularIMC(data.peso, data.altura);

    const doencasCols = [
      DOENCAS_OPTIONS.slice(0, 7),
      DOENCAS_OPTIONS.slice(7, 14),
      DOENCAS_OPTIONS.slice(14, 21),
    ];

    return (
      <div
        ref={ref}
        className="bg-white font-sans text-gray-900"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        {/* Document Header */}
        <div className="mb-5 flex items-end justify-between border-b-2 border-blue-800 pb-3">
          <h1 className="text-[18px] font-bold text-gray-900">Avaliação Pré-Anestésica</h1>
          <div className="space-y-0.5 text-right">
            {data.registro ? (
              <div className="flex justify-end gap-1">
                <span className="text-[9px] font-bold uppercase text-gray-500">Prontuário:</span>
                <span className="text-[9px] font-bold text-gray-900">#{data.registro}</span>
              </div>
            ) : null}
            <div className="flex justify-end gap-1">
              <span className="text-[9px] font-bold uppercase text-gray-500">Data de Emissão:</span>
              <span className="text-[9px] font-bold text-gray-900">{today}</span>
            </div>
          </div>
        </div>

        {/* 12-column grid */}
        <div className="grid grid-cols-12 gap-3">
          {/* Identificação — full width */}
          <SectionCard className="col-span-12">
            <SectionHeader title="Identificação do Paciente" />
            <div className="grid grid-cols-12 gap-3">
              <PrintField
                label="Nome do Paciente"
                value={data.nomePaciente}
                className="col-span-4"
              />
              <PrintField label="Idade" value={data.idade} className="col-span-1" />
              <PrintField label="Sexo" value={data.sexo} className="col-span-1" />
              <PrintField label="Clínica" value={data.clinica} className="col-span-3" />
              <PrintField label="Registro" value={data.registro} className="col-span-3" />
              <PrintField
                label="Cirurgia Proposta"
                value={data.cirurgiaProposta}
                className="col-span-12"
              />
            </div>
          </SectionCard>

          {/* Doenças — 8 cols */}
          <SectionCard className="col-span-8">
            <SectionHeader title="Doenças ou Sintomas" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {doencasCols[0]?.map((item, i) => (
                <PrintCheckbox
                  key={item.key}
                  checked={data.doencas[item.key] ?? false}
                  label={`${i + 1}. ${item.label}`}
                />
              ))}
              {doencasCols[1]?.map((item, i) => (
                <PrintCheckbox
                  key={item.key}
                  checked={data.doencas[item.key] ?? false}
                  label={`${i + 8}. ${item.label}`}
                />
              ))}
              {doencasCols[2]?.map((item, i) => (
                <PrintCheckbox
                  key={item.key}
                  checked={data.doencas[item.key] ?? false}
                  label={`${i + 15}. ${item.label}`}
                />
              ))}
            </div>
            <div className="mt-3 border-t border-gray-200 pt-3">
              <PrintTextarea
                label="Comentários dos Dados Positivos"
                value={data.comentariosDoencas}
                rows={4}
              />
            </div>
          </SectionCard>

          {/* Medicamentos + Sinais Vitais — 4 cols */}
          <div className="col-span-4 space-y-3">
            <SectionCard>
              <SectionHeader title="Medicamentos em Uso" />
              <PrintTextarea label="" value={data.medicamentosEmUso} rows={5} />
              <div className="mt-3 flex items-center gap-4 rounded border border-gray-200 bg-gray-50 p-2">
                <span className="flex-1 text-[10px] font-bold">Jejum absoluto orientado?</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-500 text-[8px]">
                      {data.jejumOrientado === true ? "●" : ""}
                    </span>
                    <span className="text-[10px]">Sim</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-500 text-[8px]">
                      {data.jejumOrientado === false ? "●" : ""}
                    </span>
                    <span className="text-[10px]">Não</span>
                  </label>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader title="Sinais Vitais" />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Peso", value: data.peso, unit: "kg" },
                  { label: "Altura", value: data.altura, unit: "m" },
                  { label: "PA", value: data.pa, unit: "mmHg" },
                  { label: "Temp", value: data.temperatura, unit: "°C" },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded border border-gray-200 bg-gray-50 p-2">
                    <p className="text-[8px] font-bold uppercase text-gray-500">{label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14px] font-semibold">{value ?? ""}</span>
                      <span className="text-[9px] text-gray-400">{unit}</span>
                    </div>
                  </div>
                ))}
                <div className="col-span-2 rounded border border-gray-200 bg-blue-50 p-2">
                  <p className="text-[8px] font-bold uppercase text-gray-500">IMC</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[14px] font-semibold text-blue-800">
                      {formatarIMC(imc)}
                    </span>
                    {imc !== null && <span className="text-[9px] text-gray-400">kg/m²</span>}
                  </div>
                  {imc !== null && (
                    <p className="text-[9px] text-blue-700">{classificarIMC(imc)}</p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Exames Complementares — full width */}
          <SectionCard className="col-span-12">
            <SectionHeader title="Exames Complementares" />
            <div className="grid grid-cols-6 gap-3">
              {[
                { label: "Hb", value: data.hb, placeholder: "mg/dL" },
                { label: "VG", value: data.vg, placeholder: "%" },
                { label: "Leuc.", value: data.leuc, placeholder: "" },
                { label: "Glic.", value: data.glic, placeholder: "mg/dL" },
                { label: "Na", value: data.na, placeholder: "" },
                { label: "K", value: data.k, placeholder: "" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    {label}
                  </p>
                  <div className="flex h-7 w-full items-center border border-gray-300 bg-white px-2 text-[12px] text-gray-900">
                    {value ?? ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <PrintField
                label="Outros exames (Ureia, Creat, TT, TTPA, RNI, Plaq)"
                value={data.outrosExames}
                className=""
              />
            </div>
          </SectionCard>

          {/* Exame Físico — 6 cols */}
          <SectionCard className="col-span-6">
            <SectionHeader title="Exame Físico Específico" />
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  Mallampati
                </p>
                <div className="mb-2 flex gap-2">
                  {(["I", "II", "III", "IV"] as const).map((opt) => (
                    <span
                      key={opt}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        data.mallampati === opt
                          ? "border-blue-700 bg-blue-50 text-blue-800"
                          : "border-gray-300 text-gray-400"
                      }`}
                    >
                      Mallampati {opt}
                    </span>
                  ))}
                </div>
                <PrintField label="Cabeça/Pescoço" value={data.cabecaPescoco} className="" />
              </div>
              <PrintField label="SNC/Coluna" value={data.sncColuna} className="" />
              <PrintTextarea label="Aparelho Respiratório/CV" value={data.respCV} rows={3} />

              <div className="border-t border-gray-200 pt-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  Via Aérea Difícil
                </p>
                <div
                  className={`mb-2 flex items-center gap-2 rounded border p-2 ${data.suspeitaVAD ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center border text-[10px] font-bold ${data.suspeitaVAD ? "border-red-500 text-red-600" : "border-gray-400 text-transparent"}`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase ${data.suspeitaVAD ? "text-red-600" : "text-gray-400"}`}
                  >
                    Suspeita de Via Aérea Difícil
                  </span>
                </div>
                <PrintTextarea
                  label="Condutas / Observações / Plano A e B"
                  value={data.condutasVAD}
                  rows={3}
                />
              </div>
            </div>
          </SectionCard>

          {/* Conclusão & ASA — 6 cols */}
          <SectionCard className="col-span-6">
            <SectionHeader title="Conclusão & ASA" />
            <div className="space-y-3">
              <PrintTextarea label="Parecer Clínico" value={data.parecerClinico} rows={5} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    Estado Físico ASA
                  </p>
                  <div className="flex h-8 items-center border border-gray-300 bg-white px-2 text-[12px] font-bold text-blue-800">
                    {data.asa ?? ""}
                  </div>
                </div>
                <div className="flex items-end pb-0.5">
                  <div
                    className={`flex w-full items-center gap-2 rounded border p-2 ${data.emergencia ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center border text-[10px] font-bold ${data.emergencia ? "border-red-500 text-red-600" : "border-gray-400 text-transparent"}`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${data.emergencia ? "text-red-600" : "text-gray-400"}`}
                    >
                      Procedimento de Emergência
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="mt-6 grid grid-cols-2 gap-6 border-t border-gray-300 pt-3">
                <div className="text-center">
                  <div className="mb-1 h-8 border-b border-gray-700" />
                  <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                    Anestesiologista Responsável
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-1 text-[11px] text-gray-800">{today}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                    Data da Avaliação
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  },
);
