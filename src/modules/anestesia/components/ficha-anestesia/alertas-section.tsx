"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FichaAnestesiaData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const monitorOptions = [
  { key: "oximetria", label: "Oximetria" },
  { key: "ecg", label: "ECG (DII/V5)" },
  { key: "pani", label: "PANI" },
  { key: "capnografia", label: "Capnografia" },
] as const;

export function AlertasSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Alertas e monitoração"
      description="Alergias, observações complementares e monitores ativos."
    >
      <div className="space-y-2">
        <Label>Alergias</Label>
        <Input
          className={`${formInputClassName} border-destructive/20 text-destructive`}
          value={data.alergias}
          onChange={(event) => onChange({ alergias: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Comentários adicionais</Label>
        <Textarea
          value={data.comentariosAdicionais}
          onChange={(event) => onChange({ comentariosAdicionais: event.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {monitorOptions.map((item) => (
          <label key={item.key} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={data.monitoracao[item.key]}
              onCheckedChange={(checked) =>
                onChange({ monitoracao: { ...data.monitoracao, [item.key]: checked === true } })
              }
            />
            {item.label}
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
