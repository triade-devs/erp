"use client";

import { AnestesiaTabs } from "./anestesia-tabs";
import { SessionSelector } from "./session-selector";
import { useAnestesiaSession } from "../hooks/use-anestesia-session";

export function AnestesiaClientPage() {
  const {
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    lastSavedAt,
    sessions,
    setActiveSession,
    updateFichaAnestesia,
    updatePreAvaliacao,
  } = useAnestesiaSession();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Anestesia</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a avaliação pré-anestésica e a ficha intraoperatória em sessões locais.
        </p>
      </header>

      <SessionSelector
        sessions={sessions}
        activeSessionId={activeSessionId}
        autosavedAt={lastSavedAt}
        onSelect={setActiveSession}
        onCreate={createSession}
        onDelete={deleteSession}
      />

      <AnestesiaTabs
        activeSession={activeSession}
        onUpdatePreAvaliacao={updatePreAvaliacao}
        onUpdateFichaAnestesia={updateFichaAnestesia}
      />
    </section>
  );
}
