# Spec: Ciclo de solicitação de aluguel de espaços

**Data:** 2026-06-11
**Status:** aprovado pelo usuário (conversa de design — abordagem A)
**Módulo:** `spaces` (`src/modules/spaces`, rotas `/{companySlug}/spaces`)

## Objetivo

Hoje o aluguel de espaço é registrado direto como `confirmed` por quem tem `spaces:rental:create` (fluxo de balcão). Este spec adiciona o **ciclo de solicitação self-service**:

1. Uma pessoa com a nova role **`espacos-solicitante`** vê o calendário e solicita **uma ou mais datas/horários** para si.
2. A solicitação entra como **`pending`** e **trava o slot** (ninguém mais consegue solicitar/reservar o mesmo período).
3. O **gestor aprova ou recusa item a item** (`pending → confirmed` / `pending → rejected`).
4. O gestor continua podendo **cancelar reservas confirmadas** (já existe via `spaces:rental:cancel`; garantir visibilidade na UI).

## Decisões de design

### D1. Modelagem — tudo em `space_rentals` (abordagem A)

- Enum `rental_status` ganha os valores **`pending`** e **`rejected`** (ficam: `pending`, `confirmed`, `rejected`, `cancelled`).
- Nova coluna **`request_batch_id uuid`** em `space_rentals` (null em reservas diretas do gestor). Cada slot solicitado é uma linha própria; o batch agrupa o "pacote" para exibição e aprovação em contexto.
- O exclusion constraint `space_rentals_no_overlap` passa a valer para **`status in ('confirmed', 'pending')`** — o travamento do slot é garantido no banco, à prova de corrida (`23P01` na violação).
- Pendência com `ends_at` no passado não bloqueia nada (o range já passou); a UI a exibe como "expirada" (estado **derivado**, sem job de expiração nem novo valor de enum).

### D2. Permissões e roles

- Novas permissões no catálogo: **`spaces:rental:request`** (solicitar para si) e **`spaces:rental:approve`** (aprovar/recusar).
- Nova role **`espacos-solicitante`** (template global + instâncias nas empresas com módulo spaces ativo, filha de `admin` na hierarquia): `spaces:space:read`, `spaces:rental:read`, `spaces:rental:request`.
- `espacos-gestao` (role e template) ganha `spaces:rental:approve`. `admin` ganha as duas novas (recebe todas do catálogo).
- Migration segue o padrão do CLAUDE.md: permissões inseridas + atribuídas por `r.code`/template + idempotente (CI com banco fresco: joins viram no-op onde não há empresa/role).

### D3. RLS (`space_rentals`)

- **INSERT** — caminho novo além do atual: `has_permission(company_id, 'spaces:rental:request') and renter_user_id = auth.uid() and status = 'pending'` (solicitante só cria pendência para si). O caminho existente (`spaces:rental:create`) continua criando direto `confirmed`.
- **UPDATE** — adiciona `or has_permission(company_id, 'spaces:rental:approve')` ao using/with check existentes (gestor decide; locatário continua podendo cancelar/retirar a própria solicitação pelo caminho `renter_user_id = auth.uid()`).

### D4. Actions e queries (módulo `spaces`)

- **`request-rental`** (nova action): recebe `spaceId`, `bookingKind` e N slots (`starts_at`/`ends_at`); valida com o service (UX pré-check de conflito contra `confirmed` + `pending`); insere N linhas `pending` com o mesmo `request_batch_id` (`renter_user_id = usuário logado`, `price` herdado de `spaces.default_price`). Conflito no insert (23P01) → mensagem clara indicando o slot conflitado.
- **`decide-rental`** (nova action): aprova ou recusa UM item pendente (`pending → confirmed` | `pending → rejected`), exige `spaces:rental:approve`; aprovação que conflitar (corrida) retorna o erro de sobreposição traduzido.
- **`cancel-rental`** existente: intocada (gestor com `spaces:rental:cancel` OU locatário; cancela `confirmed` e também serve para o solicitante retirar a própria `pending`).
- **`list-pending-requests`** (nova query): pendências da empresa agrupadas por `request_batch_id` (com solicitante, espaço e slots), para a tela do gestor.
- `get-occupancy`/calendário passam a distinguir `pending` de `confirmed` no retorno.

### D5. UI

- **Calendário (`/spaces/calendar`)**: para quem tem `spaces:rental:request`, seleção de um ou mais slots livres → painel "Solicitar reserva" (espaço, datas/horários, observação) → envia. Slots `pending` aparecem com visual distinto (ex.: tom âmbar/hachurado); `confirmed` como hoje.
- **Solicitações do gestor**: nova rota `/{companySlug}/spaces/requests` (link na página de espaços, visível para quem tem `spaces:rental:approve`) listando os pacotes pendentes; aprovar/recusar **por item**, com contexto do batch (quem pediu, quais outros slots do mesmo pedido).
- **Cancelamento**: garantir que o botão Cancelar (já existente em `rental-table`/`cancel-rental-button`) aparece para quem tem `spaces:rental:cancel` nas reservas confirmadas.
- Sem notificações nesta fase (YAGNI) — o gestor acompanha pela aba de solicitações.

### D6. Testes

- **vitest (service)**: validação de slots do request (períodos válidos, sem sobreposição interna entre os próprios slots pedidos, conflito contra existentes pending/confirmed).
- **pgTAP (RLS/constraint)**: solicitante cria `pending` para si ✓; não cria para outro usuário ✗; não cria direto `confirmed` ✗; segunda solicitação no mesmo slot falha (trava) ✓; gestor com `approve` confirma ✓; `espacos-leitura` não consegue solicitar ✗.

## Fora de escopo

- Notificações (e-mail/in-app) de aprovação/recusa.
- Recorrência automática ("toda terça") — a pessoa seleciona as datas manualmente no calendário.
- Pagamento/cobrança das reservas.
- Edição de reserva confirmada (remarcar = cancelar + nova solicitação).
