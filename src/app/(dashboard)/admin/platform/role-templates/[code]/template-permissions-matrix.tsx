"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateTemplatePermissionsAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TemplateModulePerms } from "@/modules/tenancy";

type Props = {
  templateCode: string;
  modules: TemplateModulePerms[];
};

const initial = { ok: true as const };

export function TemplatePermissionsMatrix({ templateCode, modules }: Props) {
  const action = updateTemplatePermissionsAction.bind(null, templateCode);
  const [state, formAction, isPending] = useActionState(action, initial);

  const [checked, setChecked] = useState<Set<string>>(
    new Set(modules.flatMap((m) => m.permissions.filter((p) => p.granted).map((p) => p.code))),
  );

  useEffect(() => {
    if (state !== initial) {
      if (state.ok) toast.success(state.message ?? "Salvo");
      else toast.error(state.message ?? "Erro");
    }
  }, [state]);

  function toggle(code: string, value: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {modules.map((m) => (
        <div key={m.moduleCode}>
          <h3 className="mb-2 font-semibold">{m.moduleName}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.permissions.map((p) => (
                <TableRow key={p.code}>
                  <TableCell>
                    <Checkbox
                      checked={checked.has(p.code)}
                      onCheckedChange={(v) => toggle(p.code, v === true)}
                    />
                    {checked.has(p.code) && (
                      <input type="hidden" name="permission_code" value={p.code} />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell>{p.resource}</TableCell>
                  <TableCell>{p.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar permissões"}
      </Button>
    </form>
  );
}
