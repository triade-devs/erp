"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnestesiaSession, FichaAnestesiaData, PreAvaliacaoData } from "../types";
import { FichaAnestesiaPrintLayout } from "./ficha-anestesia/ficha-anestesia-print-layout";
import { FichaAnestesiaTab } from "./ficha-anestesia/ficha-anestesia-tab";
import { PreAvaliacaoPrintLayout } from "./pre-avaliacao/pre-avaliacao-print-layout";
import { PreAvaliacaoTab } from "./pre-avaliacao/pre-avaliacao-tab";
import { ResumoPrintLayout } from "./resumo/resumo-print-layout";
import { ResumoTab } from "./resumo/resumo-tab";

type TabValue = "pre-avaliacao" | "ficha-anestesia" | "resumo";

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
  const [activeTab, setActiveTab] = useState<TabValue>("pre-avaliacao");

  const preAvaliacaoRef = useRef<HTMLDivElement>(null);
  const fichaRef = useRef<HTMLDivElement>(null);
  const resumoRef = useRef<HTMLDivElement>(null);

  const handlePrintPreAvaliacao = useReactToPrint({
    contentRef: preAvaliacaoRef,
    documentTitle: "Avaliação Pré-Anestésica",
    pageStyle: `@page { size: A4 portrait; margin: 12mm 10mm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  const handlePrintFicha = useReactToPrint({
    contentRef: fichaRef,
    documentTitle: `Ficha de Anestesia — ${activeSession?.fichaAnestesia.paciente || "Paciente"}`,
    pageStyle: `@page { size: A4 portrait; margin: 10mm 8mm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  const handlePrintResumo = useReactToPrint({
    contentRef: resumoRef,
    documentTitle: "Resumo Cirúrgico",
    pageStyle: `@page { size: A4 portrait; margin: 12mm 10mm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  if (!activeSession) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
        Selecione ou crie uma sessão para preencher as fichas de anestesia.
      </div>
    );
  }

  return (
    <>
      {/* Hidden print layouts */}
      <div className="hidden">
        <PreAvaliacaoPrintLayout ref={preAvaliacaoRef} data={activeSession.preAvaliacao} />
        <FichaAnestesiaPrintLayout
          ref={fichaRef}
          data={activeSession.fichaAnestesia}
          preAvaliacao={activeSession.preAvaliacao}
        />
        <ResumoPrintLayout
          ref={resumoRef}
          preAvaliacao={activeSession.preAvaliacao}
          fichaAnestesia={activeSession.fichaAnestesia}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="space-y-4"
      >
        {/* Sticky bar: tabs + action buttons */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background py-2">
          <TabsList>
            <TabsTrigger value="pre-avaliacao">Pré-Avaliação</TabsTrigger>
            <TabsTrigger value="ficha-anestesia">Ficha de Anestesia</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
          </TabsList>

          <div className="ml-auto flex gap-2">
            {activeTab === "pre-avaliacao" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePrintPreAvaliacao()}
              >
                <Printer className="h-4 w-4" />
                Imprimir Pré-Avaliação
              </Button>
            )}
            {activeTab === "ficha-anestesia" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintFicha()}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    toast.success("Sessão finalizada localmente e pronta para impressão.")
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar
                </Button>
              </>
            )}
            {activeTab === "resumo" && (
              <Button type="button" variant="outline" size="sm" onClick={() => handlePrintResumo()}>
                <Printer className="h-4 w-4" />
                Imprimir Resumo
              </Button>
            )}
          </div>
        </div>

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

        <TabsContent value="resumo">
          <ResumoTab
            preAvaliacao={activeSession.preAvaliacao}
            fichaAnestesia={activeSession.fichaAnestesia}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
