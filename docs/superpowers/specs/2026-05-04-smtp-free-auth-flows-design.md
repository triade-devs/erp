# SMTP-Free Auth Flows — Design Spec

**Data**: 2026-05-04
**Status**: Aprovado para implementação
**Escopo**: Refatorar fluxos de convite, cadastro e recuperação de senha para operar sem SMTP, mantendo paridade funcional com gestão por platform admin e company owner.

---

## 1. Motivação

O projeto não tem SMTP configurado e não há previsão de implementar. Os fluxos atuais dependem de:

- `supabase.auth.signUp` com `emailRedirectTo` (confirmação por email).
- `supabase.auth.resetPasswordForEmail` (link mágico de reset).
- `supabase.auth.admin.inviteUserByEmail` (convite de membro / owner de empresa).

Sem SMTP, esses fluxos falham silenciosamente ou ficam pendentes. A solução proposta substitui todos por **tokens locais persistidos** que owner ou platform admin repassam fora-banda (Slack, WhatsApp, in-person), preservando os mesmos passos lógicos do usuário final.

## 2. Decisões aprovadas

| #   | Decisão                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| 1   | `/register` exige código de convite válido. Cadastro público sem código → bloqueado.                                                                           |
| 2   | Convite materializado como **link longo** (`?t=<token>`) **e** **código curto** (`INV-XXXX-XXXX`). Ambos válidos.                                              |
| 3   | Convite: TTL **7 dias**, **uso único**.                                                                                                                        |
| 4   | Recuperação de senha: **fila auto-serviço** (usuário solicita) **+** **reset direto pelo owner** pelo painel.                                                  |
| 5   | Autoridade: **platform admin** = poder total (qualquer empresa, qualquer usuário); **company owner** = somente empresa própria, **somente membros não-owner**. |
| 6   | Convite pra usuário já existente: gera convite consistente com auto-skip de senha; consentimento explícito permanece.                                          |
| 7   | UI: abas separadas em `settings/members` — **Ativos**                                                                                                          | **Convites pendentes** | **Solicitações de reset**. |
| 8   | Token = 32 bytes random (base64url, ~256 bits), persistido como **sha256 hash**. Plain só retornado uma vez na criação.                                        |
| 9   | Migração: backfill `company_invitations` para memberships `invited` antigas + `email_confirmed_at = now()` para usuários `auth.users` não-confirmados.         |

## 3. Arquitetura

**Approach selecionada**: estender módulos existentes (`tenancy/` e `auth/`) com primitiva de token compartilhada em `src/lib/tokens.ts`.

- **Convite** mora em `src/modules/tenancy/`. Substitui `invite-member.ts`.
- **Reset de senha** mora em `src/modules/auth/`. Substitui `recover-password.ts` e `reset-password.ts`.
- **Sign-up** reescrito em `src/modules/auth/actions/sign-up.ts` para exigir convite.
- **Token utilities** em `src/lib/tokens.ts` (util neutro, não é módulo).

Justificativa: respeita boundaries enforçadas por ESLint do projeto (`@/modules/<domain>/<file>` deep imports bloqueados); cada módulo continua coeso; PR cirúrgico, sem movimentação de arquivos.

## 4. Modelo de dados

### Tabela `company_invitations`

```sql
create extension if not exists citext;

create table public.company_invitations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  email           citext not null,
  token_hash      bytea not null,
  short_code      text not null,
  role_ids        uuid[] not null default '{}',
  invited_by      uuid not null references auth.users(id),
  status          text not null default 'pending'
                  check (status in ('pending','accepted','revoked','expired')),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id),
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create unique index ux_company_invitations_short_code on public.company_invitations(short_code);
create index idx_company_invitations_company on public.company_invitations(company_id);
create index idx_company_invitations_email   on public.company_invitations(email);
create index idx_company_invitations_token   on public.company_invitations(token_hash);

-- Garante 1 convite pendente ativo por (company,email)
create unique index ux_company_invitations_pending_unique
  on public.company_invitations(company_id, email)
  where status = 'pending';
```

