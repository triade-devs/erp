import type { PhaseChecklist } from "../scripts/phases.js";

export const F4: PhaseChecklist = {
  id: "F4",
  name: "Busca e IA (FTS + pgvector + RAG)",
  description:
    "FTS, pgvector, embedding-service, /api/kb/search, widget de chat RAG, copiloto no editor.",
  requires: ["F1"],
  checks: [
    { id: "ai-sdk", kind: "package-json-has", dep: "ai", description: "Vercel AI SDK instalado" },
    {
      id: "ai-anthropic",
      kind: "package-json-has",
      dep: "@ai-sdk/anthropic",
      description: "@ai-sdk/anthropic instalado",
    },
    {
      id: "migration-pgvector",
      kind: "file-contains",
      path: "supabase/migrations",
      pattern: "create extension if not exists vector",
      description: "Extensão vector criada em alguma migration",
      optional: true,
    },
    {
      id: "embedding-service",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/services/embedding-service.ts",
      description: "embedding-service existe",
    },
    {
      id: "rag-service",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/services/rag-service.ts",
      description: "rag-service existe",
    },
    {
      id: "search-route",
      kind: "file-exists",
      glob: "src/app/api/kb/search/route.ts",
      description: "Endpoint /api/kb/search existe",
    },
    {
      id: "chat-route",
      kind: "file-exists",
      glob: "src/app/api/kb/chat/route.ts",
      description: "Endpoint /api/kb/chat existe",
    },
    {
      id: "chat-widget",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["KbChatWidget"],
      description: "KbChatWidget exportado",
    },
    {
      id: "lint-typecheck",
      kind: "shell",
      command: "npm run lint && npm run typecheck",
      description: "Lint e typecheck passam",
    },
  ],
};
