# Diretrizes para templates de geração

## Princípios

1. **pt-BR sempre.** Tudo gerado pela IA é em português brasileiro, incluindo `> TODO:` e mensagens de erro.
2. **Não invente.** Se a fonte não tem a informação, marque como `> TODO:`. Alucinação em doc técnica é veneno.
3. **Estrutura fixa.** Cada template define o frontmatter e os cabeçalhos exatos. A IA preenche o conteúdo, não a estrutura.
4. **Saída só MDX.** O cliente valida que a resposta começa com `---` (frontmatter) — qualquer texto antes/depois é descartado.
5. **Temperatura baixa (0.3).** Queremos consistência. Criatividade não é o objetivo aqui.

## Anatomia de um template

```
[Quem é a IA] + [Tarefa]
[Contexto: blocos de código com {{placeholders}}]
[Tarefa concreta: estrutura exata da saída]
[Regras: o que pode e o que não pode]
```

## Variáveis comuns

| Placeholder                                      | Substituído por                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `{{table_name}}`                                 | Nome da tabela (ex.: `stock_movements`)                          |
| `{{module_name}}`                                | Nome do módulo (ex.: `inventory`)                                |
| `{{permission_key}}`                             | Chave da permission (ex.: `inventory:product:read`)              |
| `{{migration_sql}}`                              | SQL completo da migration                                        |
| `{{later_migrations_sql}}`                       | SQL concatenado das migrations posteriores que afetaram o objeto |
| `{{rls_policies}}`                               | SQL das policies aplicáveis                                      |
| `{{triggers}}`                                   | SQL dos triggers e funções                                       |
| `{{barrel_source}}`                              | Conteúdo do `index.ts` do módulo                                 |
| `{{schema_dump}}`                                | Estado consolidado da tabela (CREATE TABLE + ALTERs aplicados)   |
| `{{previous_policies}}` / `{{current_policies}}` | Diff de policies para detector de RLS                            |
| `{{module_refs}}`                                | Lista de arquivos `.ts` que mencionam a tabela                   |
| `{{sibling_permissions}}`                        | Outras permissions do mesmo módulo                               |
| `{{module_permissions}}`                         | Permissions cujo prefixo bate com o módulo                       |
| `{{related_tables}}`                             | Tabelas inferidas como relacionadas ao módulo                    |

## O que NÃO colocar nos templates

- Pedido genérico tipo "seja completo" — IA preenche com lixo. Especifique seções.
- Aspas inglesas em volta de blocos. O parser quer cercas markdown padrão.
- Mais de uma "Tarefa". Confunde a saída.

## Como validar uma saída antes de commitar

1. Frontmatter parseável por `gray-matter`.
2. `status: draft` presente (se for rascunho — sempre é, nessa skill).
3. Se for MDX para `tabelas/`, contém `<TableSpec table="…" />`.
4. Nenhuma seção vazia (sem `## X` seguido direto de `## Y`).
5. Pelo menos um `> TODO:` se a fonte tinha lacunas.

A função `validateGenerated` em `scripts/lib/claude-client.ts` pode crescer com essas checagens conforme M4 evoluir.
