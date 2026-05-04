"use client";

import { useState, useRef, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateSystemRolePermissionsAction } from "../actions/update-system-role-permissions";
import type { SystemRoleMatrix } from "../queries/get-system-role-permissions";

type Props = {
  roleCodes: string[];
  initialMatrices: Record<string, SystemRoleMatrix[]>;
};

export function AdminSystemRolesTab({ roleCodes, initialMatrices }: Props) {
  const [selectedCode, setSelectedCode] = useState(roleCodes[0] ?? "");
  const matrix = initialMatrices[selectedCode] ?? [];
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const boundAction = updateSystemRolePermissionsAction.bind(null, selectedCode);
  const [state, formAction, isPending] = useActionState(boundAction, { ok: true as const });

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-6">
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Propagar permissões para todas as empresas?</AlertDialogTitle>
            <AlertDialogDescription>
              As permissões da role &quot;{selectedCode}&quot; serão aplicadas em{" "}
              <strong>todas as empresas</strong> imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              Salvar e propagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-2">
        {roleCodes.map((code) => (
          <Button
            key={code}
            variant={selectedCode === code ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCode(code)}
          >
            {code}
          </Button>
        ))}
      </div>

      {matrix.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma permissão disponível.</p>
      ) : (
        <form key={selectedCode} ref={formRef} action={formAction} className="space-y-6">
          {matrix.map((mod) => (
            <div key={mod.moduleCode} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {mod.moduleName}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {mod.permissions.map((perm) => (
                  <div key={perm.code} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.code}
                      name="permission_code"
                      value={perm.code}
                      defaultChecked={perm.granted}
                    />
                    <Label htmlFor={perm.code} className="cursor-pointer text-sm font-normal">
                      {perm.description ?? perm.code}
                    </Label>
                    {perm.inconsistent && (
                      <Badge variant="outline" className="text-xs text-yellow-600">
                        inconsistente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-sm text-muted-foreground">
            Salvar propaga as permissões para TODAS as empresas imediatamente.
          </p>

          <Button type="button" disabled={isPending} onClick={() => setShowConfirm(true)}>
            {isPending ? "Propagando..." : "Salvar e propagar para todas as empresas"}
          </Button>
        </form>
      )}
    </div>
  );
}
