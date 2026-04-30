"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { registerMovementAction } from "../actions/register-movement";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type ProductOption = { id: string; name: string; sku: string; stock: number };

export function MovementForm({ products }: { products: ProductOption[] }) {
  const [state, formAction] = useActionState(registerMovementAction, initial);
  const [formKey, setFormKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  const selected = products.find((p) => p.id === selectedId);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Movimentação registrada");
      setFormKey((k) => k + 1);
      setSelectedId("");
    }
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Produto */}
      <div className="space-y-2 md:col-span-2">
        <Label>
          Produto <span className="text-red-500">*</span>
        </Label>
        {/* hidden input para o FormData */}
        <input type="hidden" name="productId" value={selectedId} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {selected ? (
                <span>
                  <span className="font-mono text-xs">{selected.sku}</span> — {selected.name}
                  <span className="ml-2 text-muted-foreground">
                    (saldo: {selected.stock.toFixed(3)})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Busque por nome ou SKU...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command
              filter={(value, search) => {
                const p = products.find((x) => x.id === value);
                if (!p) return 0;
                const q = search.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) ? 1 : 0;
              }}
            >
              <CommandInput placeholder="Nome ou SKU..." />
              <CommandList>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {products.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={(val) => {
                        setSelectedId(val === selectedId ? "" : val);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedId === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="mr-2 font-mono text-xs">{p.sku}</span>
                      <span className="flex-1">{p.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        saldo: {p.stock.toFixed(3)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {fieldErrors?.productId && (
          <p className="text-sm text-red-600">{fieldErrors.productId[0]}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Tipo <span className="text-red-500">*</span>
        </Label>
        <Select name="type" defaultValue="in">
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in">Entrada</SelectItem>
            <SelectItem value="out">Saída</SelectItem>
            <SelectItem value="adjustment">Ajuste de saldo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantidade */}
      <div className="space-y-2">
        <Label htmlFor="quantity">
          Quantidade <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="0.000"
          aria-invalid={!!fieldErrors?.quantity}
        />
        {fieldErrors?.quantity && <p className="text-sm text-red-600">{fieldErrors.quantity[0]}</p>}
      </div>

      {/* Custo unitário */}
      <div className="space-y-2">
        <Label htmlFor="unitCost">Custo unitário (R$)</Label>
        <Input id="unitCost" name="unitCost" type="number" step="0.01" min="0" placeholder="0.00" />
      </div>

      {/* Motivo */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="reason">Motivo / Observação</Label>
        <Input id="reason" name="reason" placeholder="Opcional..." maxLength={500} />
      </div>

      <div className="flex justify-end md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar movimentação"}
    </Button>
  );
}
