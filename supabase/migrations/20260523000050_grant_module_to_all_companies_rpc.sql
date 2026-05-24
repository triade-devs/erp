-- 20260523000050_grant_module_to_all_companies_rpc.sql
-- PR #C da evolução de roles: RPC reutilizável pra propagar módulos novos.
-- Substitui boilerplate manual (~30 linhas por módulo) por chamada única.
-- Contrato JSONB: { "<role_code>": ["<perm_code>", ...] | ["*"] }
--   "*" no array = todas as permissões do módulo
--
-- Exemplo de uso numa migration de módulo novo:
--   insert into modules(code, name) values ('billing', 'Faturamento');
--   insert into permissions(code, module_code, resource, action, description) values
--     ('billing:invoice:read',   'billing', 'invoice', 'read',   'Listar faturas'),
--     ('billing:invoice:create', 'billing', 'invoice', 'create', 'Criar fatura'),
--     ('billing:invoice:cancel', 'billing', 'invoice', 'cancel', 'Cancelar fatura');
--   select grant_module_to_all_companies(
--     'billing',
--     '{"owner":["*"],"manager":["billing:invoice:read","billing:invoice:create"],"operator":["billing:invoice:read"]}'::jsonb
--   );

create or replace function public.grant_module_to_all_companies(
  p_module_code text,
  p_role_to_perms jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito a platform admins' using errcode = 'P0401';
  end if;

  if p_role_to_perms is null or jsonb_typeof(p_role_to_perms) <> 'object' then
    raise exception 'p_role_to_perms precisa ser um objeto JSONB' using errcode = 'P0422';
  end if;

  if not exists (select 1 from public.modules where code = p_module_code) then
    raise exception 'Módulo % não existe', p_module_code using errcode = 'P0404';
  end if;

  -- Habilita módulo em todas as empresas (idempotente)
  insert into public.company_modules (company_id, module_code)
    select id, p_module_code from public.companies
    on conflict do nothing;

  -- Propaga permissões para roles existentes por code, filtradas pelo contrato JSONB
  insert into public.role_permissions (role_id, permission_code, is_active)
    select r.id, p.code, true
    from public.roles r
    cross join public.permissions p
    where p.module_code = p_module_code
      and r.code in (select jsonb_object_keys(p_role_to_perms))
      and (
        p_role_to_perms -> r.code ? '*'
        or p_role_to_perms -> r.code ? p.code
      )
    on conflict do nothing;
end $$;

-- Restringe execução: apenas authenticated; a função em si valida is_platform_admin
revoke all on function public.grant_module_to_all_companies(text, jsonb) from public, anon;
grant execute on function public.grant_module_to_all_companies(text, jsonb) to authenticated;

comment on function public.grant_module_to_all_companies(text, jsonb) is
  'PR #C: propaga módulo (company_modules + role_permissions) para todas as empresas. Contrato: jsonb {role_code: [perm_code,...] | ["*"]}. Idempotente via on conflict.';
