import type { PhaseChecklist } from "../scripts/phases.js";

export const F1: PhaseChecklist = {
  id: "F1",
  name: "Manual editável (CRUD)",
  description:
    "Tiptap básico, CRUD de artigos via UI com publicar/despublicar, listagem, viewer, categorias.",
  requires: ["F0"],
  checks: [
    {
      id: "tiptap-installed",
      description: "@tiptap/react instalado",
      kind: "package-json-has",
      dep: "@tiptap/react",
    },
    {
      id: "tiptap-starter-kit",
      description: "@tiptap/starter-kit instalado",
      kind: "package-json-has",
      dep: "@tiptap/starter-kit",
    },
    {
      id: "actions-create-article",
      description: "Action createArticleAction exportada no barrel",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["createArticleAction"],
    },
    {
      id: "actions-update-article",
      description: "Action updateArticleAction exportada",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["updateArticleAction"],
    },
    {
      id: "actions-publish-article",
      description: "Action publishArticleAction exportada",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["publishArticleAction"],
    },
    {
      id: "queries-list-articles",
      description: "Query listArticles exportada",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["listArticles", "getArticleBySlug"],
    },
    {
      id: "components-editor",
      description: "ArticleEditor exportado no barrel",
      kind: "barrel-exports",
      module: "knowledge-base",
      exports: ["ArticleEditor", "ArticleViewer"],
    },
    {
      id: "route-editor",
      description: "Rota /[companySlug]/manual/editor/[id] existe",
      kind: "file-exists",
      glob: "src/app/(dashboard)/[companySlug]/manual/editor/[id]/page.tsx",
    },
    {
      id: "lint-typecheck",
      description: "Lint e typecheck passam",
      kind: "shell",
      command: "npm run lint && npm run typecheck",
    },
  ],
};
