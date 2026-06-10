"use client";

import { useState } from "react";
import { toast } from "sonner";
import { applyTemplateToCompaniesAction } from "@/modules/tenancy/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ApplyPreview } from "@/modules/tenancy";

type Props = {
  templateCode: string;
  preview: ApplyPreview;
};

export function ApplyTemplateDialog({ templateCode, preview }: Props) {
  const [open, setOpen] = useState(false);
  const [includeDivergent, setIncludeDivergent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const selectedIds = [
    ...preview.inSync.map((r) => r.companyId),
    ...(includeDivergent ? preview.divergent.map((r) => r.companyId) : []),
  ];

  async function handleApply() {
    setIsPending(true);
    const r = await applyTemplateToCompaniesAction(templateCode, selectedIds, includeDivergent);
    setIsPending(false);
    if (r.ok) {
      toast.success(r.message ?? "Aplicado");
      setOpen(false);
    } else {
      toast.error(r.message ?? "Erro");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Aplicar a empresas</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aplicar template a empresas</DialogTitle>
          <DialogDescription>
            Sincroniza role_permissions de cada role linkada com o template atual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">In sync ({preview.inSync.length})</h4>
            {preview.inSync.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {preview.inSync.map((r) => (
                  <li key={r.roleId}>{r.companyName}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Divergentes ({preview.divergent.length})</h4>
              <Badge variant="destructive" className="text-xs">
                Personalizadas
              </Badge>
            </div>
            {preview.divergent.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {preview.divergent.map((r) => (
                  <li key={r.roleId}>{r.companyName}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {preview.divergent.length > 0 && (
          <div className="flex items-center gap-2 rounded border border-destructive/20 bg-destructive/5 p-3">
            <Checkbox
              id="includeDivergent"
              checked={includeDivergent}
              onCheckedChange={(v) => setIncludeDivergent(v === true)}
            />
            <label htmlFor="includeDivergent" className="text-xs">
              Forçar overwrite das {preview.divergent.length} empresa(s) divergentes (perde
              customizações)
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isPending || selectedIds.length === 0}>
            {isPending ? "Aplicando..." : `Aplicar em ${selectedIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
