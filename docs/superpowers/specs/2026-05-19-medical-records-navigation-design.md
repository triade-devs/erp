# Design: Melhoria de Navegação — Módulo Prontuário Médico

**Data:** 2026-05-19  
**Branch:** `codex-medical-records-module`  
**Escopo:** Navegação e estrutura de rotas do módulo `medical-records`

---

## Problema

A navegação do módulo de Prontuário Médico tem três problemas estruturais:

1. **"Novo paciente" como aba de navegação** — ação de criação exposta como item de nav, o que confunde a hierarquia entre seções e ações.
2. **Abas do prontuário apontam para formulários de criação** — clicar em "Consulta" leva direto ao formulário em branco (`/consultations/new`), sem passar por uma listagem dos registros existentes. Não há como ver consultas anteriores sem sair das abas.
3. **Sem orientação espacial** — dentro de uma consulta ou prescrição específica, o usuário não sabe onde está e não tem como voltar sem usar o botão "← Pacientes" genérico.

---

## Solução

### 1. `MedicalModuleNav` — remover ação da navegação

Remove o item "Novo paciente" das abas. O botão já existe na própria página de listagem de pacientes (`MedicalPage`), onde faz mais sentido contextualmente.

**Abas resultantes:**

- Pacientes → `/[companySlug]/medical`
- Modelos de consentimento → `/[companySlug]/medical/consent-templates`

### 2. `PatientRecordNav` — abas corretas + contadores + breadcrumb

#### 2a. Abas com destino correto

As abas passam a apontar para páginas de **listagem**, não para formulários de criação:

| Aba            | Destino anterior                 | Destino novo                 |
| -------------- | -------------------------------- | ---------------------------- |
| Resumo         | `/[patientId]`                   | sem mudança                  |
| Consultas      | `/[patientId]/consultations/new` | `/[patientId]/consultations` |
| Prescrições    | `/[patientId]/prescriptions/new` | `/[patientId]/prescriptions` |
| Consentimentos | `/[patientId]/consents/new`      | `/[patientId]/consents`      |

#### 2b. Contadores nas abas

Cada aba exibe o total de registros entre parênteses: `Consultas (3)`. Os counts são derivados do `timeline` já retornado por `getPatientRecord`, sem chamadas adicionais ao banco.

A prop `counts` é passada para `PatientRecordNav`:

```ts
type Counts = { consultations: number; prescriptions: number; consents: number };
```

#### 2c. Breadcrumb substitui o botão "← Pacientes"

O botão `← Pacentes` é removido. No lugar, o componente `Breadcrumb` do shadcn/ui é renderizado no topo do `PatientRecordNav`.

O componente já usa `usePathname()` para detectar a aba ativa — essa mesma lógica determina os primeiros níveis do breadcrumb (Pacientes > patientName > seção). Para páginas de detalhe (ex: uma consulta específica), é passada uma prop adicional `detailLabel?: string` com o texto do último nível (ex: `"19/05/2026"` ou `"Nova consulta"`).

```ts
// props adicionais em PatientRecordNav
counts: Counts
detailLabel?: string  // label do nível mais profundo do breadcrumb
```

Os níveis do breadcrumb são montados dentro do componente:

| Página                            | Breadcrumb                                                   |
| --------------------------------- | ------------------------------------------------------------ |
| `/[patientId]`                    | Pacientes > João Silva                                       |
| `/[patientId]/consultations`      | Pacientes > João Silva > Consultas                           |
| `/[patientId]/consultations/new`  | Pacientes > João Silva > Consultas > Nova consulta           |
| `/[patientId]/consultations/[id]` | Pacientes > João Silva > Consultas > 19/05/2026              |
| `/[patientId]/prescriptions`      | Pacientes > João Silva > Prescrições                         |
| `/[patientId]/prescriptions/new`  | Pacientes > João Silva > Prescrições > Nova prescrição       |
| `/[patientId]/prescriptions/[id]` | Pacientes > João Silva > Prescrições > 19/05/2026            |
| `/[patientId]/consents`           | Pacientes > João Silva > Consentimentos                      |
| `/[patientId]/consents/new`       | Pacientes > João Silva > Consentimentos > Novo consentimento |
| `/[patientId]/consents/[id]`      | Pacientes > João Silva > Consentimentos > {template_title}   |

Cada item clicável do breadcrumb é um `<Link>`. O último item é texto simples (não clicável).

### 3. Novas páginas de listagem

Atualmente não existem páginas de listagem para as subseções do paciente. Três arquivos serão criados:

#### `/medical/[patientId]/consultations/page.tsx`

- Header: título "Consultas" + botão "Nova consulta" (com `Can permission="medical:consultation:write"`)
- Lista as consultas em ordem decrescente de data
- Cada item: data/hora da consulta, queixa principal (ou "Sem queixa registrada"), link para `/consultations/[id]`
- Dados: `timeline.consultations` de `getPatientRecord`
- Estado vazio: mensagem "Nenhuma consulta registrada" + botão para criar

#### `/medical/[patientId]/prescriptions/page.tsx`

- Header: "Prescrições" + botão "Nova prescrição" (com `Can permission="medical:prescription:write"`)
- Lista em ordem decrescente de data
- Cada item: data de emissão, quantidade de itens, link para `/prescriptions/[id]`
- Dados: `timeline.prescriptions`
- Estado vazio: mensagem + botão para criar

#### `/medical/[patientId]/consents/page.tsx`

- Header: "Consentimentos" + botão "Novo consentimento" (com `Can permission="medical:consent:accept"`)
- Lista em ordem decrescente de data
- Cada item: título do template + versão, data de aceite, link para `/consents/[id]`
- Dados: `timeline.consents`
- Estado vazio: mensagem + botão para criar

---

## Arquivos afetados

| Arquivo                                                                                         | Operação                                           |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/modules/medical-records/components/medical-module-nav.tsx`                                 | Editar — remover item "Novo paciente"              |
| `src/modules/medical-records/components/patient-record-nav.tsx`                                 | Editar — abas corretas, contadores, breadcrumb     |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/page.tsx`                  | Criar                                              |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/page.tsx`                  | Criar                                              |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/page.tsx`                       | Criar                                              |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/page.tsx`                                | Editar — passar `counts` para `PatientRecordNav`   |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/[consultationId]/page.tsx` | Editar — passar breadcrumb para `PatientRecordNav` |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/new/page.tsx`              | Editar — passar breadcrumb                         |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/[prescriptionId]/page.tsx` | Editar — passar breadcrumb                         |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/new/page.tsx`              | Editar — passar breadcrumb                         |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/[consentId]/page.tsx`           | Editar — passar breadcrumb                         |
| `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/new/page.tsx`                   | Editar — passar breadcrumb                         |
| `src/modules/medical-records/index.ts`                                                          | Editar — re-exportar novos tipos se necessário     |

---

## Sem mudanças em

- Banco de dados / migrations
- Server Actions
- Queries (reutiliza `getPatientRecord` existente)
- RLS / permissões
- Outros módulos do ERP
