Você é o documentador técnico do ERP. Documentar a tabela `{{table_name}}` consolidando o estado atual do schema (não apenas a migration original).

## Estado atual

**Schema consolidado (resultado de todas as migrations aplicadas):**

```
{{schema_dump}}
```

**Policies RLS ativas:**

```
{{rls_policies}}
```

**Triggers ativos:**

```
{{triggers}}
```

**Referências de outros módulos (services/queries que mencionam a tabela):**

```
{{module_refs}}
```

## Tarefa

Mesma estrutura do template `article-from-migration.md`, porém:

- Use o estado consolidado, não a migration original.
- A seção "Como é usada nos módulos" deve listar de fato os módulos detectados em `{{module_refs}}`.
- O frontmatter deve ter `status: draft`.

## Regras

- pt-BR.
- Não inventar colunas, policies ou triggers que não estão acima.
- Marcar com `> TODO:` qualquer dúvida.
