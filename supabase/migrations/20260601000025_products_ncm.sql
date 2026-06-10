-- Adiciona o campo NCM (Nomenclatura Comum do Mercosul) aos produtos.
-- Classificação fiscal obrigatória, formato XXXX.XX.XX (8 dígitos).
-- Como a tabela já existe e ncm é NOT NULL, a coluna é adicionada em 3 passos
-- para não quebrar linhas pré-existentes.

-- 1. Coluna nullable
alter table public.products
  add column ncm text;

-- 2. Backfill com placeholder sentinela (NCM inválido proposital).
--    Sinaliza produtos antigos que precisam de correção manual/integração.
update public.products
  set ncm = '0000.00.00'
  where ncm is null;

-- 3. Torna obrigatório
alter table public.products
  alter column ncm set not null;

-- Garante o formato XXXX.XX.XX na camada do banco (defesa em profundidade,
-- além da validação Zod). O placeholder 0000.00.00 satisfaz o check.
alter table public.products
  add constraint products_ncm_format_chk
  check (ncm ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$');
