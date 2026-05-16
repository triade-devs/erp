"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FichaAnestesiaData } from "../../types";
import { ASA_STATUS_VALUES } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const estadoAdmissaoOptions = [
  { key: "calmo", label: "Calmo" },
  { key: "tenso", label: "Tenso" },
  { key: "sonolento", label: "Sonolento" },
  { key: "dormindo", label: "Dormindo" },
] as const;

const tecnicaOptions = [
  { key: "geral", label: "Geral" },
  { key: "raqui", label: "Raquianestesia" },
  { key: "sedacao", label: "Sedação" },
  { key: "peridural", label: "Peridural" },
  { key: "caudal", label: "Caudal" },
  { key: "bloqueioplexo", label: "Bloqueio de Plexo" },
] as const;

export function MedicacaoTecnicaSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Medicação e técnica anestésica"
      description="Defina a classificação ASA, técnica escolhida e tempos do procedimento."
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ASA_STATUS_VALUES.map((value) => {
            const active = data.asaStatus === value;
            return (
              <button
                key={value}
                type="button"
                className={
                  active
                    ? "rounded-lg border border-green-200 bg-green-100 px-4 py-2 text-sm font-medium text-green-800"
                    : "rounded-lg border border-input bg-white px-4 py-2 text-sm text-muted-foreground"
                }
                onClick={() => onChange({ asaStatus: value })}
              >
                ASA {value}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={
            data.emergencia
              ? "rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
              : "rounded-full border border-input px-4 py-2 text-sm text-muted-foreground"
          }
          onClick={() => onChange({ emergencia: !data.emergencia })}
        >
          Emergência
        </button>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Medicação pré-anestésica</p>
            <p className="text-xs text-muted-foreground">
              Ative para registrar sedação ou medicação prévia.
            </p>
          </div>
          <Switch
            checked={data.premedRealizada}
            onCheckedChange={(checked) => onChange({ premedRealizada: checked })}
          />
        </div>
        <Textarea
          value={data.premedDescricao}
          onChange={(event) => onChange({ premedDescricao: event.target.value })}
          placeholder="Descreva a medicação utilizada"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Label>Estado de admissão</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {estadoAdmissaoOptions.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <Checkbox
                  checked={data.estadoAdmissao[item.key]}
                  onCheckedChange={(checked) =>
                    onChange({
                      estadoAdmissao: { ...data.estadoAdmissao, [item.key]: checked === true },
                    })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Técnica anestésica</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {tecnicaOptions.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <Checkbox
                  checked={data.tecnica[item.key]}
                  onCheckedChange={(checked) =>
                    onChange({
                      tecnica: { ...data.tecnica, [item.key]: checked === true },
                    })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "inicioAnestesia", label: "Início Anestesia" },
          { key: "inicioCirurgia", label: "Início Cirurgia" },
          { key: "terminoCirurgia", label: "Término Cirurgia" },
          { key: "terminoAnestesia", label: "Término Anestesia" },
        ].map((item) => (
          <div key={item.key} className="space-y-2">
            <Label>{item.label}</Label>
            <Input
              type="time"
              className={formInputClassName}
              value={data[item.key as keyof FichaAnestesiaData] as string}
              onChange={(event) =>
                onChange({ [item.key]: event.target.value } as Partial<FichaAnestesiaData>)
              }
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
