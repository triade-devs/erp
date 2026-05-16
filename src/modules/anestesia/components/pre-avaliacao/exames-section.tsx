"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PreAvaliacaoData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

const examFields = [
  { key: "hb", label: "Hb" },
  { key: "vg", label: "VG" },
  { key: "leuc", label: "Leuc" },
  { key: "glic", label: "Glic" },
  { key: "na", label: "Na" },
  { key: "k", label: "K" },
] as const;

export function ExamesSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Exames"
      description="Resultados laboratoriais relevantes para avaliação perioperatória."
    >
      <div className="grid gap-4 md:grid-cols-6">
        {examFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              className={formInputClassName}
              value={data[field.key]}
              onChange={(event) =>
                onChange({ [field.key]: event.target.value } as Partial<PreAvaliacaoData>)
              }
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Outros exames</Label>
        <Input
          className={formInputClassName}
          value={data.outrosExames}
          onChange={(event) => onChange({ outrosExames: event.target.value })}
        />
      </div>
    </SectionCard>
  );
}
