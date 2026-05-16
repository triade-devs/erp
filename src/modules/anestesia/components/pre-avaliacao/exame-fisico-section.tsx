"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PreAvaliacaoData } from "../../types";
import { MALLAMPATI_OPTIONS } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function ExameFisicoSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Exame físico"
      description="Avaliação de via aérea, sistemas e estratégias de segurança."
    >
      <div className="space-y-3">
        <Label>Mallampati</Label>
        <div className="flex flex-wrap gap-3">
          {MALLAMPATI_OPTIONS.map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="mallampati"
                className="peer sr-only"
                checked={data.mallampati === option}
                onChange={() => onChange({ mallampati: option })}
              />
              <span className="inline-flex h-10 min-w-12 items-center justify-center rounded-lg border border-input px-4 text-sm peer-checked:border-primary peer-checked:bg-primary/5">
                {option}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Cabeça/Pescoço</Label>
          <Input
            className={formInputClassName}
            value={data.cabecaPescoco}
            onChange={(event) => onChange({ cabecaPescoco: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>SNC/Coluna</Label>
          <Input
            className={formInputClassName}
            value={data.sncColuna}
            onChange={(event) => onChange({ sncColuna: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Resp/CV</Label>
        <Textarea
          value={data.respCV}
          onChange={(event) => onChange({ respCV: event.target.value })}
        />
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
        <Checkbox
          checked={data.suspeitaVAD}
          onCheckedChange={(checked) => onChange({ suspeitaVAD: checked === true })}
          className="border-destructive data-[state=checked]:bg-destructive"
        />
        Suspeita de Via Aérea Difícil
      </label>

      <div className="space-y-2">
        <Label>Condutas / Observações / Plano A e B</Label>
        <Textarea
          value={data.condutasVAD}
          onChange={(event) => onChange({ condutasVAD: event.target.value })}
        />
      </div>
    </SectionCard>
  );
}
