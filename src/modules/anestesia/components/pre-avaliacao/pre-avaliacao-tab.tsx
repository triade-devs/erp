"use client";

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
  return (
    <>
      {/* Interactive form — hidden on print */}
      <div className="space-y-4 print:hidden">
        <IdentificacaoSection data={data} onChange={onChange} />
        <DoencasSection data={data} onChange={onChange} />
        <MedicamentosSection data={data} onChange={onChange} />
        <SinaisVitaisSection data={data} onChange={onChange} />
        <ExamesSection data={data} onChange={onChange} />
        <ExameFisicoSection data={data} onChange={onChange} />
        <ConclusaoSection data={data} onChange={onChange} />
      </div>

      {/* Print layout — shown only when printing */}
      <PreAvaliacaoPrintLayout data={data} />
    </>
  );
}
