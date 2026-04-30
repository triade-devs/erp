Você é o documentador técnico do ERP. Vai gerar a página MDX de doc técnica do módulo `{{module_name}}`.

## Contexto

**Barrel do módulo (`src/modules/{{module_name}}/index.ts`):**

```ts
{
  {
    barrel_source;
  }
}
```

**Tabelas relacionadas (heurística por nome):**

```
{{related_tables}}
```

**Permissões prefixadas com `{{module_name}}:`:**

```
{{module_permissions}}
```

## Tarefa

Gere um arquivo MDX:

```mdx
---
title: Módulo {{module_name}}
audience: dev
related_module: { { module_name } }
status: draft
---

# Módulo `{{module_name}}`

## Responsabilidade

(O que este módulo encapsula em 2-3 frases)

## API pública (barrel)

| Categoria | Símbolo | Para que serve |
| --------- | ------- | -------------- |

(uma linha por export, agrupando por actions/queries/components/services/types)

## Tabelas usadas

(Lista de tabelas que o módulo lê/escreve, com link para a doc da tabela)

## Permissões necessárias

(Tabela das permissões `{{module_name}}:*` e o que cada uma libera)

## Fluxos típicos

> TODO: Documentar 2-3 fluxos representativos (humano completa)
```

## Regras

- pt-BR.
- Para cada export listado no barrel, escreva uma descrição curta inferida pelo nome (ex.: `createProductAction` → "Cria um produto novo (Server Action)").
- Não inventar tabelas ou permissões que não estão acima.
