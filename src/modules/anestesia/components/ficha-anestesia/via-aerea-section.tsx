"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FichaAnestesiaData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const viaAereaOptions = [
  { key: "iot", label: "IOT" },
  { key: "mascaraFacialO2", label: "Máscara Facial O2" },
  { key: "cateterNasal", label: "Cateter Nasal" },
  { key: "mascaraLaringea", label: "Máscara Laríngea" },
  { key: "outra", label: "Outra" },
] as const;

export function ViaAereaSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Via aérea"
      description="Registre o dispositivo utilizado e detalhes da intubação orotraqueal."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {viaAereaOptions.map((item) => (
          <label key={item.key} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={data.viaAerea[item.key]}
              onCheckedChange={(checked) =>
                onChange({ viaAerea: { ...data.viaAerea, [item.key]: checked === true } })
              }
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            <Label>Cuff</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "com", label: "Com" },
                { value: "sem", label: "Sem" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    data.iotCuff === option.value
                      ? "rounded-lg border border-primary bg-primary/5 px-4 py-2 text-sm"
                      : "rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground"
                  }
                  onClick={() =>
                    onChange({ iotCuff: option.value as FichaAnestesiaData["iotCuff"] })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Dificuldade</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "facil", label: "Fácil" },
                { value: "dificil", label: "Difícil" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    data.iotDificuldade === option.value
                      ? "rounded-lg border border-primary bg-primary/5 px-4 py-2 text-sm"
                      : "rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground"
                  }
                  onClick={() =>
                    onChange({
                      iotDificuldade: option.value as FichaAnestesiaData["iotDificuldade"],
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nº do Tubo</Label>
            <Input
              className={formInputClassName}
              value={data.iotTubo}
              onChange={(event) => onChange({ iotTubo: event.target.value })}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
