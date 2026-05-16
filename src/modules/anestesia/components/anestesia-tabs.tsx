"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnestesiaSession, FichaAnestesiaData, PreAvaliacaoData } from "../types";
import { FichaAnestesiaTab } from "./ficha-anestesia/ficha-anestesia-tab";
import { PreAvaliacaoTab } from "./pre-avaliacao/pre-avaliacao-tab";

type Props = {
  activeSession: AnestesiaSession | null;
  onUpdatePreAvaliacao: (partial: Partial<PreAvaliacaoData>) => void;
  onUpdateFichaAnestesia: (partial: Partial<FichaAnestesiaData>) => void;
};

export function AnestesiaTabs({
  activeSession,
  onUpdatePreAvaliacao,
  onUpdateFichaAnestesia,
}: Props) {
  if (!activeSession) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
        Selecione ou crie uma sessão para preencher as fichas de anestesia.
      </div>
    );
  }

  return (
    <Tabs defaultValue="pre-avaliacao" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pre-avaliacao">Pré-Avaliação</TabsTrigger>
        <TabsTrigger value="ficha-anestesia">Ficha de Anestesia</TabsTrigger>
      </TabsList>

      <TabsContent value="pre-avaliacao" data-form="pre-avaliacao">
        <PreAvaliacaoTab data={activeSession.preAvaliacao} onChange={onUpdatePreAvaliacao} />
      </TabsContent>

      <TabsContent value="ficha-anestesia" data-form="ficha-anestesia">
        <FichaAnestesiaTab
          data={activeSession.fichaAnestesia}
          preAvaliacao={activeSession.preAvaliacao}
          onChange={onUpdateFichaAnestesia}
        />
      </TabsContent>
    </Tabs>
  );
}
