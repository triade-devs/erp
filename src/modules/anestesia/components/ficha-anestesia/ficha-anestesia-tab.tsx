"use client";

import { useMemo } from "react";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { buildTimeLabels } from "../../services/session";
import { AcessosSection } from "./acessos-section";
import { AlertasSection } from "./alertas-section";
import { DadosPacienteSection } from "./dados-paciente-section";
import { LabResultsSection } from "./lab-results-section";
import { MedicacaoTecnicaSection } from "./medicacao-tecnica-section";
import { MedicacoesTable } from "./medicacoes-table";
import { MonitorTimelineChart } from "./monitor-timeline-chart";
import { VentilacaoSection } from "./ventilacao-section";
import { ViaAereaSection } from "./via-aerea-section";
import { VitalsGrid } from "./vitals-grid";

type Props = {
  data: FichaAnestesiaData;
  preAvaliacao: PreAvaliacaoData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

export function FichaAnestesiaTab({ data, preAvaliacao, onChange }: Props) {
  const timeLabels = useMemo(
    () => buildTimeLabels(data.vitalsHoraInicio, data.vitalsInterval),
    [data.vitalsHoraInicio, data.vitalsInterval],
  );

  return (
    <div className="space-y-4">
      <DadosPacienteSection data={data} preAvaliacao={preAvaliacao} onChange={onChange} />
      <MedicacaoTecnicaSection data={data} onChange={onChange} />
      <VentilacaoSection data={data} onChange={onChange} />
      <ViaAereaSection data={data} onChange={onChange} />
      <VitalsGrid data={data} onChange={onChange} />
      {data.monitoracao.oximetria ? (
        <MonitorTimelineChart
          title="Oximetria (SpO2)"
          description="Saturação periférica de oxigênio ao longo do procedimento."
          label="SpO2 %"
          color="#0ea5e9"
          values={data.spo2}
          timeLabels={timeLabels}
          yMin={60}
          yMax={100}
          textFields={[
            {
              label: "Posição",
              value: data.oximetriaPosicao,
              onChange: (v) => onChange({ oximetriaPosicao: v }),
            },
          ]}
          onChange={(values) => onChange({ spo2: values })}
        />
      ) : null}
      {data.monitoracao.capnografia ? (
        <MonitorTimelineChart
          title="Capnografia (EtCO2)"
          description="Concentração expirada de CO2 ao longo do procedimento."
          label="EtCO2 mmHg"
          color="#a855f7"
          values={data.etco2}
          timeLabels={timeLabels}
          yMin={0}
          yMax={80}
          textFields={[
            {
              label: "Posição",
              value: data.etco2Posicao,
              onChange: (v) => onChange({ etco2Posicao: v }),
            },
          ]}
          onChange={(values) => onChange({ etco2: values })}
        />
      ) : null}
      <AcessosSection data={data} onChange={onChange} />
      <MedicacoesTable data={data} onChange={onChange} />
      <AlertasSection data={data} onChange={onChange} />
      <LabResultsSection data={data} onChange={onChange} />
    </div>
  );
}
