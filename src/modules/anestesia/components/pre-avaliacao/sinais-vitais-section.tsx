"use client";

import { Input } from "@/components/ui/input";
import type { PreAvaliacaoData } from "../../types";
import { calcularIMC, classificarIMC, formatarIMC } from "../../utils/session";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

const vitalsFields = [
  { key: "peso", label: "Peso", suffix: "kg" },
  { key: "altura", label: "Altura", suffix: "m" },
  { key: "pa", label: "PA", suffix: "mmHg" },
  { key: "temperatura", label: "Temperatura", suffix: "°C" },
] as const;

export function SinaisVitaisSection({ data, onChange }: Props) {
  const imc = calcularIMC(data.peso, data.altura);
  const imcFormatado = formatarIMC(imc);
  const imcClassificacao = classificarIMC(imc);

  return (
    <SectionCard
      title="Sinais vitais"
      description="Valores iniciais para referência clínica e impressão."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {vitalsFields.map((field) => (
          <div key={field.key} className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                className={formInputClassName}
                value={data[field.key]}
                onChange={(event) =>
                  onChange({ [field.key]: event.target.value } as Partial<PreAvaliacaoData>)
                }
              />
              <span className="text-xs text-muted-foreground">{field.suffix}</span>
            </div>
          </div>
        ))}

        {/* IMC calculado */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-muted-foreground">IMC</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{imcFormatado}</span>
            {imc !== null && <span className="text-xs text-muted-foreground">kg/m²</span>}
          </div>
          {imcClassificacao && (
            <p className="mt-1 text-xs text-muted-foreground">{imcClassificacao}</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
