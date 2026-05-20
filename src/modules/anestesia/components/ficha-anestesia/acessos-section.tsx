"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FichaAnestesiaData } from "../../types";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const CALIBRE_OPTIONS = ["14", "16", "18", "20", "22", "24"] as const;

const singleAccessFields = [
  { key: "acessoIntraosseo" as const, label: "Intraósseo" },
  { key: "acessoVenosoCentral" as const, label: "Venoso Central" },
  { key: "acessoPAI" as const, label: "PAI" },
];

export function AcessosSection({ data, onChange }: Props) {
  const perifericos = data.acessoPeriferico;

  function addPeriferico() {
    onChange({
      acessoPeriferico: [...perifericos, { ativo: true, calibre: "", local: "" }],
    });
  }

  function removePeriferico(index: number) {
    onChange({
      acessoPeriferico: perifericos.filter((_, i) => i !== index),
    });
  }

  function updatePeriferico(
    index: number,
    patch: Partial<{ ativo: boolean; calibre: string; local: string }>,
  ) {
    onChange({
      acessoPeriferico: perifericos.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  return (
    <SectionCard
      title="Acessos vasculares"
      description="Registre os dispositivos instalados e suas características."
    >
      <div className="space-y-6">
        {/* Acesso Periférico — múltiplos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Acesso Periférico</span>
            <Button type="button" variant="outline" size="sm" onClick={addPeriferico}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {perifericos.map((item, index) => (
              <div key={index} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <Checkbox
                      checked={item.ativo}
                      onCheckedChange={(checked) =>
                        updatePeriferico(index, { ativo: checked === true })
                      }
                    />
                    Acesso {index + 1}
                  </label>
                  {perifericos.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removePeriferico(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Calibre</Label>
                  <Select
                    value={item.calibre}
                    onValueChange={(value) => updatePeriferico(index, { calibre: value })}
                  >
                    <SelectTrigger className={formInputClassName}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALIBRE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}G
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    className={formInputClassName}
                    value={item.local}
                    onChange={(e) => updatePeriferico(index, { local: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demais acessos — único cada */}
        <div className="grid gap-4 md:grid-cols-3">
          {singleAccessFields.map((field) => {
            const acesso = data[field.key];
            return (
              <div key={field.key} className="space-y-3 rounded-xl border p-4">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Checkbox
                    checked={acesso.ativo}
                    onCheckedChange={(checked) =>
                      onChange({
                        [field.key]: { ...acesso, ativo: checked === true },
                      } as Partial<FichaAnestesiaData>)
                    }
                  />
                  {field.label}
                </label>
                <div className="space-y-2">
                  <Label>Calibre</Label>
                  <Select
                    value={acesso.calibre}
                    onValueChange={(value) =>
                      onChange({
                        [field.key]: { ...acesso, calibre: value },
                      } as Partial<FichaAnestesiaData>)
                    }
                  >
                    <SelectTrigger className={formInputClassName}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALIBRE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}G
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    className={formInputClassName}
                    value={acesso.local}
                    onChange={(e) =>
                      onChange({
                        [field.key]: { ...acesso, local: e.target.value },
                      } as Partial<FichaAnestesiaData>)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
