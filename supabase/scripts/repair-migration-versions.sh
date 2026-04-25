#!/usr/bin/env bash
# Repara o tracking de versões no banco remoto após o rename das migrations.
# Executar UMA VEZ após o merge, com o projeto linkado (supabase link já feito):
#   bash supabase/scripts/repair-migration-versions.sh

set -euo pipefail

OLD_VERSIONS=(20260420 20260422 20260423 20260425)
NEW_VERSIONS=(
  20260420000000 20260420000001 20260420000002 20260420000003
  20260420000004 20260420000005 20260420000006 20260420000007
  20260420000008 20260422000009 20260423000010 20260423000011
  20260423000012 20260423000013 20260423000014 20260423000015
  20260423000016 20260425000017
)

echo "Revertendo versões antigas no remoto..."
for v in "${OLD_VERSIONS[@]}"; do
  supabase migration repair --status reverted "$v" || true
done

echo "Marcando versões novas como aplicadas no remoto..."
for v in "${NEW_VERSIONS[@]}"; do
  supabase migration repair --status applied "$v"
done

echo "Repair concluído. Verifique com: supabase migration list"
