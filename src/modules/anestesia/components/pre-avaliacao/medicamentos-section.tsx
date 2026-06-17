"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PreAvaliacaoData } from "../../types";
import { SectionCard } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function MedicamentosSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Medicamentos e jejum"
      description="Registre medicações atuais e a orientação de jejum."
    >
      <div className="space-y-2">
        <Label>Medicamentos em uso</Label>
        <Textarea
          value={data.medicamentosEmUso}
          onChange={(event) => onChange({ medicamentosEmUso: event.target.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>Jejum orientado</Label>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Sim", value: true },
            { label: "Não", value: false },
          ].map((option) => {
            const id = `jejum-${option.label.toLowerCase()}`;
            const checked = data.jejumOrientado === option.value;
            return (
              <label
                key={id}
                htmlFor={id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  id={id}
                  type="radio"
                  checked={checked}
                  onChange={() => onChange({ jejumOrientado: option.value })}
                />
                {option.label}
              </label>
            );
          })}
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm text-muted-foreground"
            onClick={() => onChange({ jejumOrientado: null })}
          >
            Limpar resposta
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
