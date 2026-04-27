# ERP Modular — MVP

Sistema ERP web escalável e modular. MVP com módulos de **Auth**, **Produtos** e **Movimentações de Estoque**.

**Stack:** Next.js 15 (App Router + Server Actions) · Supabase · Tailwind CSS + Shadcn/UI · Vercel

---

## Setup local

### 1. Pré-requisitos

- Node.js 18+
- pnpm (`npm install -g pnpm`) ou npm/yarn
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) (deploy)

### 2. Clone e instale dependências

```bash
git clone <repo>
cd erp
npm install   # ou: pnpm install
```

> **Nota:** após instalar, adicione os componentes Shadcn/UI:
>
> ```bash
> npx shadcn@latest add button input label form card table \
>   dialog dropdown-menu toast sonner separator badge skeleton \
>   select textarea alert sheet
> ```
>
> Os arquivos já estão parcialmente presentes em `src/components/ui/` — o comando do Shadcn irá completá-los com as dependências Radix corretas.

### 3. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas chaves do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # opcional, apenas server
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configure o banco de dados

```bash
# Instale a CLI do Supabase
npm install -g supabase

# Faça login e linke ao projeto
supabase login
supabase link --project-ref <SEU_PROJECT_REF>

# Aplique as migrations
supabase db push

# Gere os tipos TypeScript (atualiza src/types/database.types.ts)
npm run db:types
```

### 5. Configure o Supabase Dashboard

- **Authentication › Providers › Google:** habilitar, colar Client ID e Client Secret
- **Redirect URLs:** adicionar `http://localhost:3000/api/auth/callback`
- **Email Templates:** personalizar em português
- **SMTP:** configurar provedor próprio (Resend/SendGrid) antes de produção

### 6. Configure o Husky (hooks de commit)

```bash
npm run prepare
```

### 7. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

| Script              | Descrição                       |
| ------------------- | ------------------------------- |
| `npm run dev`       | Inicia em desenvolvimento       |
| `npm run build`     | Build de produção               |
| `npm run lint`      | Lint com ESLint                 |
| `npm run format`    | Formata com Prettier            |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run db:types`  | Regenera `database.types.ts`    |
| `npm run db:push`   | Aplica migrations ao Supabase   |
| `npm run db:reset`  | Reseta o banco local            |

---

## Estrutura do projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rotas públicas (login, register, recover)
│   ├── (dashboard)/        # Rotas protegidas
│   └── api/auth/callback/  # OAuth callback
├── core/
│   ├── config/env.ts       # Validação de envs com Zod
│   └── navigation/menu.ts  # Menu modular (plug and play)
├── lib/
│   ├── supabase/           # Clients server e browser
│   ├── utils.ts            # cn(), formatters
│   └── errors.ts           # ActionResult, AppError
├── modules/
│   ├── auth/               # Módulo de autenticação
│   └── inventory/          # Módulo de estoque
├── components/ui/          # Shadcn/UI components
└── types/database.types.ts # Tipos gerados pela Supabase CLI
```

Cada módulo segue o padrão:

```
modules/<dominio>/
├── actions/    # Server Actions (mutations)
├── queries/    # Funções de leitura (server-only)
├── components/ # Componentes React
├── services/   # Regras de negócio puras (testáveis)
├── schemas/    # Zod schemas
├── types/      # Tipos derivados
└── index.ts    # Barrel — única API pública
```

---

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as mesmas variáveis de ambiente em _Settings › Environment Variables_
3. Adicione a URL do preview ao Supabase em _Authentication › Redirect URLs_

---

## Roadmap pós-MVP

- Orçamentos (`src/modules/quotes`)
- Clientes CRM (`src/modules/customers`)
- Fornecedores (`src/modules/suppliers`)
- Financeiro básico
- Relatórios (Curva ABC, DRE)
- Auditoria (`audit_logs`)
- Multi-tenant (Orgs)
- PWA + leitura de código de barras
