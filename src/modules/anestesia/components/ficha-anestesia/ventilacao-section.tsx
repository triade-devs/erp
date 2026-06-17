"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { FichaAnestesiaData } from "../../types";
import { SectionCard } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const options = [
  { key: "espontanea", label: "Espontânea" },
  { key: "assistida", label: "Assistida" },
  { key: "contMecanica", label: "Contenção Mecânica" },
  { key: "contManual", label: "Contenção Manual" },
  { key: "comReinalante", label: "Com Reinalante" },
  { key: "semReinalante", label: "Sem Reinalante" },
] as const;

export function VentilacaoSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Ventilação"
      description="Selecione as modalidades utilizadas durante o ato anestésico."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {options.map((item) => (
          <label key={item.key} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={data.ventilacao[item.key]}
              onCheckedChange={(checked) =>
                onChange({ ventilacao: { ...data.ventilacao, [item.key]: checked === true } })
              }
            />
            {item.label}
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
