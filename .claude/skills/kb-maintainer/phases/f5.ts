import type { PhaseChecklist } from "../scripts/phases.js";

export const F5: PhaseChecklist = {
  id: "F5",
  name: "Render de vídeos (worker + Storage)",
  description: "Worker de render Remotion, upload pro Supabase Storage, polling/Realtime na UI.",
  requires: ["F3"],
  checks: [
    {
      id: "remotion-renderer",
      kind: "package-json-has",
      dep: "@remotion/renderer",
      description: "@remotion/renderer instalado",
    },
    {
      id: "trigger-render-action",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["triggerVideoRenderAction"],
      description: "Action triggerVideoRenderAction existe",
    },
    {
      id: "render-route-or-edge",
      kind: "file-exists",
      glob: "src/app/api/kb/remotion/render/route.ts",
      description: "Endpoint de render OU edge function (ajustar conforme escolha)",
      optional: true,
    },
    {
      id: "kb-videos-bucket",
      kind: "file-contains",
      path: "supabase/migrations",
      pattern: "knowledge-base",
      description: "Bucket knowledge-base configurado em alguma migration",
      optional: true,
    },
    {
      id: "lint-typecheck",
      kind: "shell",
      command: "npm run lint && npm run typecheck",
      description: "Lint e typecheck passam",
    },
  ],
};
