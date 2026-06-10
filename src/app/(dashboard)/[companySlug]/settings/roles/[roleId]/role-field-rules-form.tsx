"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRoleFieldRulesAction, type FieldMode } from "@/modules/authz/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FieldCatalogByModule, RoleFieldRulesByKey } from "@/modules/authz";

type Props = {
  companyId: string;
  roleId: string;
  catalog: FieldCatalogByModule;
  currentRules: RoleFieldRulesByKey;
};

const MODES: { value: FieldMode; label: string; tone: string }[] = [
  { value: "editable", label: "Editável", tone: "text-foreground" },
  { value: "readonly", label: "Somente leitura", tone: "text-yellow-700" },
  { value: "hidden", label: "Oculto", tone: "text-red-700" },
];

export function RoleFieldRulesForm({ companyId, roleId, catalog, currentRules }: Props) {
  const [state, setState] = useState<RoleFieldRulesByKey>(currentRules);
  const [isPending, startTransition] = useTransition();

  function setMode(table: string, column: string, mode: FieldMode) {
    const key = `${table}.${column}`;
    setState((prev) => {
      const next = { ...prev };
      if (mode === "editable") delete next[key];
      else next[key] = mode;
      return next;
    });
  }

  function handleSave() {
    const rules = Object.entries(state).map(([key, mode]) => {
      const [tableName, columnName] = key.split(".");
      return { tableName: tableName!, columnName: columnName!, mode };
    });

    startTransition(async () => {
      const r = await updateRoleFieldRulesAction(companyId, roleId, rules);
      if (r.ok) toast.success(r.message ?? "Salvo");
      else toast.error(r.message ?? "Erro");
    });
  }

  const modules = Object.keys(catalog).sort();

  if (modules.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Nenhuma coluna mascarável cadastrada no catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {modules.map((mod) => (
        <div key={mod} className="rounded border">
          <header className="border-b px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {mod}
          </header>
          <div className="divide-y">
            {catalog[mod]!.map((entry) => {
              const key = `${entry.tableName}.${entry.columnName}`;
              const current: FieldMode = state[key] ?? "editable";
              return (
                <div key={key} className="grid gap-2 px-3 py-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <Label className="font-medium">
                      {entry.label}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.tableName}.{entry.columnName}
                      </span>
                    </Label>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  <RadioGroup
                    value={current}
                    onValueChange={(v) =>
                      setMode(entry.tableName, entry.columnName, v as FieldMode)
                    }
                    className="flex gap-3"
                  >
                    {MODES.map((m) => (
                      <div key={m.value} className="flex items-center gap-1">
                        <RadioGroupItem id={`${key}-${m.value}`} value={m.value} />
                        <Label htmlFor={`${key}-${m.value}`} className={`text-xs ${m.tone}`}>
                          {m.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar regras de campo"}
      </Button>
    </div>
  );
}
