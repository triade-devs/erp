"use client";

import { useRef } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { AcessosSection } from "./acessos-section";
import { AlertasSection } from "./alertas-section";
import { DadosPacienteSection } from "./dados-paciente-section";
import { FichaAnestesiaPrintLayout } from "./ficha-anestesia-print-layout";
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
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ficha de Anestesia — ${data.paciente || "Paciente"}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm 8mm; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  return (
    <div className="space-y-4">
      <div className="hidden">
        <FichaAnestesiaPrintLayout ref={printRef} data={data} preAvaliacao={preAvaliacao} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => handlePrint()}>
          <Printer className="h-4 w-4" />
          IMPRIMIR
        </Button>
        <Button
          type="button"
          onClick={() => toast.success("Sessão finalizada localmente e pronta para impressão.")}
        >
          <CheckCircle2 className="h-4 w-4" />
          FINALIZAR
        </Button>
      </div>

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