### Tabela `password_reset_requests`

```sql
create table public.password_reset_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           citext not null,
  token_hash      bytea,
  short_code      text,
  status          text not null default 'pending_review'
                  check (status in ('pending_review','approved','consumed','revoked','expired')),
  source          text not null check (source in ('user_request','owner_initiated')),
  requested_at    timestamptz not null default now(),
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  consumed_at     timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users(id),
  metadata        jsonb not null default '{}'::jsonb
);

create index idx_password_reset_user   on public.password_reset_requests(user_id);
create index idx_password_reset_status on public.password_reset_requests(status);
create unique index ux_password_reset_short_code
  on public.password_reset_requests(short_code) where short_code is not null;
create unique index ux_password_reset_active_per_user
  on public.password_reset_requests(user_id)
  where status in ('pending_review','approved');
```

### Tabela `short_code_attempts` (rate-limit)

```sql
create table public.short_code_attempts (
  id              uuid primary key default gen_random_uuid(),
  ip              inet,
  identifier      text not null,         -- 'inv:<email>' | 'rst:<email>'
  attempts        int  not null default 1,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_short_code_attempts_ident on public.short_code_attempts(identifier);
```

### Notas

- `citext` requer extensão; criar na primeira migration.
- Status `expired` é lazy: queries devem testar `status = 'pending' AND expires_at > now()`. Cron diário marca como `expired`.
- `audit_logs` cobre auditoria — não duplicar.
- `role_ids` é snapshot: roles deletadas antes do aceite são filtradas no consume.

## 5. Primitiva de token (`src/lib/tokens.ts`)

```ts
import { randomBytes, createHash } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateShortCode(prefix: "INV" | "RST"): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

export function compareTokenHash(plain: string, stored: Buffer): boolean {
  return hashToken(plain).equals(stored);
}
```

Hash determinístico (sem salt) para permitir lookup; 256 bits de entropia suficientes contra brute force.

Código curto não é hasheado (41 bits); mitigação = rate-limit no endpoint via `short_code_attempts` (5 tentativas em 15 min por IP+identifier → bloqueio 1h).

## 6. Fluxo de convite

### Server Actions (em `src/modules/tenancy/actions/`)

```
createInvitationAction(companyId, email, roleIds[]) → ActionResult<{ link, shortCode }>
revokeInvitationAction(invitationId)                → ActionResult
regenerateInvitationAction(invitationId)            → ActionResult<{ link, shortCode }>
acceptInvitationAction(tokenOrShortCode, password?, fullName?) → ActionResult
```

### `createInvitationAction` — substitui `inviteMemberAction`

1. Permissão: `is_platform_admin()` OR `requirePermission(companyId, "core:invitation:create")`.
2. Valida email com Zod, normaliza para lowercase.
3. Bloqueia se já existe membership ativa para `(company_id, email)`.
4. Bloqueia se já existe convite pendente ativo (unique index garante).
5. Gera `token`, `shortCode`, calcula `token_hash`.
6. Insere `company_invitations` com `status='pending'`, `expires_at = now() + 7 days`.
7. Audit `invitation.created`.
8. Retorna plain `token` e `shortCode` **uma única vez**. UI mostra dialog "copie agora; não exibido novamente".
9. Link: `${NEXT_PUBLIC_APP_URL}/accept-invite?t=${token}`.

### `acceptInvitationAction` — substitui `acceptInviteAction`

Aceita `token` (URL) ou `short_code` (digitado).

1. Lookup:
   - Token: `where token_hash = hashToken(input) and status='pending' and expires_at > now()`.
   - Short code: chama `record_short_code_attempt(ip, 'inv:'||email)`; se locked → erro; senão lookup `where short_code = upper(input) and ...`.
