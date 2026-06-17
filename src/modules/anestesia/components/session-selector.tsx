"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnestesiaSession } from "../types";

type Props = {
  sessions: AnestesiaSession[];
  activeSessionId: string | null;
  autosavedAt?: number | null;
  onSelect: (id: string) => void;
  onCreate: (paciente: string, data: string) => void;
  onDelete: (id: string) => void;
};

export function SessionSelector({
  sessions,
  activeSessionId,
  autosavedAt,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState("");
  const [showAutosave, setShowAutosave] = useState(false);

  useEffect(() => {
    if (!autosavedAt) return;
    setShowAutosave(true);
    const timeout = setTimeout(() => setShowAutosave(false), 1800);
    return () => clearTimeout(timeout);
  }, [autosavedAt]);

  const sessionLabel = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );

  const handleCreate = () => {
    if (!paciente.trim() || !data) return;
    onCreate(paciente.trim(), data);
    setPaciente("");
    setData("");
    setIsCreating(false);
  };

  const handleDelete = () => {
    if (!activeSessionId) return;
    if (!window.confirm("Deseja excluir a sessão ativa?")) return;
    onDelete(activeSessionId);
  };

  return (
    <div data-no-print className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Select value={activeSessionId ?? undefined} onValueChange={onSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.paciente || "Sem nome"} — {session.data}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showAutosave ? <Badge variant="secondary">Autossalvo</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setIsCreating((value) => !value)}>
            <Plus className="h-4 w-4" />
            Nova Sessão
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={!activeSessionId}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir sessão</span>
          </Button>
        </div>
      </div>

      {sessionLabel ? (
        <p className="text-sm text-muted-foreground">
          Sessão ativa: <strong>{sessionLabel.paciente || "Sem nome"}</strong> em{" "}
          {sessionLabel.data}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Crie uma sessão para começar o preenchimento.
        </p>
      )}

      {isCreating ? (
        <div className="grid gap-3 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_180px_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Paciente</label>
            <Input value={paciente} onChange={(event) => setPaciente(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data</label>
            <Input type="date" value={data} onChange={(event) => setData(event.target.value)} />
          </div>
          <Button type="button" onClick={handleCreate} disabled={!paciente.trim() || !data}>
            Criar sessão
          </Button>
        </div>
      ) : null}
    </div>
  );
}
