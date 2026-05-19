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
    <>
      <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
        <p className="max-w-sm text-sm">
          Resumo consolidado para o centro cirúrgico. Inclui dados críticos das duas fichas em uma
          página A4.
        </p>
        <Button onClick={() => handlePrint()}>Imprimir Resumo</Button>
      </div>

      {/* Layout oculto na tela — usado pelo react-to-print */}
      <div className="hidden">
        <ResumoPrintLayout
          ref={printRef}
          preAvaliacao={preAvaliacao}
          fichaAnestesia={fichaAnestesia}
        />
      </div>
    </>
  );
}