2. Não autenticado:
   - Email não existe em `auth.users` → form de senha + nome → cria via `auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` e segue para passo 3 já com sessão.
   - Email existe → tela "Faça login para aceitar" → `/login?next=/accept-invite?t=...`.
3. Autenticado e email da sessão != email do convite → erro "email não bate; faça logout".
4. RPC `accept_invitation(p_token_hash, p_short_code, p_user_id)` — `security definer`, transacional:
   - Update invitation: `status='accepted', accepted_at, accepted_by`.
   - Insert membership `status='active', joined_at`.
   - Insert membership_roles a partir de `role_ids` (filtra IDs ainda válidos).
5. Audit `invitation.accepted`. `revalidatePath`. Redirect `/${slug}`.

### `revokeInvitationAction` / `regenerateInvitationAction`

- Revoke: update `status='revoked', revoked_at, revoked_by`. Mesma permissão de criar.
- Regenerate: revoke + create em transação. Retorna novo plain token/code.

### Mudança em `createCompanyAction`

Bloco que chamava `auth.admin.inviteUserByEmail` (linhas 101–150) substituído: cria empresa + se `ownerEmail` informado, chama `createInvitationAction` com role `owner`. Plain token/code retornado em campo extra do `ActionResult` (não em `message`); UI exibe dialog de credenciais.

### Queries

- `listPendingInvitations(companyId)` — aba "Convites pendentes".
- `getInvitationByTokenOrCode(input)` — server-side lookup para accept page.

## 7. Fluxo de sign-up

### Schema (`src/modules/auth/schemas/index.ts`)

```ts
export const signUpSchema = z
  .object({
    inviteToken: z.string().min(1, "Convite obrigatório"), // token longo OU short_code
    fullName: z.string().min(3, "Informe seu nome completo"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });
// Email NÃO vem do form — vem do convite (anti-tampering).
```

### `signUpAction` (reescrita)

1. Valida schema.
2. Lookup do convite (ativo, não expirado).
3. Se email do convite **já existe** em `auth.users` → erro "use Login + aceitar convite".
4. `serviceClient.auth.admin.createUser({ email: invite.email, password, email_confirm: true, user_metadata: { full_name } })`.
5. `signInWithPassword` com a credencial criada para estabelecer sessão.
6. Chama `accept_invitation` RPC.
7. Redirect `/${slug}`. Audit.

### Página `/register`

- Lê `?t=<token>` da query (link de convite). Se presente, pré-preenche e mostra email read-only.
- Sem `?t`, mostra apenas campo "Código de convite" + "Continuar" → depois mostra senha+nome.
- Linka pra `/login` se "Já tenho conta".
- Botão "Entrar com Google" **removido** de `/register`.

### Sign-up via Google

- Botão Google só em `/login`.
- Callback OAuth: se user **não tem** nenhum membership → redireciona para `/sem-acesso` (rota existente) com instrução "solicite convite ao admin".
- Aceitar convite por user Google logado já funciona via `acceptInvitationAction`.

## 8. Fluxo de recuperação de senha

### `recoverPasswordAction` (reescrita)

1. Valida email.
2. Lookup `auth.users` via RPC `get_user_id_by_email`.
3. Se user existe: insere `password_reset_requests(user_id, email, status='pending_review', source='user_request')`.
4. **Resposta sempre genérica** ("se cadastrado, solicitação enviada") — anti-enumeration.
5. Audit `password.reset_requested`.

### `approveResetRequestAction(requestId)` — usado pela aba "Solicitações de reset"

1. Permissão checada via RLS (platform admin OU company owner cuja empresa contém o user-alvo, target não pode ser owner).
2. Gera token + short_code + hash. Update request: `status='approved'`, `expires_at = now() + 24h`.
3. Audit `password.reset_approved`. Retorna `{ link, shortCode }` plain uma vez.

### `initiateResetForUserAction(userId)` — owner inicia direto

