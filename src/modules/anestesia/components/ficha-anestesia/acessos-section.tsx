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

const accessFields = [
  { key: "acessoPeriferico", label: "Acesso Periférico" },
  { key: "acessoIntraosseo", label: "Intraósseo" },
  { key: "acessoVenosoCentral", label: "Venoso Central" },
  { key: "acessoPAI", label: "PAI" },
] as const;

export function AcessosSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Acessos vasculares"
      description="Registre os dispositivos instalados e suas características."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accessFields.map((item) => {
          const acesso = data[item.key];
          return (
            <div key={item.key} className="space-y-3 rounded-xl border p-4">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox
                  checked={acesso.ativo}
                  onCheckedChange={(checked) =>
                    onChange({
                      [item.key]: { ...acesso, ativo: checked === true },
                    } as Partial<FichaAnestesiaData>)
                  }
                />
                {item.label}
              </label>
              <div className="space-y-2">
                <Label>Calibre</Label>
                <Input
                  className={formInputClassName}
                  value={acesso.calibre}
                  onChange={(event) =>
                    onChange({
                      [item.key]: { ...acesso, calibre: event.target.value },
                    } as Partial<FichaAnestesiaData>)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  className={formInputClassName}
                  value={acesso.local}
                  onChange={(event) =>
                    onChange({
                      [item.key]: { ...acesso, local: event.target.value },
                    } as Partial<FichaAnestesiaData>)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
