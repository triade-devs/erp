import type { PhaseChecklist } from "../scripts/phases.js";

export const F3: PhaseChecklist = {
  id: "F3",
  name: "Remotion (player + composições)",
  description:
    "src/remotion/ com 2 composições, RemotionPlayer no barrel, extensão Tiptap RemotionEmbed.",
  requires: ["F1"],
  checks: [
    {
      id: "remotion-installed",
      kind: "package-json-has",
      dep: "remotion",
      description: "remotion instalado",
    },
    {
      id: "remotion-player",
      kind: "package-json-has",
      dep: "@remotion/player",
      description: "@remotion/player instalado",
    },
    {
      id: "remotion-root",
      kind: "file-exists",
      glob: "src/remotion/Root.tsx",
      description: "src/remotion/Root.tsx existe",
    },
    {
      id: "comp-stock-movement",
      kind: "file-exists",
      glob: "src/remotion/compositions/stock-movement-flow.tsx",
      description: "Composição stock-movement-flow existe",
    },
    {
      id: "comp-auth-flow",
      kind: "file-exists",
      glob: "src/remotion/compositions/auth-flow.tsx",
      description: "Composição auth-flow existe",
    },
    {
      id: "player-component",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["RemotionPlayer"],
      description: "RemotionPlayer exportado no barrel",
    },
    {
      id: "tiptap-extension",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/components/tiptap-remotion-embed.tsx",
      description: "Extension Tiptap RemotionEmbed existe",
    },
    {
      id: "build",
      kind: "shell",
      command: "npm run build",
      description: "next build não regressiona",
      optional: true,
    },
  ],
};