1. Mesma permissão.
2. Cria request com `source='owner_initiated'` já em `status='approved'`.
3. Resto idêntico a `approveResetRequestAction`.

### `revokeResetRequestAction(requestId)`

Update `status='revoked'`. Mesma permissão.

### `resetPasswordAction` (reescrita)

1. Recebe `tokenOrShortCode` + `password` + `confirmPassword`.
2. Lookup request: `status='approved' AND expires_at > now()` + match hash/code (com rate-limit no short code).
3. Service client: `auth.admin.updateUserById(user_id, { password })`.
4. Update request: `status='consumed', consumed_at`.
5. `auth.admin.signOut(user_id, 'global')` — invalida sessões antigas.
6. Audit `password.reset_consumed`. Redirect `/login`.

### Páginas

- `/recover` — mantém form de email. Mensagem: "Sua solicitação foi recebida; aguarde o administrador."
- `/recover/reset` — aceita `?t=<token>` (preenche oculto) ou exibe campo "Código de reset".

## 9. RLS e permissões

### Permissões novas

```sql
insert into permissions (code, module_code, resource, action) values
  ('core:invitation:create',    'core', 'invitation', 'create'),
  ('core:invitation:read',      'core', 'invitation', 'read'),
  ('core:invitation:revoke',    'core', 'invitation', 'revoke'),
  ('core:reset_request:read',   'core', 'reset_request', 'read'),
  ('core:reset_request:approve','core', 'reset_request', 'approve');
```

Backfill atribui aos roles `owner` e `admin` de todas as empresas existentes (padrão da seção "Adding permissions" do `CLAUDE.md`).

### Policies — `company_invitations`

- `select`: `is_platform_admin()` OR `has_permission(company_id, 'core:invitation:read')`.
- `insert`/`update`: via Server Action; policy `is_platform_admin() OR has_permission(company_id, 'core:invitation:create')`.
- `delete`: bloqueado.

### Policies — `password_reset_requests`

- `select`: `is_platform_admin()` OR `auth.uid() = user_id` OR (existe membership ativa do `auth.uid()` em qualquer empresa do `user_id` com `core:reset_request:read` E target user **não é** owner).
- `insert`: público via RPC `request_password_reset` (`security definer`); nunca via INSERT direto.
- `update`: `is_platform_admin()` OR mesma condição com `core:reset_request:approve`.

### Restrição "company owner não reseta outro owner"

Implementada em `approve_password_reset(p_request_id)`:

```sql
-- Pseudo: se actor não é platform_admin e target tem is_owner=true em alguma membership,
-- raise exception 'company_owner_cannot_reset_owner'.
```

## 10. UI

### `src/app/(dashboard)/[companySlug]/settings/members/page.tsx` — vira tabs

- **Ativos** (existente).
- **Convites pendentes** (novo): tabela `email | invited_by | criado_em | expira_em | ações`. Ações: Copiar link, Copiar código, Revogar, Regenerar.
- **Solicitações de reset** (novo): tabela `email | source | solicitado_em | status | ações`. Ações: Aprovar, Revogar.

### Componente novo — `credential-display-dialog.tsx`

- Mostra link completo + short code com botões "Copiar".
- Aviso destacado: "Esta tela só aparece uma vez. Copie agora."
- Fecha → não há como recuperar plain.

### `src/app/(auth)/register/page.tsx`

- Layout dois passos: 1) código de convite (ou `?t=` na URL pula passo); 2) nome + senha.
- Botão Google removido.

### `src/app/(auth)/recover/page.tsx`

- Mantém UX. Mensagem de sucesso atualizada.

### `src/app/(auth)/recover/reset/page.tsx`

- Aceita `?t=` (campo oculto) ou exibe "Código de reset".

### `src/app/accept-invite/page.tsx` — reescrita

Aceita `?t=` ou form com campo "Código de convite". Branches:

