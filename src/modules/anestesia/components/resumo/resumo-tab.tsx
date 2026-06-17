"use client";

import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { ResumoPrintLayout } from "./resumo-print-layout";

type Props = {
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
};

export function ResumoTab({ preAvaliacao, fichaAnestesia }: Props) {
  return (
    <div className="overflow-auto rounded-lg border bg-white p-6 shadow-sm" style={{ zoom: 1.5 }}>
      <ResumoPrintLayout preAvaliacao={preAvaliacao} fichaAnestesia={fichaAnestesia} />
    </div>
  );
}
