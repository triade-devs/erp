"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AnestesiaSession, FichaAnestesiaData, PreAvaliacaoData } from "../../types";
import {
  createAnestesiaSession,
  insertSessionWithLimit,
  updateSessionFichaAnestesia,
  updateSessionPreAvaliacao,
} from "../../services/session";
import {
  ACTIVE_SESSION_KEY,
  hasSessionConflict,
  LS_KEY,
  parseStoredSessions,
  persistSessions,
} from "../../services/storage";

const MAX_SESSIONS = 50;

function readSessions(): AnestesiaSession[] {
  if (typeof window === "undefined") return [];
  return parseStoredSessions(window.localStorage.getItem(LS_KEY));
}

function readActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function useAnestesiaSession() {
  const [sessions, setSessions] = useState<AnestesiaSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  const persistNow = useCallback(
    (nextSessions: AnestesiaSession[], nextActiveSessionId: string | null) => {
      if (typeof window === "undefined") return;

      const result = persistSessions(window.localStorage, nextSessions, nextActiveSessionId);
      if (!result.ok) {
        toast.error(
          result.reason === "quota"
            ? "Armazenamento local cheio. Exclua sessões antigas para continuar."
            : "Não foi possível salvar a sessão localmente.",
        );
        return;
      }

      setLastSavedAt(Date.now());
    },
    [],
  );

  const schedulePersist = useCallback(
    (nextSessions: AnestesiaSession[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        persistNow(nextSessions, activeSessionIdRef.current);
      }, 500);
    },
    [persistNow],
  );

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    const storedSessions = readSessions();
    const storedActiveId = readActiveSessionId();
    const nextActiveId = storedSessions.some((session) => session.id === storedActiveId)
      ? storedActiveId
      : (storedSessions[0]?.id ?? null);

    setSessions(storedSessions);
    setActiveSessionIdState(nextActiveId);
    activeSessionIdRef.current = nextActiveId;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const createSession = useCallback(
    (paciente: string, data: string) => {
      if (hasSessionConflict(sessions, paciente, data)) {
        toast.error("Já existe uma sessão para este paciente nesta data.");
        return;
      }

      const nextSession = createAnestesiaSession({ paciente, data, now: new Date() });
      activeSessionIdRef.current = nextSession.id;
      setActiveSessionIdState(nextSession.id);
      setSessions((current) => {
        const next = insertSessionWithLimit(current, nextSession, MAX_SESSIONS);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist, sessions],
  );

  const setActiveSession = useCallback(
    (id: string) => {
      activeSessionIdRef.current = id;
      setActiveSessionIdState(id);
      persistNow(sessions, id);
    },
    [persistNow, sessions],
  );

  const updatePreAvaliacao = useCallback(
    (partial: Partial<PreAvaliacaoData>) => {
      if (!activeSessionId) return;

      setSessions((current) => {
        const next = current.map((session) =>
          session.id === activeSessionId
            ? updateSessionPreAvaliacao(session, partial, new Date())
            : session,
        );
        schedulePersist(next);
        return next;
      });
    },
    [activeSessionId, schedulePersist],
  );

  const updateFichaAnestesia = useCallback(
    (partial: Partial<FichaAnestesiaData>) => {
      if (!activeSessionId) return;

      setSessions((current) => {
        const next = current.map((session) =>
          session.id === activeSessionId
            ? updateSessionFichaAnestesia(session, partial, new Date())
            : session,
        );
        schedulePersist(next);
        return next;
      });
    },
    [activeSessionId, schedulePersist],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((current) => {
        const next = current.filter((session) => session.id !== id);
        const nextActiveId =
          activeSessionIdRef.current === id ? (next[0]?.id ?? null) : activeSessionIdRef.current;
        activeSessionIdRef.current = nextActiveId;
        setActiveSessionIdState(nextActiveId);
        persistNow(next, nextActiveId);
        return next;
      });
    },
    [persistNow],
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  return {
    createSession,
    setActiveSession,
    updatePreAvaliacao,
    updateFichaAnestesia,
    deleteSession,
    activeSession,
    activeSessionId,
    sessions,
    lastSavedAt,
  };
}