1. Não autenticado, email novo → form completo (senha + nome) → sign-up + accept atômico.
2. Não autenticado, email existente → "Faça login para continuar" → `/login?next=...`.
3. Autenticado, email bate → tela de confirmação (UX atual).
4. Autenticado, email não bate → erro com botão "Sair".

### Painel de plataforma — `src/app/(dashboard)/admin/`

- `companies/[id]/members/`: mesmas 3 tabs visíveis para qualquer empresa.
- Botão "Resetar senha" em cada membro → `initiateResetForUserAction`.
- `platform/reset-requests/` (novo): visão **global** de todas as solicitações pendentes (filtros por empresa/status). Break-glass quando user não tem owner ativo.

## 11. Migrations

Ordem de aplicação:

1. `20260504_01_invitations_and_resets.sql` — `citext` + tabelas + índices + RLS habilitado (sem policies).
2. `20260504_02_invitations_resets_rls.sql` — policies + RPCs `security definer`:
   - `accept_invitation(p_token_hash bytea, p_short_code text, p_user_id uuid)`.
   - `request_password_reset(p_email text)` — anti-enumeration.
   - `approve_password_reset(p_request_id uuid)` — anti-owner-resetando-owner.
   - `consume_password_reset(p_token_hash bytea, p_short_code text)` — retorna `user_id`.
3. `20260504_03_invitations_permissions.sql` — insere permissions + atribui aos roles `owner`/`admin` de todas as empresas.
4. `20260504_04_backfill_existing_invites.sql` — para cada `memberships.status='invited'` cria entry em `company_invitations` com novo token/code, `expires_at = now() + 7 days`. Loga IDs em `migration_backfill_log` (table temporária); platform admin extrai links via UI dedicada `/admin/platform/migration-invites` (one-shot).
5. `20260504_05_confirm_existing_users.sql` — `update auth.users set email_confirmed_at = now() where email_confirmed_at is null`.
6. `20260504_06_short_code_attempts.sql` — tabela + função `record_short_code_attempt(p_ip, p_identifier)`.

Após aplicar, rodar `npm run db:types` para regenerar `database.types.ts`.

## 12. Auditoria

Eventos novos em `audit_logs`:

- `invitation.created`, `invitation.accepted`, `invitation.revoked`, `invitation.regenerated`.
- `password.reset_requested`, `password.reset_approved`, `password.reset_consumed`, `password.reset_revoked`.

Metadata: `email`, `source`, `expires_at`, `actor_role` (`platform_admin` vs `company_owner`).

## 13. Cron / cleanup

- Endpoint `src/app/api/cron/expire-tokens/route.ts` (1×/dia): seta `status='expired'` em invitations/resets com `expires_at < now() AND status IN ('pending','approved','pending_review')`. Limpa `short_code_attempts` mais antigos que 7 dias.
- Schedule via `vercel.json` (ou `vercel.ts`): `0 3 * * *`. Header `Authorization: Bearer ${CRON_SECRET}` para autenticar.

## 14. Variáveis de ambiente

- `SUPABASE_SERVICE_ROLE_KEY` — torna obrigatória em `src/core/config/env.ts` (sistema não funciona sem).
- `NEXT_PUBLIC_APP_URL` — já existe.
- `CRON_SECRET` — nova, opcional em dev. Validada em `env.ts` apenas em produção.

## 15. Testes

Sem runner configurado hoje. Plano de implementação deve adicionar `vitest` + casos:

- `src/lib/__tests__/tokens.test.ts` — entropia, hash determinístico, compare constant-time.
- `src/modules/tenancy/actions/__tests__/create-invitation.test.ts` — happy path, duplicate pendente, sem permissão, expiração.
- `src/modules/tenancy/actions/__tests__/accept-invitation.test.ts` — token longo, short code, rate-limit, email mismatch, usuário existente, usuário novo.
- `src/modules/auth/actions/__tests__/password-reset.test.ts` — request, approve, consume, anti-owner-resetando-owner, anti-enumeration.

