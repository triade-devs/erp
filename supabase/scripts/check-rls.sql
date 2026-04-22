-- Verifica se todas as tabelas do schema public têm RLS habilitado
-- Falha com RAISE EXCEPTION se alguma tabela não tiver RLS

DO $$
DECLARE
  v_tables_sem_rls text;
BEGIN
  SELECT string_agg(tablename, ', ' ORDER BY tablename)
    INTO v_tables_sem_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;

  IF v_tables_sem_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas sem RLS habilitado: %. Habilite RLS em todas as tabelas de tenant antes de continuar.', v_tables_sem_rls;
  END IF;

  RAISE NOTICE 'check-rls: todas as tabelas têm RLS habilitado ✓';
END $$;
