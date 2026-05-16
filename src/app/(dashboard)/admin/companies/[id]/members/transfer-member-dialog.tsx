"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { transferMemberAction } from "@/modules/tenancy/client";

type Company = { id: string; name: string };

type Props = {
  membershipId: string;
  memberName: string;
  sourceCompanyId: string;
  allCompanies: Company[];
};

export function TransferMemberDialog({
  membershipId,
  memberName,
  sourceCompanyId,
  allCompanies,
}: Props) {
  const [open, setOpen] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [keepInSource, setKeepInSource] = useState(false);
  const [isPending, startTransition] = useTransition();

  const companies = allCompanies.filter((c) => c.id !== sourceCompanyId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCompanyId) return;
    startTransition(async () => {
      const result = await transferMemberAction(
        membershipId,
        sourceCompanyId,
        targetCompanyId,
        keepInSource,
      );
      if (result.ok) {
        toast.success(result.message ?? "Transferência realizada");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Erro na transferência");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Membro: <span className="font-medium text-foreground">{memberName}</span>
          </p>

          <div className="space-y-2">
            <Label>Empresa destino</Label>
            <Select value={targetCompanyId} onValueChange={setTargetCompanyId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="keep-source" className="cursor-pointer">
              Manter na empresa atual
            </Label>
            <Switch id="keep-source" checked={keepInSource} onCheckedChange={setKeepInSource} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !targetCompanyId}>
              {isPending ? "Transferindo..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
