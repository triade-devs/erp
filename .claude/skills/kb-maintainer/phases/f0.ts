import type { PhaseChecklist } from "../scripts/phases.js";

export const F0: PhaseChecklist = {
  id: "F0",
  name: "Fundação",
  description:
    "Migrations das tabelas kb_*, RLS, seed das 5 permissions, módulo knowledge-base com barrel, item no MODULES_MENU, rota /manual placeholder.",
  checks: [
    {
      id: "migration-knowledge-base",
      description: "Migration que cria tabelas kb_* aplicada",
      kind: "file-exists",
      glob: "supabase/migrations/*_knowledge_base.sql",
    },
    {
      id: "migration-kb-rls",
      description: "Migration de RLS para tabelas kb_* aplicada",
      kind: "file-exists",
      glob: "supabase/migrations/*_kb_rls.sql",
    },
    {
      id: "module-knowledge-base-barrel",
      description: "Módulo knowledge-base com barrel index.ts criado",
      kind: "file-exists",
      glob: "src/modules/knowledge-base/index.ts",
    },
    {
      id: "menu-has-kb-read",
      description: "MODULES_MENU contém item com requiresPermission 'kb:article:read'",
      kind: "menu-has-permission",
      permission: "kb:article:read",
    },
    {
      id: "permissions-seeded",
      description: "5 permissões kb:* presentes em alguma migration de seed",
      kind: "permissions-present",
      permissions: [
        "kb:article:read",
        "kb:article:write",
        "kb:article:publish",
        "kb:doc:read",
        "kb:ai:use",
      ],
    },
    {
      id: "route-manual-placeholder",
      description: "Rota /[companySlug]/manual existe como placeholder",
      kind: "file-exists",
      glob: "src/app/(dashboard)/[companySlug]/manual/page.tsx",
    },
    {
      id: "lint",
      description: "npm run lint passa",
      kind: "shell",
      command: "npm run lint",
    },
    {
      id: "typecheck",
      description: "npm run typecheck passa",
      kind: "shell",
      command: "npm run typecheck",
    },
    // Opcionais (não bloqueiam a fase, mas reportam)
    {
      id: "kb-articles-table-online",
      description: "Tabela kb_articles existente no Supabase linkado",
      kind: "supabase-table-exists",
      table: "kb_articles",
      optional: true,
    },
  ],
};
