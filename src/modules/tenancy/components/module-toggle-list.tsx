"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toggleModuleAction } from "../actions/toggle-module";
import type { CompanyModuleStatus } from "../queries/list-company-modules";

export function ModuleToggleList({
  companyId,
  modules,
}: {
  companyId: string;
  modules: CompanyModuleStatus[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(moduleCode: string, newEnabled: boolean) {
    startTransition(async () => {
      const result = await toggleModuleAction(companyId, moduleCode, newEnabled);
      if (result.ok) {
        toast.success(result.message ?? "Alteração salva");
      } else {
        toast.error(result.message ?? "Erro ao alterar módulo");
      }
    });
  }

  return (
    <div className="divide-y rounded-lg border">
      {modules.map((mod) => (
        <div key={mod.code} className="flex items-center justify-between p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor={`mod-${mod.code}`} className="cursor-pointer text-base font-medium">
                {mod.name}
              </Label>
              {mod.is_system && (
                <Badge variant="secondary" className="text-xs">
                  sistema
                </Badge>
              )}
            </div>
            {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
            <p className="font-mono text-xs text-muted-foreground">{mod.code}</p>
          </div>
          <Switch
            id={`mod-${mod.code}`}
            checked={mod.enabled}
            disabled={isPending || mod.is_system}
            onCheckedChange={(checked: boolean) => handleToggle(mod.code, checked)}
          />
        </div>
      ))}
    </div>
  );
}
