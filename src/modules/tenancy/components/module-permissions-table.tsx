"use client";

import { useTransition, useState, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPermissionAction } from "../actions/create-permission";
import { deletePermissionAction } from "../actions/delete-permission";
import type { ModulePermission } from "../queries/get-module-with-permissions";

type Props = {
  moduleCode: string;
  permissions: ModulePermission[];
};

export function ModulePermissionsTable({ moduleCode, permissions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const boundCreate = createPermissionAction.bind(null, moduleCode);
  const [createState, createFormAction, isCreating] = useActionState(boundCreate, {
    ok: true as const,
  });

  useEffect(() => {
    if (createState.ok && createState.message) {
      toast.success(createState.message);
      setOpen(false);
    } else if (!createState.ok && createState.message && !("fieldErrors" in createState)) {
      toast.error(createState.message);
    }
  }, [createState]);

  const createErrors =
    !createState.ok && "fieldErrors" in createState ? createState.fieldErrors : undefined;

  function handleDelete(permCode: string) {
    if (
      !confirm(
        `Remover "${permCode}"? Isso retirará a permissão de TODAS as roles que a possuem (CASCADE).`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deletePermissionAction(moduleCode, permCode);
      if (result.ok) toast.success(result.message ?? "Removida");
      else toast.error(result.message ?? "Erro");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Permissões ({permissions.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Adicionar permissão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova permissão</DialogTitle>
            </DialogHeader>
            <form action={createFormAction} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="perm-code">Código</Label>
                <Input
                  id="perm-code"
                  name="code"
                  placeholder={`${moduleCode}:resource:action`}
                  className="font-mono"
                  required
                />
                {createErrors?.code && (
                  <p className="text-sm text-destructive">{createErrors.code[0]}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-resource">Resource</Label>
                <Input id="perm-resource" name="resource" placeholder="ex: product" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-action">Action</Label>
                <Input id="perm-action" name="action" placeholder="ex: archive" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perm-desc">Descrição</Label>
                <Input id="perm-desc" name="description" placeholder="Opcional" />
              </div>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.code}>
                <TableCell className="font-mono text-sm">{perm.code}</TableCell>
                <TableCell>{perm.resource}</TableCell>
                <TableCell>{perm.action}</TableCell>
                <TableCell className="text-muted-foreground">{perm.description ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(perm.code)}
                  >
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
