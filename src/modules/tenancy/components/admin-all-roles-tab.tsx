"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoleWithCompany } from "../queries/list-all-roles";

type Props = { roles: RoleWithCompany[] };

export function AdminAllRolesTab({ roles }: Props) {
  const [companyFilter, setCompanyFilter] = useState("");
  const [systemOnly, setSystemOnly] = useState(false);

  const filtered = roles.filter((r) => {
    if (companyFilter && !r.companyName.toLowerCase().includes(companyFilter.toLowerCase()))
      return false;
    if (systemOnly && !r.isSystem) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Filtrar por empresa..."
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={systemOnly}
            onChange={(e) => setSystemOnly(e.target.checked)}
          />
          Apenas sistema
        </label>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} roles</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Permissões</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="text-sm">{role.companyName}</TableCell>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{role.code}</TableCell>
              <TableCell>
                {role.isSystem ? (
                  <Badge variant="secondary" className="text-xs">
                    sistema
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    customizado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{role.permissionCount}</TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/companies/${role.companyId}`}>Ver empresa</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
