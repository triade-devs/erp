"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PreAvaliacaoData } from "../../types";
import { DOENCAS_OPTIONS } from "../../types";
import { SectionCard } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function DoencasSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Doenças e sintomas"
      description="Marque os antecedentes relevantes e registre observações adicionais."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {DOENCAS_OPTIONS.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={data.doencas[item.key]}
              onCheckedChange={(checked) =>
                onChange({
                  doencas: { ...data.doencas, [item.key]: checked === true },
                })
              }
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Comentários dos dados positivos</Label>
        <Textarea
          value={data.comentariosDoencas}
          onChange={(event) => onChange({ comentariosDoencas: event.target.value })}
        />
      </div>
    </SectionCard>
  );
}
