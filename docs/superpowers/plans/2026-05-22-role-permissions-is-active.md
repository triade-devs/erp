# PR #A — `role_permissions.is_active` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soft-deactivate `role_permissions` quando módulo é desligado (não deletar). Reativar mantém customizações tenant.

**Architecture:** Adicionar coluna `role_permissions.is_active boolean not null default true`. Refatorar `toggleModuleAction` e `bulkToggleModuleForCompaniesAction` para flipar `is_active` em vez de DELETE/INSERT em massa. `has_permission()` ainda não filtra por `is_active` (vem no PR #B).

**Tech Stack:** Supabase Postgres + RLS · Next.js 15 Server Actions · Vitest (mocks de Supabase chain) · `npm run db:push` / `db:types`.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção 5.2.

---

## File Structure

| Arquivo                                                                          | Responsabilidade    | Ação                                |
| -------------------------------------------------------------------------------- | ------------------- | ----------------------------------- |
| `supabase/migrations/20260522000046_role_permissions_is_active.sql`              | Coluna nova + index | CREATE                              |
| `src/types/database.types.ts`                                                    | Tipos gerados       | REGENERATE (script)                 |
| `src/modules/tenancy/actions/toggle-module.ts`                                   | Toggle por empresa  | MODIFY (disable+enable paths)       |
| `src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts`                | Toggle global       | MODIFY (disable+enable paths)       |
| `src/modules/tenancy/actions/__tests__/toggle-module.test.ts`                    | Testes existentes   | MODIFY (esperar update, não delete) |
| `src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts` | Testes existentes   | MODIFY                              |

Não toca: `update-role-permissions.ts`, `has_permission()`, RLS policies. Comportamento de leitura (`has_permission`) não muda nesta PR — perms ficam visíveis mas inativas; o filtro vem no PR #B.

---

## Task 1: Migration — adicionar coluna `is_active`

**Files:**

- Create: `supabase/migrations/20260522000046_role_permissions_is_active.sql`
- Regenerate: `src/types/database.types.ts`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260522000046_role_permissions_is_active.sql
-- PR #A da evolução de roles: soft-deactivate de role_permissions
-- quando módulo é desligado. has_permission() ainda não filtra por isto
-- (próxima PR #B). Default true mantém retrocompatibilidade.

alter table public.role_permissions
  add column is_active boolean not null default true;

-- Index parcial: queries quentes filtram por is_active=true. Index parcial
-- reduz tamanho mantendo benefício para o caso comum.
create index if not exists idx_role_permissions_active
  on public.role_permissions (role_id, permission_code)
  where is_active = true;

comment on column public.role_permissions.is_active is
  'Marca lógica de ativação. false = preservado mas ignorado por has_permission a partir do PR #B.';
```

- [ ] **Step 2: Aplicar migration no banco linkado**

Run: `npm run db:push`
Expected output (resumido):

```
Applying migration 20260522000046_role_permissions_is_active.sql...
Finished supabase db push.
```

- [ ] **Step 3: Regenerar tipos**

Run: `npm run db:types`
Expected: `src/types/database.types.ts` agora contém `is_active: boolean` em `role_permissions.Row`, `Insert`, `Update`.

- [ ] **Step 4: Validar coluna nova nos tipos**

Run: `grep -A6 "role_permissions:" src/types/database.types.ts | grep is_active`
Expected: linhas com `is_active: boolean` (no Row) e `is_active?: boolean` (no Insert/Update).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: zero erros.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260522000046_role_permissions_is_active.sql src/types/database.types.ts
git commit -m "feat(authz): add role_permissions.is_active column

PR #A da evolução de roles/perms. Coluna default true para preservar
comportamento atual. Index parcial para queries quentes. has_permission()
ainda não filtra por is_active (próxima PR)."
```

---

## Task 2: Refatorar `toggleModuleAction` — disable path soft-deactivate

**Files:**

- Modify: `src/modules/tenancy/actions/toggle-module.ts:67-99` (bloco `else` do `if (enable)`)
- Modify: `src/modules/tenancy/actions/__tests__/toggle-module.test.ts:110-176` (factory `makeDisableMock`) e testes do disable path

- [ ] **Step 1: Atualizar `makeDisableMock` para esperar UPDATE em vez de DELETE em `role_permissions`**

Em `src/modules/tenancy/actions/__tests__/toggle-module.test.ts`, substituir o bloco `// role_permissions: .delete().in("role_id").in("permission_code")` por mock de UPDATE:

```ts
// role_permissions: .update({ is_active: false }).in("role_id").in("permission_code") — sem return
const rolePermsUpdateIn2 = vi.fn().mockResolvedValue({ data: null, error: null });
const rolePermsUpdateIn1 = vi.fn().mockReturnValue({ in: rolePermsUpdateIn2 });
const rolePermsUpdateFn = vi.fn().mockReturnValue({ in: rolePermsUpdateIn1 });
```

E no `from` mock:

```ts
if (table === "role_permissions") {
  return { update: rolePermsUpdateFn };
}
```

E nos returns expostos:

```ts
    rolePermsUpdateFn,
    rolePermsUpdateIn2,
```

(remover `rolePermsDeleteIn2` antigo).

- [ ] **Step 2: Atualizar testes do disable path para esperar UPDATE**

Substituir teste `"ao desabilitar módulo chama delete em role_permissions com os ids corretos"` por:

```ts
it("ao desabilitar módulo chama update com is_active=false em role_permissions", async () => {
  const mock = makeDisableMock({
    isPlatformAdmin: true,
    companyRoles: [{ id: "role-a" }, { id: "role-b" }],
    permsToRemove: [{ code: "inventory:product:read" }],
  });
  await callToggle(mock, "company-1", "inventory", false);

  expect(mock.permsEqDisable).toHaveBeenCalledWith("module_code", "inventory");

  // update foi chamado com payload de desativação
  expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: false });
  // segundo .in() recebe permission_codes corretos
  expect(mock.rolePermsUpdateIn2).toHaveBeenCalledWith(
    "permission_code",
    expect.arrayContaining(["inventory:product:read"]),
  );
});
```

- [ ] **Step 3: Rodar teste e verificar que falha**

Run: `npm run test -- toggle-module.test.ts`
Expected: 1 teste falhando (`"chama update com is_active=false"`), mensagem tipo `TypeError: ... .update is not a function` ou `expected update to have been called`.

- [ ] **Step 4: Implementar — substituir DELETE por UPDATE no disable path**

Em `src/modules/tenancy/actions/toggle-module.ts`, substituir bloco a partir da linha 67:

```ts
  } else {
    const { error } = await supabase
      .from("company_modules")
      .delete()
      .eq("company_id", companyId)
      .eq("module_code", moduleCode);

    if (error) return { ok: false, message: error.message };

    // Desativa logicamente permissões do módulo nas roles da empresa.
    // Não deleta: preserva customizações tenant para quando módulo for reativado.
    const { data: permsToDeactivate } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    if (permsToDeactivate?.length) {
      const { data: companyRoles } = await supabase
        .from("roles")
        .select("id")
        .eq("company_id", companyId);

      const roleIds = (companyRoles ?? []).map((r) => r.id);
      if (roleIds.length) {
        const { error: updErr } = await supabase
          .from("role_permissions")
          .update({ is_active: false })
          .in("role_id", roleIds)
          .in(
            "permission_code",
            permsToDeactivate.map((p) => p.code),
          );
        if (updErr) return { ok: false, message: updErr.message };
      }
    }
  }
```

- [ ] **Step 5: Rodar testes e verificar PASS**

Run: `npm run test -- toggle-module.test.ts`
Expected: todos os testes passam (incluindo o novo).

- [ ] **Step 6: Commit**

```bash
git add src/modules/tenancy/actions/toggle-module.ts src/modules/tenancy/actions/__tests__/toggle-module.test.ts
git commit -m "refactor(tenancy): soft-deactivate role_permissions no disable de módulo

Disable path agora marca is_active=false em vez de DELETE. Preserva
customizações tenant para quando módulo for reativado. has_permission()
ainda não filtra por is_active (próxima PR)."
```

---

## Task 3: Refatorar `toggleModuleAction` — enable path reativa perms existentes

**Files:**

- Modify: `src/modules/tenancy/actions/toggle-module.ts:24-66` (bloco `if (enable)`)
- Modify: `src/modules/tenancy/actions/__tests__/toggle-module.test.ts:33-100` (factory `makeEnableMock`)

**Contexto do problema:** Hoje o enable path faz `upsert` com `ignoreDuplicates: true` — se a perm já existe (caso de re-enable após disable), o upsert pula. Resultado: rows ficam com `is_active=false` permanentemente após re-enable. Precisamos garantir que re-enable ressuscite (`is_active=true`).

- [ ] **Step 1: Adicionar mock para UPDATE de reativação no `makeEnableMock`**

Em `src/modules/tenancy/actions/__tests__/toggle-module.test.ts`, dentro do `makeEnableMock`, adicionar mock para UPDATE de reativação ANTES do upsert (a sequência nova será: select existentes → upsert novos → update reativar existentes):

```ts
// role_permissions: chain dupla — primeiro update (reativar), depois upsert (inserir novos)
const rolePermsUpdateIn2 = vi.fn().mockResolvedValue({ data: null, error: null });
const rolePermsUpdateIn1 = vi.fn().mockReturnValue({ in: rolePermsUpdateIn2 });
const rolePermsUpdateFn = vi.fn().mockReturnValue({ in: rolePermsUpdateIn1 });
const rolePermsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
```

No `from`:

```ts
if (table === "role_permissions") {
  return { update: rolePermsUpdateFn, upsert: rolePermsUpsert };
}
```

Expor:

```ts
    rolePermsUpdateFn,
    rolePermsUpsert,
```

- [ ] **Step 2: Adicionar teste para reativação no re-enable**

Adicionar teste novo após o teste `"passa os campos corretos para upsert"`:

```ts
it("ao habilitar módulo chama update com is_active=true para reativar perms antigas", async () => {
  const mock = makeEnableMock({
    isPlatformAdmin: true,
    systemRoles: [{ id: "role-owner-id", code: "owner" }],
    permissions: [{ code: "inventory:product:read" }],
  });
  await callToggle(mock, "company-1", "inventory", true);

  // update foi chamado com is_active=true (reativação)
  expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: true });
});
```

- [ ] **Step 3: Rodar teste e verificar que falha**

Run: `npm run test -- toggle-module.test.ts`
Expected: teste novo falha (`"chama update com is_active=true"`) porque `toggle-module.ts` ainda só faz upsert.

- [ ] **Step 4: Implementar — adicionar reativação antes do upsert no enable path**

Em `src/modules/tenancy/actions/toggle-module.ts`, dentro do loop `for (const role of systemRoles ?? [])`, depois do `if (perms?.length) { ... upsert ... }` adicionar bloco de reativação. Mas a forma mais simples (uma chamada global, não no loop): fazer UM update de reativação após o loop, cobrindo todas as roles da empresa.

Substituir bloco `if (enable) { ... }` inteiro por:

```ts
  if (enable) {
    const { error } = await supabase.from("company_modules").insert({
      company_id: companyId,
      module_code: moduleCode,
      enabled_by: user.id,
    });
    if (error) return { ok: false, message: error.message };

    // Reativa perms previamente desativadas (preserva customizações)
    const { data: companyRoles } = await supabase
      .from("roles")
      .select("id")
      .eq("company_id", companyId);

    const allRoleIds = (companyRoles ?? []).map((r) => r.id);

    const { data: modulePerms } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    const modulePermCodes = (modulePerms ?? []).map((p) => p.code);

    if (allRoleIds.length && modulePermCodes.length) {
      const { error: updErr } = await supabase
        .from("role_permissions")
        .update({ is_active: true })
        .in("role_id", allRoleIds)
        .in("permission_code", modulePermCodes);
      if (updErr) return { ok: false, message: updErr.message };
    }

    // Distribui permissões do módulo nas roles-sistema existentes (caso primeira vez)
    const { data: systemRoles } = await supabase
      .from("roles")
      .select("id, code")
      .eq("company_id", companyId)
      .eq("is_system", true);

    for (const role of systemRoles ?? []) {
      let actionsFilter: string[] = [];
      if (role.code === "owner") {
        // owner ganha tudo
      } else if (role.code === "manager") {
        actionsFilter = ["read", "create", "update", "delete", "export", "approve"];
      } else if (role.code === "operator") {
        actionsFilter = ["read", "create"];
      }

      const { data: perms } = await supabase
        .from("permissions")
        .select("code")
        .eq("module_code", moduleCode)
        .in(
          "action",
          actionsFilter.length
            ? actionsFilter
            : ["read", "create", "update", "delete", "export", "approve", "cancel"],
        );

      if (perms?.length) {
        await supabase.from("role_permissions").upsert(
          perms.map((p) => ({ role_id: role.id, permission_code: p.code, is_active: true })),
          { onConflict: "role_id,permission_code", ignoreDuplicates: true },
        );
      }
    }
  } else {
```

**Notas:**

- O bloco reativa primeiro (todos os roles), depois o loop garante que perms-padrão existam (idempotente via `ignoreDuplicates`).
- `roles.select` agora é chamado duas vezes (uma sem `is_system`, outra com). Cosmético; pode fundir em Task 4 se desejado.
- O upsert ganha `is_active: true` explicitamente (em caso de re-insert).

- [ ] **Step 5: Ajustar `makeEnableMock` para suportar nova chamada de `roles.select` sem filtro `is_system`**

A sequência muda. `makeEnableMock` precisa permitir DUAS chamadas a `from("roles").select(...)`. A primeira chamada faz `.eq("company_id")` apenas; a segunda faz `.eq("company_id").eq("is_system", true)`.

Substituir bloco `roles:` no `makeEnableMock`:

```ts
// roles: primeira chamada (todas) — .select("id").eq("company_id")
const rolesAllEq = vi
  .fn()
  .mockResolvedValue({ data: [{ id: "role-owner" }, { id: "role-manager" }], error: null });
const rolesAllSelect = vi.fn().mockReturnValue({ eq: rolesAllEq });

// roles: segunda chamada (system) — .select("id, code").eq("company_id").eq("is_system")
const rolesEq2System = vi.fn().mockResolvedValue({ data: systemRoles, error: null });
const rolesEq1System = vi.fn().mockReturnValue({ eq: rolesEq2System });
const rolesSelectSystem = vi.fn().mockReturnValue({ eq: rolesEq1System });

// permissions: idem — uma chamada para reativação (.select.eq), outra para distribuição (.select.eq.in)
const permsReactEq = vi.fn().mockResolvedValue({ data: permissions, error: null });
const permsReactSelect = vi.fn().mockReturnValue({ eq: permsReactEq });

const permsDistIn = vi.fn().mockResolvedValue({ data: permissions, error: null });
const permsDistEq = vi.fn().mockReturnValue({ in: permsDistIn });
const permsDistSelect = vi.fn().mockReturnValue({ eq: permsDistEq });

let rolesCallCount = 0;
let permsCallCount = 0;
```

E ajustar `from`:

```ts
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "company_modules") {
        return { insert: modulesInsert };
      }
      if (table === "roles") {
        rolesCallCount++;
        return { select: rolesCallCount === 1 ? rolesAllSelect : rolesSelectSystem };
      }
      if (table === "permissions") {
        permsCallCount++;
        return { select: permsCallCount === 1 ? permsReactSelect : permsDistSelect };
      }
      if (table === "role_permissions") {
        return { update: rolePermsUpdateFn, upsert: rolePermsUpsert };
      }
      // fallback (mantém)
      return vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    }),
```

- [ ] **Step 6: Atualizar teste `"passa os campos corretos para upsert"` para esperar `is_active: true`**

```ts
expect(mock.rolePermsUpsert).toHaveBeenCalledWith(
  expect.arrayContaining([
    expect.objectContaining({ permission_code: "inventory:product:read", is_active: true }),
    expect.objectContaining({ permission_code: "inventory:product:create", is_active: true }),
  ]),
  expect.objectContaining({ onConflict: "role_id,permission_code" }),
);
```

- [ ] **Step 7: Rodar testes — verificar PASS**

Run: `npm run test -- toggle-module.test.ts`
Expected: todos os testes passam.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: zero erros.

- [ ] **Step 9: Commit**

```bash
git add src/modules/tenancy/actions/toggle-module.ts src/modules/tenancy/actions/__tests__/toggle-module.test.ts
git commit -m "refactor(tenancy): reativa role_permissions no enable de módulo

Enable path agora faz UPDATE is_active=true antes de upsert. Preserva
customizações tenant que foram desativadas pelo disable. Casa com
soft-deactivate introduzido no commit anterior."
```

---

## Task 4: Refatorar `bulkToggleModuleForCompaniesAction` analogamente

**Files:**

- Modify: `src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts:26-90` (ambos os paths)
- Modify: `src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts`

Mesma semântica do PR anterior, mas global (todas as empresas).

- [ ] **Step 1a: Atualizar mocks do bulk para esperar UPDATE em role_permissions (disable e enable)**

Em `src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts`, substituir o(s) mock(s) atuais de `role_permissions` por:

```ts
// role_permissions: chain de update (.update({...}).in("permission_code", codes)) — disable e enable usam
const rolePermsUpdateIn = vi.fn().mockResolvedValue({ data: null, error: null });
const rolePermsUpdateFn = vi.fn().mockReturnValue({ in: rolePermsUpdateIn });

// role_permissions: upsert (usado pelo enable para distribuir perms-padrão)
const rolePermsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
```

No `from`:

```ts
if (table === "role_permissions") {
  return { update: rolePermsUpdateFn, upsert: rolePermsUpsert };
}
```

Expor:

```ts
    rolePermsUpdateFn,
    rolePermsUpdateIn,
    rolePermsUpsert,
```

- [ ] **Step 1b: Adicionar teste do disable path**

```ts
it("disable: marca is_active=false em role_permissions globalmente", async () => {
  const mock = makeBulkDisableMock({
    isPlatformAdmin: true,
    permsToRemove: [{ code: "inventory:product:read" }, { code: "inventory:product:create" }],
  });
  vi.mocked(createClient).mockResolvedValue(mock as never);

  const result = await bulkToggleModuleForCompaniesAction("inventory", false);

  expect(result.ok).toBe(true);
  expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: false });
  expect(mock.rolePermsUpdateIn).toHaveBeenCalledWith(
    "permission_code",
    expect.arrayContaining(["inventory:product:read", "inventory:product:create"]),
  );
});
```

- [ ] **Step 1c: Adicionar teste do enable path (reativação)**

```ts
it("enable: marca is_active=true em role_permissions globalmente antes do upsert", async () => {
  const mock = makeBulkEnableMock({
    isPlatformAdmin: true,
    modulePerms: [
      { code: "inventory:product:read", action: "read" },
      { code: "inventory:product:create", action: "create" },
    ],
  });
  vi.mocked(createClient).mockResolvedValue(mock as never);

  const result = await bulkToggleModuleForCompaniesAction("inventory", true);

  expect(result.ok).toBe(true);
  expect(mock.rolePermsUpdateFn).toHaveBeenCalledWith({ is_active: true });
  expect(mock.rolePermsUpdateIn).toHaveBeenCalledWith(
    "permission_code",
    expect.arrayContaining(["inventory:product:read", "inventory:product:create"]),
  );
});
```

- [ ] **Step 1d: Adicionar teste do enable path (upsert traz is_active=true)**

```ts
it("enable: upsert das perms-padrão inclui is_active=true", async () => {
  const mock = makeBulkEnableMock({
    isPlatformAdmin: true,
    systemRoles: [{ id: "role-owner", code: "owner" }],
    modulePerms: [{ code: "inventory:product:read", action: "read" }],
  });
  vi.mocked(createClient).mockResolvedValue(mock as never);

  await bulkToggleModuleForCompaniesAction("inventory", true);

  expect(mock.rolePermsUpsert).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ permission_code: "inventory:product:read", is_active: true }),
    ]),
    expect.objectContaining({ onConflict: "role_id,permission_code" }),
  );
});
```

**Nota sobre factories `makeBulkDisableMock` / `makeBulkEnableMock`:** se ainda não existem no arquivo, crie-as seguindo o mesmo padrão de `makeDisableMock`/`makeEnableMock` em `toggle-module.test.ts`, mas:

- Sem parâmetro `companyId` (bulk é global).
- `companies` mock no enable: `vi.fn().mockResolvedValue({ data: [{ id: "comp-1" }, { id: "comp-2" }], error: null })`.
- `roles.select` no enable é UMA chamada (com `eq("is_system", true)`), não duas.
- `permissions.select` é UMA chamada (`.eq("module_code")`) que retorna `{code, action}[]`.
- `company_modules` mock no disable: `.delete().eq("module_code")` — uma `eq` só.

- [ ] **Step 2: Rodar testes — verificar FAIL**

Run: `npm run test -- bulk-toggle-module-for-companies.test.ts`
Expected: testes novos falham.

- [ ] **Step 3: Implementar disable path do bulk — soft-deactivate global**

Em `src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts`, substituir bloco a partir da linha 71 (`} else {`):

```ts
  } else {
    const { error } = await supabase.from("company_modules").delete().eq("module_code", moduleCode);
    if (error) return { ok: false, message: error.message };

    // Soft-deactivate global de role_permissions do módulo em todas as empresas
    const { data: permsToDeactivate } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    if (permsToDeactivate?.length) {
      const permCodes = permsToDeactivate.map((p) => p.code);
      const { error: updErr } = await supabase
        .from("role_permissions")
        .update({ is_active: false })
        .in("permission_code", permCodes);
      if (updErr) return { ok: false, message: updErr.message };
    }
  }
```

- [ ] **Step 4: Implementar enable path do bulk — reativar globalmente antes do upsert**

Logo antes do bloco `} else {`, ao final do `if (enable)` (após o upsert), inserir UPDATE de reativação. Sequência ideal: reativar PRIMEIRO, depois inserir novos.

Substituir bloco inteiro `if (enable) { ... }` (linhas 26-70) por:

```ts
  if (enable) {
    const { data: companies, error: compErr } = await supabase.from("companies").select("id");
    if (compErr) return { ok: false, message: compErr.message };

    const rows = (companies ?? []).map((c) => ({
      company_id: c.id,
      module_code: moduleCode,
      enabled_by: user.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("company_modules")
        .upsert(rows, { onConflict: "company_id,module_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }

    const { data: modulePerms } = await supabase
      .from("permissions")
      .select("code, action")
      .eq("module_code", moduleCode);

    const modulePermCodes = (modulePerms ?? []).map((p) => p.code);

    // Reativa globalmente perms previamente desativadas
    if (modulePermCodes.length) {
      const { error: updErr } = await supabase
        .from("role_permissions")
        .update({ is_active: true })
        .in("permission_code", modulePermCodes);
      if (updErr) return { ok: false, message: updErr.message };
    }

    // Distribui perms-padrão nas roles-sistema (idempotente)
    const { data: systemRoles } = await supabase
      .from("roles")
      .select("id, code")
      .eq("is_system", true);

    const permsByAction = (actions: string[]) =>
      (modulePerms ?? []).filter((p) => actions.includes(p.action)).map((p) => p.code);

    const ownerPerms = permsByAction(OWNER_ACTIONS);
    const managerPerms = permsByAction(MANAGER_ACTIONS);
    const operatorPerms = permsByAction(OPERATOR_ACTIONS);

    const rpRows: { role_id: string; permission_code: string; is_active: boolean }[] = [];
    for (const role of systemRoles ?? []) {
      let perms: string[] = [];
      if (role.code === "owner") perms = ownerPerms;
      else if (role.code === "manager") perms = managerPerms;
      else if (role.code === "operator") perms = operatorPerms;
      for (const perm of perms)
        rpRows.push({ role_id: role.id, permission_code: perm, is_active: true });
    }

    if (rpRows.length > 0) {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rpRows, { onConflict: "role_id,permission_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }
  } else {
```

- [ ] **Step 5: Rodar testes — verificar PASS**

Run: `npm run test -- bulk-toggle-module-for-companies.test.ts`
Expected: todos passam.

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: zero erros.

- [ ] **Step 7: Suite completa de testes**

Run: `npm run test`
Expected: nada quebrado em outros arquivos.

- [ ] **Step 8: Commit**

```bash
git add src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
git commit -m "refactor(tenancy): bulk toggle usa soft-deactivate de role_permissions

Mesma semântica do toggle por empresa, mas global. Disable marca
is_active=false; enable reativa is_active=true antes de upsert das
perms-padrão."
```

---

## Task 5: Validação manual + revisão final

- [ ] **Step 1: Subir dev server**

Run: `npm run dev`

- [ ] **Step 2: Validar fluxo manual de toggle**

Como platform admin, abra `/admin/platform/modules` (ou `/admin/companies/[id]/modules`):

1. Desabilite módulo `inventory` em uma empresa qualquer (`tenant A`).
2. Conecte no banco (Supabase Studio ou `psql`): `select role_id, permission_code, is_active from role_permissions where permission_code like 'inventory:%' and role_id in (select id from roles where company_id = '<tenant A>');`.
3. **Expected:** rows existem com `is_active = false`.
4. Reabilite o módulo.
5. Mesma query.
6. **Expected:** rows agora `is_active = true`.

- [ ] **Step 3: Validar que perms customizadas em role custom sobrevivem ao ciclo disable→enable**

1. Em `tenant A`, crie role custom "Auditor".
2. Atribua `inventory:product:read` à role "Auditor".
3. Desabilite módulo `inventory`.
4. Query: `select is_active from role_permissions where role_id = '<auditor>' and permission_code = 'inventory:product:read';`.
5. **Expected:** `is_active = false` (preservado).
6. Reabilite.
7. **Expected:** `is_active = true` — customização sobreviveu.

- [ ] **Step 4: Validar que comportamento de leitura ainda não filtra (PR #B virá)**

1. Como user do `tenant A` (não admin), com módulo `inventory` DESABILITADO, tente acessar `/[companySlug]/inventory`.
2. **Expected:** página AINDA mostra produtos (`has_permission` ainda não filtra por `is_active`). Documentar este comportamento como esperado nesta PR — vira fix automático na PR #B.

- [ ] **Step 5: Adicionar nota no PR description**

PR body deve incluir:

- "PR #A da evolução de roles (`docs/superpowers/specs/2026-05-22-roles-evolucao-design.md`)."
- "`has_permission()` ainda não respeita `is_active` — virá na PR #B junto com merge do `is_platform_admin()`."
- "Após merge: módulos desabilitados ainda concedem acesso até PR #B subir."

- [ ] **Step 6: Push + abrir PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(authz): role_permissions.is_active (PR #A)" --body "$(cat <<'EOF'
## Summary
- Adiciona coluna `role_permissions.is_active boolean not null default true` + index parcial.
- Refatora `toggleModuleAction` e `bulkToggleModuleForCompaniesAction` para soft-deactivate (UPDATE) em vez de DELETE.
- Reativação em re-enable preserva customizações tenant.

## Contexto
PR #A da evolução de roles & permissões. Spec: `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` (seção 5.2).

`has_permission()` ainda NÃO filtra por `is_active` — virá na PR #B junto com merge do `is_platform_admin()`. Até lá: módulos desabilitados continuam concedendo acesso (sem regressão funcional, apenas semântica do flag não está ativa).

## Test plan
- [x] Testes unitários passam (`npm run test`)
- [x] `npm run typecheck` zero erros
- [ ] Manual: disable → query mostra `is_active=false`; re-enable → `is_active=true`
- [ ] Manual: role custom com perm de módulo sobrevive ciclo disable→enable
EOF
)"
```

---

## Self-Review Checklist

- **Coverage:** Spec seção 5.2 inteira é endereçada (coluna + soft-deactivate + reativação). ✅
- **Placeholders:** Nenhum TBD/TODO. ✅
- **Type consistency:** Mocks usam `update`/`upsert` consistentes; tipos derivam de `database.types.ts` regenerado. ✅
- **Ambiguidade:** O motivo do "doble select" em `toggle-module.ts` (uma para todos os roles, outra só system) está documentado inline.
- **Risco residual:** Re-enable em empresa que **nunca** teve módulo (no rows pré-existentes) → UPDATE não afeta nada, upsert insere com `is_active=true`. ✅
- **Rollback:** drop column é reverso trivial; semantically empty (rows nunca lidas pelo `has_permission` nesta PR).

## YAGNI (explicitamente fora desta PR)

- `has_permission()` filtrar por `is_active` (vem na PR #B).
- UI badge "Inativo" em `role-permissions-table` (cosmético; pode entrar quando PR #B fizer o flag ter efeito visível).
- Migration que limpa rows `is_active=false` antigas (não existem; coluna é nova).
