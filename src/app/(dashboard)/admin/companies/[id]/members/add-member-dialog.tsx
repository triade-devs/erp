"use client";

import { useState, useTransition, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  searchUsersForCompanyAction,
  addMemberToCompanyAction,
  type UserSearchResult,
} from "@/modules/tenancy/client";

type Props = {
  companyId: string;
};

export function AddMemberDialog({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const result = await searchUsersForCompanyAction(companyId, value);
        if (result.ok) setResults(result.users);
        else toast.error(result.message);
      });
    }, 300);
  }

  function handleConfirm() {
    if (!selected) return;
    startAdd(async () => {
      const result = await addMemberToCompanyAction(companyId, selected.userId);
      if (result.ok) {
        toast.success(result.message ?? "Membro adicionado");
        setOpen(false);
        setQuery("");
        setResults([]);
        setSelected(null);
      } else {
        toast.error(result.message ?? "Erro ao adicionar membro");
      }
    });
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setQuery("");
      setResults([]);
      setSelected(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">+ Adicionar membro</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar membro existente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Nome ou e-mail..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />

          {isSearching && <p className="text-xs text-muted-foreground">Buscando...</p>}

          {!isSearching && results.length === 0 && query.trim().length >= 2 && (
            <p className="text-xs text-muted-foreground">Nenhum usuário encontrado.</p>
          )}

          {results.length > 0 && (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
              {results.map((u) => (
                <li key={u.userId}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left transition-colors hover:bg-muted ${
                      selected?.userId === u.userId ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelected(u)}
                  >
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Selecionado: <span className="font-medium">{selected.fullName}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selected || isAdding}>
              {isAdding ? "Adicionando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
