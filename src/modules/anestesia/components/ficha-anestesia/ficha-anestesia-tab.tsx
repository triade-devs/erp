"use client";

import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { AcessosSection } from "./acessos-section";
import { AlertasSection } from "./alertas-section";
import { DadosPacienteSection } from "./dados-paciente-section";
import { LabResultsSection } from "./lab-results-section";
import { MedicacaoTecnicaSection } from "./medicacao-tecnica-section";
import { MedicacoesTable } from "./medicacoes-table";
import { VentilacaoSection } from "./ventilacao-section";
import { ViaAereaSection } from "./via-aerea-section";
import { VitalsGrid } from "./vitals-grid";

type Props = {
  data: FichaAnestesiaData;
  preAvaliacao: PreAvaliacaoData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

export function FichaAnestesiaTab({ data, preAvaliacao, onChange }: Props) {
  return (
    <div className="space-y-4">
      <DadosPacienteSection data={data} preAvaliacao={preAvaliacao} onChange={onChange} />
      <MedicacaoTecnicaSection data={data} onChange={onChange} />
      <VentilacaoSection data={data} onChange={onChange} />
      <ViaAereaSection data={data} onChange={onChange} />
      <VitalsGrid data={data} onChange={onChange} />
      <AcessosSection data={data} onChange={onChange} />
      <MedicacoesTable data={data} onChange={onChange} />
      <AlertasSection data={data} onChange={onChange} />
      <LabResultsSection data={data} onChange={onChange} />
    </div>
  );
}
