"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  preAvaliacao: PreAvaliacaoData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const stripItems = [
  { label: "Peso", value: (pre: PreAvaliacaoData, ficha: FichaAnestesiaData) => pre.peso || "—" },
  { label: "Altura", value: (pre: PreAvaliacaoData) => pre.altura || "—" },
  { label: "PA", value: (pre: PreAvaliacaoData) => pre.pa || "—" },
  {
    label: "FC",
    value: (_pre: PreAvaliacaoData, ficha: FichaAnestesiaData) => ficha.vitals[0]?.fc || "—",
  },
] as const;

export function DadosPacienteSection({ data, preAvaliacao, onChange }: Props) {
  return (
    <SectionCard
      title="Dados do paciente"
      description="Campos editáveis para identificação e conferência antes da cirurgia."
    >
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border bg-background">
              <AvatarFallback>
                <UserRound className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">Ficha de Anestesia</p>
              <p className="text-sm text-muted-foreground">
                Registro intraoperatório e monitorização
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {stripItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border bg-background px-3 py-2 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-sm font-semibold">{item.value(preAvaliacao, data)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { key: "paciente", label: "Paciente" },
          { key: "data", label: "Data", type: "date" },
          { key: "clinica", label: "Clínica" },
          { key: "cirurgia", label: "Cirurgia" },
          { key: "cirurgiao", label: "Cirurgião" },
          { key: "anestesiologista", label: "Anestesiologista" },
        ].map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              type={field.type}
              className={formInputClassName}
              value={data[field.key as keyof FichaAnestesiaData] as string}
              onChange={(event) =>
                onChange({ [field.key]: event.target.value } as Partial<FichaAnestesiaData>)
              }
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
