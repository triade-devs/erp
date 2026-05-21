// src/modules/anestesia/components/resumo/resumo-print-layout.tsx
"use client";

import { forwardRef } from "react";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { DOENCAS_OPTIONS } from "../../types";
import {
  calcularIMC,
  calcularPesoPredito,
  classificarIMC,
  formatarIMC,
  formatarPesoPredito,
} from "../../services/session";

type Props = {
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
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
  ecg: "ECG",
  pani: "PANI",
  capnografia: "Capnografia",
};

const estadoAdmissaoLabels: Record<string, string> = {
  calmo: "Calmo",
  tenso: "Tenso",
  sonolento: "Sonolento",
  dormindo: "Dormindo",
};

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-gray-200 bg-white p-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-[10px]">
      <span className="font-medium text-gray-500">{label}: </span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

type BadgeVariant = "default" | "blue" | "red" | "yellow" | "orange";

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: "bg-gray-100 text-gray-700",
    blue: "bg-blue-50 text-blue-800 border border-blue-200",
    red: "bg-red-100 text-red-700 border border-red-300",
    yellow: "bg-yellow-50 text-yellow-800 border border-yellow-300",
    orange: "bg-orange-50 text-orange-800 border border-orange-300",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}

export const ResumoPrintLayout = forwardRef<HTMLDivElement, Props>(function ResumoPrintLayout(
  { preAvaliacao, fichaAnestesia },
  ref,
) {
  const imc = calcularIMC(preAvaliacao.peso, preAvaliacao.altura);
  const pesoPredito = calcularPesoPredito(preAvaliacao.altura, preAvaliacao.sexo);
  const doencasPositivas = DOENCAS_OPTIONS.filter((d) => preAvaliacao.doencas[d.key]);

  const asaValue = fichaAnestesia.asaStatus
    ? `ASA ${fichaAnestesia.asaStatus}`
    : preAvaliacao.asa || null;
  const hasVAD = preAvaliacao.suspeitaVAD;
  const hasEmergencia = fichaAnestesia.emergencia || preAvaliacao.emergencia;
  const alergiasText = fichaAnestesia.alergias?.trim() || null;
  const hasAlerts = hasVAD || !!asaValue || hasEmergencia || !!alergiasText;

  const tecnicaAtiva = Object.entries(fichaAnestesia.tecnica)
    .filter(([, v]) => v)
    .map(([k]) => tecnicaLabels[k] ?? k);

  const ventilacaoAtiva = Object.entries(fichaAnestesia.ventilacao)
    .filter(([, v]) => v)
    .map(([k]) => ventilacaoLabels[k] ?? k);

  const viaAereaAtiva = Object.entries(fichaAnestesia.viaAerea)
    .filter(([, v]) => v)
    .map(([k]) => viaAereaLabels[k] ?? k);

  const monitoracaoAtiva = Object.entries(fichaAnestesia.monitoracao)
    .filter(([, v]) => v)
    .map(([k]) => monitoracaoLabels[k] ?? k);

  const estadoAtivo = Object.entries(fichaAnestesia.estadoAdmissao)
    .filter(([, v]) => v)
    .map(([k]) => estadoAdmissaoLabels[k] ?? k)
    .join(", ");

  const acessosAtivos: { label: string; calibre: string; local: string }[] = [
    ...fichaAnestesia.acessoPeriferico
      .filter((a) => a.ativo)
      .map((a, i) => ({
        label:
          fichaAnestesia.acessoPeriferico.filter((x) => x.ativo).length > 1
            ? `Periférico ${i + 1}`
            : "Periférico",
        calibre: a.calibre,
        local: a.local,
      })),
    ...[
      { label: "Intraósseo", a: fichaAnestesia.acessoIntraosseo },
      { label: "V. Central", a: fichaAnestesia.acessoVenosoCentral },
      { label: "PAI", a: fichaAnestesia.acessoPAI },
    ]
      .filter(({ a }) => a.ativo)
      .map(({ label, a }) => ({ label, calibre: a.calibre, local: a.local })),
  ];

  const hasExames = [
    preAvaliacao.hb,
    preAvaliacao.vg,
    preAvaliacao.leuc,
    preAvaliacao.glic,
    preAvaliacao.na,
    preAvaliacao.k,
    preAvaliacao.outrosExames,
  ].some(Boolean);

  const hasExameFisico = [
    preAvaliacao.mallampati,
    preAvaliacao.cabecaPescoco,
    preAvaliacao.sncColuna,
    preAvaliacao.respCV,
  ].some(Boolean);

  const hasHorarios = [
    fichaAnestesia.inicioAnestesia,
    fichaAnestesia.inicioCirurgia,
    fichaAnestesia.terminoCirurgia,
    fichaAnestesia.terminoAnestesia,
  ].some(Boolean);

  return (
    <div
      ref={ref}
      className="bg-white font-sans text-gray-900"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between rounded bg-[#1e3a5f] px-3 py-2 text-white">
        <div>
          <p className="text-[13px] font-bold leading-tight">{preAvaliacao.nomePaciente || "—"}</p>
          <p className="text-[10px] opacity-85">
            {[
              preAvaliacao.cirurgiaProposta,
              preAvaliacao.clinica,
              preAvaliacao.registro ? `Reg. #${preAvaliacao.registro}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="text-right text-[10px] opacity-85">
          {fichaAnestesia.anestesiologista && <p>{fichaAnestesia.anestesiologista}</p>}
          {fichaAnestesia.cirurgiao && <p>Cirurgião: {fichaAnestesia.cirurgiao}</p>}
          {fichaAnestesia.data && <p>{fichaAnestesia.data}</p>}
        </div>
      </div>

      {/* Alert strip */}
      {hasAlerts && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {hasVAD && <Badge variant="red">⚠ Via Aérea Difícil</Badge>}
          {asaValue && <Badge variant="yellow">{asaValue}</Badge>}
          {hasEmergencia && <Badge variant="red">🚨 Emergência</Badge>}
          {alergiasText && <Badge variant="orange">Alergia: {alergiasText}</Badge>}
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left: Pré-Avaliação */}
        <div className="space-y-2">
          <SectionCard>
            <SectionLabel title="Pré-Avaliação" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <Field label="Idade" value={preAvaliacao.idade} />
              <Field label="Sexo" value={preAvaliacao.sexo} />
            </div>
          </SectionCard>

          {doencasPositivas.length > 0 && (
            <SectionCard>
              <SectionLabel title="Doenças Positivas" />
              <div className="flex flex-wrap gap-1">
                {doencasPositivas.map((d) => (
                  <Badge key={d.key}>{d.label}</Badge>
                ))}
              </div>
              {preAvaliacao.comentariosDoencas && (
                <p className="mt-1 text-[10px] text-gray-700">{preAvaliacao.comentariosDoencas}</p>
              )}
            </SectionCard>
          )}

          {(preAvaliacao.medicamentosEmUso || preAvaliacao.jejumOrientado !== null) && (
            <SectionCard>
              <SectionLabel title="Medicamentos" />
              {preAvaliacao.medicamentosEmUso && (
                <p className="text-[10px] text-gray-900">{preAvaliacao.medicamentosEmUso}</p>
              )}
              {preAvaliacao.jejumOrientado !== null && (
                <p className="mt-0.5 text-[10px]">
                  <span className="font-medium text-gray-500">Jejum: </span>
                  {preAvaliacao.jejumOrientado ? "Sim" : "Não"}
                </p>
              )}
            </SectionCard>
          )}

          {(preAvaliacao.peso ||
            preAvaliacao.altura ||
            preAvaliacao.pa ||
            preAvaliacao.temperatura) && (
            <SectionCard>
              <SectionLabel title="Sinais Vitais" />
              <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                <Field label="Peso" value={preAvaliacao.peso ? `${preAvaliacao.peso} kg` : ""} />
                <Field
                  label="Altura"
                  value={preAvaliacao.altura ? `${preAvaliacao.altura} m` : ""}
                />
                {imc !== null && (
                  <div className="text-[10px]">
                    <span className="font-medium text-gray-500">IMC: </span>
                    <span className="font-semibold text-blue-800">{formatarIMC(imc)}</span>{" "}
                    <span className="text-gray-500">{classificarIMC(imc)}</span>
                  </div>
                )}
                <Field label="PA" value={preAvaliacao.pa ? `${preAvaliacao.pa} mmHg` : ""} />
                <Field
                  label="Temp"
                  value={preAvaliacao.temperatura ? `${preAvaliacao.temperatura} °C` : ""}
                />
                {pesoPredito !== null && (
                  <Field label="P. Pred." value={`${formatarPesoPredito(pesoPredito)} kg`} />
                )}
              </div>
            </SectionCard>
          )}

          {hasExames && (
            <SectionCard>
              <SectionLabel title="Exames" />
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <Field label="Hb" value={preAvaliacao.hb} />
                <Field label="VG" value={preAvaliacao.vg} />
                <Field label="Leuc" value={preAvaliacao.leuc} />
                <Field label="Glic" value={preAvaliacao.glic} />
                <Field label="Na" value={preAvaliacao.na} />
                <Field label="K" value={preAvaliacao.k} />
              </div>
              {preAvaliacao.outrosExames && (
                <Field label="Outros" value={preAvaliacao.outrosExames} />
              )}
            </SectionCard>
          )}

          {hasExameFisico && (
            <SectionCard className={hasVAD ? "border-red-200 bg-red-50" : ""}>
              <SectionLabel
                title={`Exame Físico${preAvaliacao.mallampati ? ` · Mallampati ${preAvaliacao.mallampati}` : ""}`}
              />
              <div className="space-y-0.5">
                <Field label="Cabeça/Pescoço" value={preAvaliacao.cabecaPescoco} />
                <Field label="SNC/Coluna" value={preAvaliacao.sncColuna} />
                <Field label="Resp/CV" value={preAvaliacao.respCV} />
                {hasVAD && preAvaliacao.condutasVAD && (
                  <div className="mt-1 text-[10px]">
                    <span className="font-medium text-red-600">Plano VAD: </span>
                    <span className="text-gray-900">{preAvaliacao.condutasVAD}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {preAvaliacao.parecerClinico && (
            <SectionCard>
              <SectionLabel title="Parecer Clínico" />
              <p className="text-[10px] text-gray-900">{preAvaliacao.parecerClinico}</p>
            </SectionCard>
          )}
        </div>

        {/* Right: Intraoperatório */}
        <div className="space-y-2">
          {(estadoAtivo || hasHorarios) && (
            <SectionCard>
              <SectionLabel title="Intraoperatório" />
              <div className="space-y-0.5">
                {estadoAtivo && <Field label="Admissão" value={estadoAtivo} />}
                {hasHorarios && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <Field label="Início anest." value={fichaAnestesia.inicioAnestesia} />
                    <Field label="Início cir." value={fichaAnestesia.inicioCirurgia} />
                    <Field label="Término cir." value={fichaAnestesia.terminoCirurgia} />
                    <Field label="Término anest." value={fichaAnestesia.terminoAnestesia} />
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {(tecnicaAtiva.length > 0 || ventilacaoAtiva.length > 0 || viaAereaAtiva.length > 0) && (
            <SectionCard>
              <SectionLabel title="Técnica · Ventilação · Via Aérea" />
              <div className="mb-1 flex flex-wrap gap-1">
                {tecnicaAtiva.map((t) => (
                  <Badge key={t} variant="blue">
                    {t}
                  </Badge>
                ))}
                {ventilacaoAtiva.map((v) => (
                  <Badge key={v} variant="blue">
                    {v}
                  </Badge>
                ))}
                {viaAereaAtiva.map((v) => (
                  <Badge key={v} variant="blue">
                    {v}
                  </Badge>
                ))}
              </div>
              {fichaAnestesia.viaAerea.iot && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                  {fichaAnestesia.iotCuff && (
                    <Field
                      label="Cuff"
                      value={fichaAnestesia.iotCuff === "com" ? "Com cuff" : "Sem cuff"}
                    />
                  )}
                  {fichaAnestesia.iotDificuldade && (
                    <Field
                      label="Dificuldade"
                      value={fichaAnestesia.iotDificuldade === "facil" ? "Fácil" : "Difícil"}
                    />
                  )}
                  <Field label="Tubo" value={fichaAnestesia.iotTubo} />
                </div>
              )}
            </SectionCard>
          )}

          {monitoracaoAtiva.length > 0 && (
            <SectionCard>
              <SectionLabel title="Monitoração" />
              <div className="flex flex-wrap gap-1">
                {monitoracaoAtiva.map((m) => (
                  <Badge key={m}>{m}</Badge>
                ))}
              </div>
            </SectionCard>
          )}

          {acessosAtivos.length > 0 && (
            <SectionCard>
              <SectionLabel title="Acessos Vasculares" />
              <div className="space-y-0.5">
                {acessosAtivos.map(({ label, calibre, local }) => (
                  <div key={label} className="text-[10px]">
                    <span className="font-medium text-gray-500">{label}: </span>
                    {[calibre, local].filter(Boolean).join(" · ") || "—"}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {fichaAnestesia.medicacoes.length > 0 && (
            <SectionCard>
              <SectionLabel title="Medicações" />
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-0.5 pr-2 text-left font-semibold">Medicação</th>
                    <th className="py-0.5 pr-2 text-left font-semibold">Hora</th>
                    <th className="py-0.5 text-left font-semibold">Via</th>
                  </tr>
                </thead>
                <tbody>
                  {fichaAnestesia.medicacoes.map((m) => (
                    <tr key={m.id}>
                      <td className="py-0.5 pr-2">{m.descricao}</td>
                      <td className="py-0.5 pr-2">{m.hora}</td>
                      <td className="py-0.5">
                        {m.via}
                        {m.infContinua ? " (inf.)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}

          {fichaAnestesia.comentariosAdicionais && (
            <SectionCard>
              <SectionLabel title="Comentários" />
              <p className="text-[10px] text-gray-900">{fichaAnestesia.comentariosAdicionais}</p>
            </SectionCard>
          )}

          {fichaAnestesia.labResults.length > 0 && (
            <SectionCard>
              <SectionLabel title="Gasometria" />
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    {["Hora", "pH", "pCO2", "pO2", "Bic/BE", "K", "Na", "Gluc", "Lact"].map((h) => (
                      <th key={h} className="py-0.5 pr-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fichaAnestesia.labResults.map((r) => (
                    <tr key={r.id}>
                      <td className="py-0.5 pr-1">{r.hora}</td>
                      <td className="py-0.5 pr-1">{r.ph}</td>
                      <td className="py-0.5 pr-1">{r.pco2}</td>
                      <td className="py-0.5 pr-1">{r.po2}</td>
                      <td className="py-0.5 pr-1">{r.bicBe}</td>
                      <td className="py-0.5 pr-1">{r.k}</td>
                      <td className="py-0.5 pr-1">{r.na}</td>
                      <td className="py-0.5 pr-1">{r.gluc}</td>
                      <td className="py-0.5 pr-1">{r.lact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Signature */}
      <div className="mt-4 grid grid-cols-2 gap-8 border-t border-gray-300 pt-3 text-center">
        <div>
          <div className="mb-1 h-8 border-b border-gray-700" />
          <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
            Anestesiologista Responsável
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-gray-800">
            {fichaAnestesia.data || "___/___/______"}
          </p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Data</p>
        </div>
      </div>
    </div>
  );
});
