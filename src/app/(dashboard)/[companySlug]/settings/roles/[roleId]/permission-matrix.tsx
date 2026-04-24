"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/errors";
import type { ModulePermissions } from "@/modules/tenancy";

type Props = {
  matrix: ModulePermissions[];
  roleId: string;
  companyId: string;
  isSystem: boolean;
  action: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

const initialState: ActionResult = { ok: false };

function SubmitButton({ isSystem }: { isSystem: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={isSystem || pending}>
      {pending ? "Salvando..." : "Salvar permissões"}
    </Button>
  );
}

export function PermissionMatrix({ matrix, isSystem, action }: Props) {
  const [state, formAction] = useActionState(action, initialState);

  if (matrix.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Nenhum módulo habilitado nesta empresa.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {matrix.map((mod) => (
        <div key={mod.moduleCode} className="space-y-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold">{mod.moduleName}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {mod.permissions.map((perm) => (
              <label key={perm.code} className="flex cursor-pointer select-none items-start gap-2">
                <input
                  type="checkbox"
                  name="permission_code"
                  value={perm.code}
                  defaultChecked={perm.granted}
                  disabled={isSystem}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium capitalize">{perm.action}</span>
                  {" — "}
                  <span className="text-muted-foreground">{perm.description ?? perm.resource}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.ok && state.message && <p className="text-sm text-green-700">{state.message}</p>}

      <div className="flex justify-end">
        <SubmitButton isSystem={isSystem} />
      </div>
    </form>
  );
}
