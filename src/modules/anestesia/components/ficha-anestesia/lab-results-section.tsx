"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FichaAnestesiaData, LabResult } from "../../types";
import { SectionCard, compactInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

const columns = ["hora", "ph", "pco2", "po2", "bicBe", "k", "na", "gluc", "lact"] as const;

function createLabResult(): LabResult {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `lab-${Date.now()}`,
    hora: "",
    ph: "",
    pco2: "",
    po2: "",
    bicBe: "",
    k: "",
    na: "",
    gluc: "",
    lact: "",
  };
}

export function LabResultsSection({ data, onChange }: Props) {
  const updateRow = (id: string, partial: Partial<LabResult>) => {
    onChange({
      labResults: data.labResults.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  };

  return (
    <SectionCard
      title="Exames laboratoriais"
      description="Gasometria, eletrólitos e acompanhamento seriado."
    >
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ labResults: [...data.labResults, createLabResult()] })}
        >
          <Plus className="h-4 w-4" />
          Adicionar linha
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-2 py-2 text-left">HORA</th>
              <th className="px-2 py-2 text-left">pH</th>
              <th className="px-2 py-2 text-left">pCO₂</th>
              <th className="px-2 py-2 text-left">pO₂</th>
              <th className="px-2 py-2 text-left">bic/BE</th>
              <th className="px-2 py-2 text-left">K⁺</th>
              <th className="px-2 py-2 text-left">Na⁺</th>
              <th className="px-2 py-2 text-left">Gluc</th>
              <th className="px-2 py-2 text-left">Lact</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.labResults.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column} className="px-2 py-2">
                    <Input
                      type={column === "hora" ? "time" : "text"}
                      className={compactInputClassName}
                      value={row[column]}
                      onChange={(event) =>
                        updateRow(row.id, { [column]: event.target.value } as Partial<LabResult>)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
