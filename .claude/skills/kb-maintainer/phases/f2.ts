import type { PhaseChecklist } from "../scripts/phases.js";

export const F2: PhaseChecklist = {
  id: "F2",
  name: "Documentação técnica MDX",
  description:
    "Pipeline next-mdx-remote/rsc, layout /docs, plugins (gfm, slug, pretty-code), componentes Mermaid e TableSpec.",
  requires: ["F0"],
  checks: [
    {
      id: "mdx-remote",
      kind: "package-json-has",
      dep: "next-mdx-remote",
      description: "next-mdx-remote instalado",
    },
    {
      id: "remark-gfm",
      kind: "package-json-has",
      dep: "remark-gfm",
      description: "remark-gfm instalado",
    },
    {
      id: "rehype-slug",
      kind: "package-json-has",
      dep: "rehype-slug",
      description: "rehype-slug instalado",
    },
    {
      id: "rehype-pretty-code",
      kind: "package-json-has",
      dep: "rehype-pretty-code",
      description: "rehype-pretty-code instalado",
    },
    {
      id: "content-dir",
      kind: "file-exists",
      glob: "src/content/docs/**/*.mdx",
      description: "Pelo menos 1 MDX em src/content/docs/",
    },
    {
      id: "doc-route",
      kind: "file-exists",
      glob: "src/app/(dashboard)/[companySlug]/docs/**/page.tsx",
      description: "Rota /docs existe",
    },
    {
      id: "mermaid-component",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/components/mermaid-diagram.tsx",
      description: "Componente Mermaid criado",
    },
    {
      id: "tablespec-component",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/components/table-spec.tsx",
      description: "Componente TableSpec criado",
    },
    {
      id: "lint-typecheck",
      kind: "shell",
      command: "npm run lint && npm run typecheck",
      description: "Lint e typecheck passam",
    },
  ],
};
