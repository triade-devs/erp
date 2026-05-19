---
name: erp-module-registration
description: Use when adding a new feature module to the ERP dashboard — registering it in the sidebar menu, creating the route, and enabling it for existing companies.
---

# ERP Module Registration

## Overview

Registrar um módulo no dashboard envolve **quatro passos obrigatórios**. Esquecer qualquer um deixa o módulo inacessível ou invisível silenciosamente.

## Checklist Completo

### 1. Menu (`src/core/navigation/menu.ts`)

Adicione uma entrada em `MODULES_MENU`. **Todos os três campos de controle são obrigatórios:**

```ts
{
  label: "Anestesia",
  href: "/anestesia",
  icon: "syringe",                          // ícone Lucide
  requiresSlug: true,                       // prefixo /<companySlug>/ automático
  requiresModule: "anestesia",              // oculta se empresa não tiver o módulo
  requiresPermission: "anestesia:session:read", // oculta sem permissão
},
```

> ⚠️ **Sem `requiresModule`** o item aparece para empresas que não têm o módulo habilitado.

### 2. Rota (`src/app/(dashboard)/[companySlug]/<modulo>/page.tsx`)

O segmento dinâmico é `[companySlug]` — não `[slug]`, não `[id]`.

```tsx
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ companySlug: string }> };

export default async function AnestesiaPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);

  return <div>{/* Componentes do módulo aqui */}</div>;
}
```

> Não edite `src/middleware.ts` nem `app/(dashboard)/layout.tsx` — o layout já faz o roteamento por slug.

### 3. Migration: habilitar módulo para empresas existentes

```sql
-- supabase/migrations/<timestamp>_register_<modulo>_module.sql
INSERT INTO company_modules (company_id, module_code)
SELECT id, 'anestesia' FROM companies
ON CONFLICT DO NOTHING;
```

> ⚠️ Sem essa migration, **empresas existentes** não terão o módulo habilitado e `requiresModule` vai esconder o item no menu para todos. Empresas criadas APÓS a migration são habilitadas pelo código de criação.

### 4. Permissões para roles existentes

Se ainda não existir uma migration de permissões para o módulo, siga o padrão `erp-module-conventions` — assign por `r.code`, não por UUID.

## Não faça

| ❌ Erro                                   | ✅ Correto                                |
| ----------------------------------------- | ----------------------------------------- |
| Editar `layout.tsx` para nav items        | Editar apenas `menu.ts`                   |
| Editar `middleware.ts` para o novo módulo | Não tocar no middleware                   |
| Usar `[slug]` no path da rota             | Usar `[companySlug]`                      |
| Criar rota em `app/(dashboard)/admin/`    | Criar em `app/(dashboard)/[companySlug]/` |
| Omitir `requiresModule` no menu           | Incluir sempre                            |
| Omitir migration `company_modules`        | Incluir sempre                            |

## Red Flags

- "A rota funciona mas o item não aparece no menu" → falta `requiresModule` ou `requiresPermission`
- "Funciona para mim mas não para outras empresas" → falta migration `company_modules`
- "Devo atualizar o middleware?" → **não**, o middleware não precisa de alteração para módulos normais