## 16. Limpeza de código antigo

- `src/modules/tenancy/actions/invite-member.ts` → renomeado para `create-invitation.ts`, conteúdo reescrito.
- Bloco de `inviteUserByEmail` em `create-company.ts` (linhas 101–150) → substituído por chamada a `createInvitationAction`.
- `recoverPasswordAction` e `resetPasswordAction` (`src/modules/auth/actions/`) reescritas.
- `signUpAction` reescrita.
- `index.ts` dos módulos atualizados (barrel).

Critério: `grep -r "inviteUserByEmail\|resetPasswordForEmail\|emailRedirectTo" src/` retorna 0.

## 17. Riscos identificados

1. **Atomicidade do aceite** — RPC `accept_invitation` deve ser `security definer` + `set local` para evitar bypass de RLS acidental.
2. **`createUser` com email já existente** — Supabase retorna erro; tratar e cair no branch "use login + accept".
3. **Race condition no aceite** — unique index `ux_company_invitations_pending_unique` + `select ... for update` na RPC garantem 1 aceite só.
4. **`auth.email()` em RLS** — usar `(select email from auth.users where id = auth.uid())` ou função helper, pois `auth.email()` pode não estar disponível em todos os contextos.
5. **Migration `email_confirmed_at`** — verificar trigger `on_auth_user_confirmed` (migração 31 fixa profile creation); revisar antes de aplicar.
6. **Rate-limit short code** — sem ele, 41 bits viram brute-force. Bloquear após 5 falhas em 15 min por IP+code-prefix; lock 1h.
7. **`signInWithPassword` programático no sign-up** — alternativa: usar `setSession` com tokens retornados de `createUser`. Validar em prototipagem.

## 18. Critérios de sucesso

- Nenhuma chamada SMTP no codebase: `grep -r "inviteUserByEmail\|resetPasswordForEmail" src/` retorna 0.
- Empresa nova é criada sem SMTP, owner aceita via link, novos membros idem.
- Usuário consegue solicitar reset via `/recover`, owner aprova, link de reset funciona em até 24h.
- RLS bloqueia: usuário tentando ler convites de outra empresa, company owner tentando resetar outro owner da mesma empresa.
- Migração não quebra empresas existentes — convites antigos podem ser regenerados pelo platform admin via UI dedicada.
- Lighthouse das telas `/register`, `/recover`, `/accept-invite` mantém ≥90 em performance e acessibilidade.

## 19. Branch / PR / Issue dedicados

Esta implementação **deve** ser entregue de forma isolada:

- **Issue**: criar issue no GitHub com título `Refactor: SMTP-free auth flows (invite, sign-up, password reset)`. Body referencia este spec (`docs/superpowers/specs/2026-05-04-smtp-free-auth-flows-design.md`), lista resumida das 9 decisões da seção 2, e é marcada com labels `enhancement`, `auth`, `breaking-change`.
- **Branch**: `feat/smtp-free-auth-flows`, criada a partir de `main` em worktree dedicada (`.worktrees/smtp-free-auth-flows`) usando `superpowers:using-git-worktrees`. Nenhuma mudança de SMTP-flow vai pra outra branch.
- **PR**: aberto contra `main` ao final da implementação, descrição no template `## Summary / ## Test plan` linkando a issue (`Closes #<n>`) e este spec; revisão obrigatória antes de merge.
- Não usar `git push --force` na branch após o primeiro push compartilhado; usar `--force-with-lease` se houver rebase.

## 20. Próximos passos

Após aprovação deste spec:

1. Criar issue + branch + worktree conforme seção 19.
2. Invocar skill `superpowers:writing-plans` para gerar plano de implementação detalhado em `docs/superpowers/plans/2026-05-04-smtp-free-auth-flows-plan.md`.
3. Executar via `superpowers:executing-plans` ou `superpowers:subagent-driven-development`.
4. Abrir PR conforme seção 19 ao concluir.
