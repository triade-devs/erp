"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { ResumoPrintLayout } from "./resumo-print-layout";

type Props = {
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
};

export function ResumoTab({ preAvaliacao, fichaAnestesia }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Resumo Cirúrgico",
    pageStyle: `
      @page { size: A4 portrait; margin: 12mm 10mm; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handlePrint}>Imprimir Resumo</Button>
      </div>

      {/* Preview — também usado pelo react-to-print */}
      <div className="overflow-auto rounded-lg border bg-white p-6 shadow-sm">
        <ResumoPrintLayout
          ref={printRef}
          preAvaliacao={preAvaliacao}
          fichaAnestesia={fichaAnestesia}
        />
      </div>
    </div>
  );
}
