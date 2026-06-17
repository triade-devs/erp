"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreAvaliacaoData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

export function IdentificacaoSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Identificação"
      description="Dados básicos do paciente e procedimento proposto."
    >
      <div className="grid gap-4 md:grid-cols-12">
        <div className="space-y-2 md:col-span-4">
          <Label>Nome do paciente</Label>
          <Input
            className={formInputClassName}
            value={data.nomePaciente}
            onChange={(event) => onChange({ nomePaciente: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label>Idade</Label>
          <Input
            className={formInputClassName}
            value={data.idade}
            onChange={(event) => onChange({ idade: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label>Sexo</Label>
          <Select
            value={data.sexo || undefined}
            onValueChange={(value) => onChange({ sexo: value as PreAvaliacaoData["sexo"] })}
          >
            <SelectTrigger className={formInputClassName}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label>Clínica</Label>
          <Input
            className={formInputClassName}
            value={data.clinica}
            onChange={(event) => onChange({ clinica: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label>Registro</Label>
          <Input
            className={formInputClassName}
            value={data.registro}
            onChange={(event) => onChange({ registro: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-12">
          <Label>Cirurgia proposta</Label>
          <Input
            className={formInputClassName}
            value={data.cirurgiaProposta}
            onChange={(event) => onChange({ cirurgiaProposta: event.target.value })}
          />
        </div>
      </div>
    </SectionCard>
  );
}
