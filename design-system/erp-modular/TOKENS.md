# Design Tokens — ERP Modular

Referência completa de tokens e guia para rebrandar o produto.

---

## Como rebrandar em 3 passos

1. Escolha um **preset** em `src/styles/themes/` (ou crie um novo)
2. Copie o bloco `:root { … }` e `.dark { … }` do preset
3. Substitua os blocos equivalentes em `src/app/globals.css`

Execute `npm run dev` para ver as mudanças em tempo real.

---

## Presets disponíveis

| Arquivo             | Cor primária          | Sidebar      | Raio     |
| ------------------- | --------------------- | ------------ | -------- |
| `azul.css` (padrão) | Blue-600 `#2563EB`    | Branca       | 0.5rem   |
| `esmeralda.css`     | Emerald-600 `#059669` | Branca       | 0.5rem   |
| `ardosia.css`       | Slate-700 `#334155`   | Cinza-escura | 0.375rem |

---

## Tabela de tokens

### Identidade (mude aqui para rebrandar)

| Token CSS              | Tailwind                     | Uso                        |
| ---------------------- | ---------------------------- | -------------------------- |
| `--primary`            | `bg-primary`, `text-primary` | Cor principal da marca     |
| `--primary-foreground` | `text-primary-foreground`    | Texto sobre a cor primária |
| `--ring`               | `ring` (focus)               | Anel de foco interativo    |

### Superfícies

| Token CSS              | Tailwind                  | Uso                    |
| ---------------------- | ------------------------- | ---------------------- |
| `--background`         | `bg-background`           | Fundo da página        |
| `--foreground`         | `text-foreground`         | Texto principal        |
| `--card`               | `bg-card`                 | Fundo de cards/painéis |
| `--card-foreground`    | `text-card-foreground`    | Texto em cards         |
| `--popover`            | `bg-popover`              | Dropdowns e tooltips   |
| `--popover-foreground` | `text-popover-foreground` | Texto em popovers      |

### Sidebar

| Token CSS                     | Tailwind                                       | Uso                   |
| ----------------------------- | ---------------------------------------------- | --------------------- |
| `--sidebar`                   | `bg-sidebar`                                   | Fundo do menu lateral |
| `--sidebar-foreground`        | `text-sidebar-foreground`                      | Texto do menu         |
| `--sidebar-border`            | `border-sidebar-border`                        | Bordas do menu        |
| `--sidebar-accent`            | `bg-sidebar-accent`                            | Hover dos itens       |
| `--sidebar-accent-foreground` | `text-sidebar-accent-foreground`               | Texto no hover        |
| `--sidebar-active-bg`         | `bg-sidebar-active-bg`                         | Fundo do item ativo   |
| `--sidebar-active`            | `text-sidebar-active`, `border-sidebar-active` | Cor do item ativo     |

### Secundário / Muted / Accent

| Token CSS            | Tailwind                | Uso                        |
| -------------------- | ----------------------- | -------------------------- |
| `--secondary`        | `bg-secondary`          | Ações secundárias          |
| `--muted`            | `bg-muted`              | Fundos apagados            |
| `--muted-foreground` | `text-muted-foreground` | Texto auxiliar/placeholder |
| `--accent`           | `bg-accent`             | Hover genérico             |

### Status semântico

| Token CSS             | Badge variant       | Alert variant | Cor                    |
| --------------------- | ------------------- | ------------- | ---------------------- |
| `--destructive`       | `destructive`       | `destructive` | Erros / exclusões      |
| `--destructive-muted` | `destructive-muted` | —             | Fundo suave de erro    |
| `--success`           | `success`           | `success`     | Sucesso / confirmação  |
| `--success-muted`     | `success-muted`     | —             | Fundo suave de sucesso |
| `--warning`           | `warning`           | `warning`     | Alertas / atenção      |
| `--warning-muted`     | `warning-muted`     | —             | Fundo suave de alerta  |
| `--info`              | `info`              | `info`        | Informações neutras    |
| `--info-muted`        | `info-muted`        | —             | Fundo suave de info    |

**Uso correto:**

```tsx
// ✅ Semântico — segue o tema
<Badge variant="success">Ativo</Badge>
<Badge variant="warning-muted">Pendente</Badge>
<Alert variant="info">…</Alert>

// ❌ Hardcoded — não segue o tema
<span className="text-green-600">Ativo</span>
```

### Gráficos (chart palette)

| Token CSS   | Tailwind     | Posição     |
| ----------- | ------------ | ----------- |
| `--chart-1` | `bg-chart-1` | Primária    |
| `--chart-2` | `bg-chart-2` | Secundária  |
| `--chart-3` | `bg-chart-3` | Terciária   |
| `--chart-4` | `bg-chart-4` | Quaternária |
| `--chart-5` | `bg-chart-5` | Quinária    |

**Em bibliotecas de gráficos (Recharts, etc.):**

```tsx
import { tokens } from "@/core/design";

<Bar fill={tokens.colors.chart[0]} />
<Line stroke={tokens.colors.chart[1]} />
```

### Formulários e Forma

| Token CSS  | Tailwind                                   | Uso                 |
| ---------- | ------------------------------------------ | ------------------- |
| `--border` | `border-border`                            | Bordas de elementos |
| `--input`  | `border-input`                             | Bordas de inputs    |
| `--radius` | `rounded-lg` / `rounded-md` / `rounded-sm` | Raio global         |

---

## Acesso programático em TypeScript

```ts
import { tokens, resolveToken } from "@/core/design";

// Valores CSS var-based (funciona no DOM)
tokens.colors.primary; // "hsl(var(--primary))"
tokens.colors.chart[0]; // "hsl(var(--chart-1))"

// Valor resolvido em runtime (client-side)
const primaryHsl = resolveToken("--primary"); // "221.2 83.2% 47%"
```

---

## Criando um novo preset

1. Duplique `src/styles/themes/azul.css`
2. Renomeie e edite os valores em `IDENTIDADE` (no mínimo `--primary` e `--ring`)
3. Ajuste `--sidebar-active-bg` e `--sidebar-active` para derivados da nova primária
4. Verifique contraste WCAG AA: `--primary` sobre branco deve ser ≥ 4.5:1
5. Documente aqui na tabela de presets

---

## Verificação de contraste

Ferramentas recomendadas:

- [Coolors Contrast Checker](https://coolors.co/contrast-checker)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

Regras mínimas:

- `--primary` sobre `--primary-foreground` (branco): **≥ 4.5:1** (WCAG AA)
- `--success/warning/info` sobre foreground branco: **≥ 4.5:1**
- `--foreground` sobre `--background`: **≥ 7:1** ideal, **≥ 4.5:1** mínimo
