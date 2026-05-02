"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  function handleToggleActive(code: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleModuleActiveAction(code, isActive);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  function handleBulk(code: string, enable: boolean) {
    const label = enable ? "ativar para todas as empresas" : "desativar para todas as empresas";
    if (!confirm(`Tem certeza que deseja ${label} o módulo "${code}"?`)) return;
    startTransition(async () => {
      const result = await bulkToggleModuleForCompaniesAction(code, enable);
      if (result.ok) toast.success(result.message ?? "Alterado");
      else toast.error(result.message ?? "Erro");
    });
  }

  return (
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
                  onClick={() => handleBulk(mod.code, true)}
                >
                  Ativar todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulk(mod.code, false)}
                >
                  Desativar todas
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
