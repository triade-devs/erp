"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PreAvaliacaoData } from "../../types";
import { ASA_OPTIONS } from "../../types";
import { SectionCard } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function ConclusaoSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Conclusão"
      description="Formalize o parecer clínico, classificação ASA e liberação do paciente."
    >
      <div className="space-y-2">
        <Label>Parecer clínico</Label>
        <Textarea
          value={data.parecerClinico}
          onChange={(event) => onChange({ parecerClinico: event.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
        <div className="space-y-2">
          <Label>ASA</Label>
          <Select
            value={data.asa || undefined}
            onValueChange={(value) => onChange({ asa: value as PreAvaliacaoData["asa"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {ASA_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          <Checkbox
            checked={data.emergencia}
            onCheckedChange={(checked) => onChange({ emergencia: checked === true })}
            className="border-destructive data-[state=checked]:bg-destructive"
          />
          Emergência
        </label>
      </div>

      <div className="space-y-4 pt-6">
        <div className="border-b border-dashed border-foreground/30" />
        <p className="text-center text-sm text-muted-foreground">
          Assinatura do anestesiologista responsável
        </p>
      </div>
    </SectionCard>
  );
}
