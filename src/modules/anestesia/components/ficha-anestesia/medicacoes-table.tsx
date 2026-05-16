"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { FichaAnestesiaData, MedicacaoItem } from "../../types";
import { SectionCard, compactInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

function createItem(): MedicacaoItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `med-${Date.now()}`,
    descricao: "",
    hora: "",
    via: "",
    infContinua: false,
  };
}

export function MedicacoesTable({ data, onChange }: Props) {
  const addItem = () => {
    onChange({ medicacoes: [...data.medicacoes, createItem()] });
  };

  const updateItem = (id: string, partial: Partial<MedicacaoItem>) => {
    onChange({
      medicacoes: data.medicacoes.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  };

  return (
    <SectionCard
      title="Medicações / ocorrências"
      description="Tabela dinâmica para registrar eventos e fármacos administrados."
    >
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4" />
          ADICIONAR ITEM
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nº</th>
              <th className="px-3 py-2 text-left font-medium">Descrição</th>
              <th className="px-3 py-2 text-left font-medium">Hora</th>
              <th className="px-3 py-2 text-left font-medium">Via</th>
              <th className="px-3 py-2 text-left font-medium">Inf. Cont.</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-background">
            {data.medicacoes.map((item, index) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-2">
                  <Input
                    className={compactInputClassName}
                    value={item.descricao}
                    onChange={(event) => updateItem(item.id, { descricao: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="time"
                    className={compactInputClassName}
                    value={item.hora}
                    onChange={(event) => updateItem(item.id, { hora: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className={compactInputClassName}
                    value={item.via}
                    onChange={(event) => updateItem(item.id, { via: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex h-8 items-center justify-center">
                    <Checkbox
                      checked={item.infContinua}
                      onCheckedChange={(checked) =>
                        updateItem(item.id, { infContinua: checked === true })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="px-3 py-3">
                <button
                  type="button"
                  className="w-full rounded-lg border border-dashed px-3 py-3 text-left text-sm text-muted-foreground hover:bg-muted/20"
                  onClick={addItem}
                >
                  Clique para adicionar...
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
