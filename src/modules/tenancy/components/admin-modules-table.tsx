"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleModuleActiveAction } from "../actions/toggle-module-active";
import { bulkToggleModuleForCompaniesAction } from "../actions/bulk-toggle-module-for-companies";
import type { ModuleWithStats } from "../queries/list-modules-with-stats";

export function AdminModulesTable({ modules }: { modules: ModuleWithStats[] }) {
  const [isPending, startTransition] = useTransition();
  const [bulkTarget, setBulkTarget] = useState<{ code: string; enable: boolean } | null>(null);

  function handleToggleActive(code: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleModuleActiveAction(code, isActive);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  function confirmBulk() {
    if (!bulkTarget) return;
    const { code, enable } = bulkTarget;
    setBulkTarget(null);
    startTransition(async () => {
      const result = await bulkToggleModuleForCompaniesAction(code, enable);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  return (
    <>
      <AlertDialog
        open={bulkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBulkTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkTarget?.enable
                ? "Ativar módulo para todas as empresas?"
                : "Desativar módulo para todas as empresas?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              O módulo &quot;{bulkTarget?.code}&quot; será{" "}
              {bulkTarget?.enable ? "ativado" : "desativado"} para todas as empresas imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulk}
              className={
                bulkTarget?.enable
                  ? undefined
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead className="text-right">Permissões</TableHead>
            <TableHead className="text-right">Empresas ativas</TableHead>
            <TableHead>Ativo no catálogo</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod) => (
            <TableRow key={mod.code}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mod.name}</span>
                  {mod.is_system && (
                    <Badge variant="secondary" className="text-xs">
                      sistema
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{mod.code}</TableCell>
              <TableCell className="text-right">{mod.permissionCount}</TableCell>
              <TableCell className="text-right">{mod.activeCompanyCount}</TableCell>
              <TableCell>
                <Switch
                  checked={mod.is_active}
                  disabled={isPending || mod.is_system}
                  onCheckedChange={(checked) => handleToggleActive(mod.code, checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/platform/modules/${mod.code}`}>Editar</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setBulkTarget({ code: mod.code, enable: true })}
                  >
                    Ativar todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setBulkTarget({ code: mod.code, enable: false })}
                  >
                    Desativar todas
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
