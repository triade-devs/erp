"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import type { PreAvaliacaoData } from "../../types";
import { ConclusaoSection } from "./conclusao-section";
import { DoencasSection } from "./doencas-section";
import { ExameFisicoSection } from "./exame-fisico-section";
import { ExamesSection } from "./exames-section";
import { IdentificacaoSection } from "./identificacao-section";
import { MedicamentosSection } from "./medicamentos-section";
import { PreAvaliacaoPrintLayout } from "./pre-avaliacao-print-layout";
import { SinaisVitaisSection } from "./sinais-vitais-section";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function PreAvaliacaoTab({ data, onChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Avaliação Pré-Anestésica",
    pageStyle: `
      @page { size: A4 portrait; margin: 12mm 10mm; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  return (
    <>
      {/* Interactive form */}
      <div className="space-y-4">
        <IdentificacaoSection data={data} onChange={onChange} />
        <DoencasSection data={data} onChange={onChange} />
        <MedicamentosSection data={data} onChange={onChange} />
        <SinaisVitaisSection data={data} onChange={onChange} />
        <ExamesSection data={data} onChange={onChange} />
        <ExameFisicoSection data={data} onChange={onChange} />
        <ConclusaoSection data={data} onChange={onChange} onPrint={handlePrint} />
      </div>

      {/* Print layout — hidden on screen, used by react-to-print */}
      <div className="hidden">
        <PreAvaliacaoPrintLayout ref={printRef} data={data} />
      </div>
    </>
  );
}
