-- CELULAR (2026-09-26): link só de consulta pro pessoal da cozinha.
--
-- O gestor gera um link por pessoa e manda no WhatsApp. No celular dela, sem
-- login, abre a própria escala, as fichas (sem custo) e os checklists do dia.
-- Não registra nada. O gestor desliga o link quando quiser; gerar um novo
-- desliga o anterior; pessoa desligada (ou inativa) perde o acesso sozinha.
--
--  1. links_consulta: guarda só o HASH do código do link (sha256). Dono e
--     gestor criam, veem e desligam; ninguém mais lê. Um link ativo por pessoa.
--  2. dados_cozinha() e escala_publica() passam a chamar funções internas por
--     restaurante (interno.dados_cozinha_de / interno.escala_publica_de) — o
--     resultado pro tablet não muda; o link reaproveita o mesmo recorte.
--  3. consulta_por_link(código, início, fim): só o servidor chama (service
--     role). Confere o código e devolve o recorte da cozinha daquela casa.
--     O servidor calcula a escala e manda pro celular só a da pessoa.
--
-- Onde mexer: o que o link mostra = o que consulta_por_link devolve.
-- Reverter: supabase/reverter/20260928140000_link_consulta.sql

-- ---------------------------------------------------------------------------
-- 1. Links
create table links_consulta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  funcionario_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  revogado_em timestamptz,
  ultimo_acesso_em timestamptz,
  -- Mesma casa: a pessoa tem que ser deste restaurante.
  foreign key (funcionario_id, cliente_id) references funcionarios (id, cliente_id) on delete cascade
);
create unique index links_consulta_um_ativo on links_consulta (funcionario_id) where revogado_em is null;
create index links_consulta_cliente on links_consulta (cliente_id);

alter table links_consulta enable row level security;
create policy links_consulta_leitura on links_consulta for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());
create policy links_consulta_criar on links_consulta for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());
create policy links_consulta_desligar on links_consulta for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_gestao())
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());

revoke all on links_consulta from anon, authenticated;
grant select (id, cliente_id, funcionario_id, criado_em, criado_por, revogado_em, ultimo_acesso_em) on links_consulta to authenticated;
grant insert (cliente_id, funcionario_id, token_hash) on links_consulta to authenticated;
grant update (revogado_em) on links_consulta to authenticated;

create trigger links_consulta_criado_por before insert or update on links_consulta
  for each row execute function interno.carimbar_criado_por();

-- Desligar é pra sempre e a hora é a do banco: não dá pra religar nem
-- mexer na data.
create or replace function interno.links_consulta_so_desligar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.revogado_em is not null then
    raise exception 'Este link já foi desligado. Gere um novo.' using errcode = '42501';
  end if;
  if new.revogado_em is not null then
    new.revogado_em := now();
  end if;
  return new;
end;
$$;
create trigger links_consulta_so_desligar before update of revogado_em on links_consulta
  for each row execute function interno.links_consulta_so_desligar();
revoke execute on function interno.links_consulta_so_desligar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Recortes da cozinha por restaurante (sem R$, sem saldo, sem motivo de
-- ausência). Invoker de propósito: só rodam dentro das funções definer abaixo.
create or replace function interno.dados_cozinha_de(v_cliente uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'receitas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'nome_prato', r.nome_prato,
        'tipo', r.tipo,
        'categoria', r.categoria,
        'rendimento', r.rendimento,
        'unidade_rendimento', r.unidade_rendimento,
        'peso_porcao_g', r.peso_porcao_g,
        'modo_preparo', r.modo_preparo,
        'foto_url', r.foto_url,
        'ficha', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ri.id, 'insumo_id', ri.insumo_id, 'sub_receita_id', ri.sub_receita_id,
            'peso_liquido', ri.peso_liquido, 'unidade', ri.unidade))
          from receita_insumos ri where ri.receita_id = r.id), '[]'::jsonb),
        'etapas', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id, 'ordem', e.ordem, 'titulo', e.titulo, 'texto', e.texto, 'foto_url', e.foto_url) order by e.ordem)
          from receita_etapas e where e.receita_id = r.id), '[]'::jsonb)
      ) order by r.nome_prato)
      from receitas r where r.cliente_id = v_cliente), '[]'::jsonb),
    'insumos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nome', i.nome, 'categoria', i.categoria, 'unidade_medida', i.unidade_medida,
        'fator_correcao', i.fator_correcao, 'peso_por_unidade', i.peso_por_unidade,
        'local_armazenamento_id', i.local_armazenamento_id,
        'tem_estoque', exists (select 1 from estoque e where e.insumo_id = i.id)
      ) order by i.nome)
      from insumos i where i.cliente_id = v_cliente), '[]'::jsonb),
    'processamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'insumo_id', p.insumo_id, 'peso_bruto_recebido', p.peso_bruto_recebido,
        'peso_liquido_resultante', p.peso_liquido_resultante, 'processado_em', p.processado_em))
      from processamentos_proteina p join insumos i on i.id = p.insumo_id
      where i.cliente_id = v_cliente), '[]'::jsonb)
  )
$$;

create or replace function interno.escala_publica_de(v_cliente uuid, p_inicio date, p_fim date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 62 then
    raise exception 'Período inválido';
  end if;

  return jsonb_build_object(
    'intervalo_domingo_semanas', coalesce((select r.intervalo_domingo_semanas from escalas_regras r where r.cliente_id = v_cliente), 3),
    'funcionarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'setor', f.setor, 'cargo', f.cargo,
        'admitido_em', f.admitido_em, 'desligado_em', f.desligado_em,
        'tipo', c.tipo, 'ancora', c.ancora, 'folgas_preferidas', c.folgas_preferidas,
        'intervalo_domingo_semanas', c.intervalo_domingo_semanas,
        'turno_inicio', c.turno_inicio, 'turno_fim', c.turno_fim
      ) order by f.nome)
      from funcionarios f
      join escalas_config c on c.funcionario_id = f.id
      where f.cliente_id = v_cliente
        and f.setor is not null and f.cargo is not null and f.admitido_em is not null
        and f.admitido_em <= p_fim
        and (f.desligado_em is null or f.desligado_em >= p_inicio - 14)
    ), '[]'::jsonb),
    -- Sem motivo: falta e atestado viram "ausencia" (só conta em dia de
    -- trabalho); afastamento vira "ausencia_prolongada" (vale no período
    -- todo, folga inclusive). Restrição só vai quando muda a escala
    -- (sem_escala_longa), e sem dizer qual é o motivo.
    'ausencias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'funcionario_id', o.funcionario_id,
        'tipo', case o.tipo
          when 'ferias' then 'ferias'
          when 'restricao' then 'restricao'
          when 'afastamento' then 'ausencia_prolongada'
          else 'ausencia'
        end,
        'inicio', o.inicio, 'fim', o.fim
      ) order by o.inicio, o.id)
      from prontuario_ocorrencias o
      where o.cliente_id = v_cliente
        and o.fim >= p_inicio - 14 and o.inicio <= p_fim
        and (o.tipo <> 'restricao' or 'sem_escala_longa' = any (o.restricoes))
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function interno.dados_cozinha_de(uuid) from public, anon, authenticated;
revoke execute on function interno.escala_publica_de(uuid, date, date) from public, anon, authenticated;

-- O tablet continua chamando as mesmas funções, com o mesmo resultado.
create or replace function public.dados_cozinha()
returns jsonb
language plpgsql
security definer
set search_path = public, interno
stable
as $$
declare
  v_cliente uuid := interno.auth_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Sem acesso';
  end if;
  return interno.dados_cozinha_de(v_cliente);
end;
$$;

create or replace function public.escala_publica(p_inicio date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public, interno
stable
as $$
declare
  v_cliente uuid := interno.auth_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Sem acesso';
  end if;
  return interno.escala_publica_de(v_cliente, p_inicio, p_fim);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. O que o link mostra. Código errado, desligado, pessoa inativa ou
-- desligada: devolve null (a página diz "link desligado", sem dar pista).
create or replace function public.consulta_por_link(p_codigo text, p_inicio date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public, interno
as $$
declare
  v_link links_consulta;
  v_pessoa funcionarios;
  v_inicio_dia timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
begin
  if p_codigo is null or length(p_codigo) < 32 or length(p_codigo) > 128 then
    return null;
  end if;

  select * into v_link from links_consulta
  where token_hash = encode(sha256(convert_to(p_codigo, 'UTF8')), 'hex') and revogado_em is null;
  if not found then
    return null;
  end if;

  select * into v_pessoa from funcionarios where id = v_link.funcionario_id;
  if not found or not v_pessoa.ativo or (v_pessoa.desligado_em is not null and v_pessoa.desligado_em < (now() at time zone 'America/Sao_Paulo')::date) then
    return null;
  end if;

  -- Último acesso, pro gestor saber se a pessoa abriu (sem gravar a cada toque).
  update links_consulta set ultimo_acesso_em = now()
  where id = v_link.id and (ultimo_acesso_em is null or ultimo_acesso_em < now() - interval '10 minutes');

  return jsonb_build_object(
    'restaurante', (select c.nome_restaurante from clientes c where c.id = v_link.cliente_id),
    'pessoa', jsonb_build_object('id', v_pessoa.id, 'nome', v_pessoa.nome, 'setor', v_pessoa.setor, 'cargo', v_pessoa.cargo),
    'cozinha', interno.dados_cozinha_de(v_link.cliente_id),
    'escala', interno.escala_publica_de(v_link.cliente_id, p_inicio, p_fim),
    'checklists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nome', c.nome, 'momento', c.momento,
        'itens', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id, 'texto', i.texto, 'ordem', i.ordem, 'area_id', i.area_id,
            'concluido_hoje', exists (
              select 1 from checklist_execucoes e where e.checklist_item_id = i.id and e.concluido_em >= v_inicio_dia)
          ) order by i.ordem)
          from checklist_itens i where i.checklist_id = c.id), '[]'::jsonb),
        'areas', coalesce((
          select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'ordem', a.ordem) order by a.ordem)
          from checklist_areas a where a.checklist_id = c.id), '[]'::jsonb),
        'fotos', coalesce((
          select jsonb_agg(jsonb_build_object('id', f.id, 'url', f.url, 'legenda', f.legenda, 'ordem', f.ordem, 'area_id', f.area_id) order by f.ordem)
          from checklist_fotos f where f.checklist_id = c.id), '[]'::jsonb)
      ) order by c.nome)
      from checklists c where c.cliente_id = v_link.cliente_id), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.consulta_por_link(text, date, date) from public, anon, authenticated;
grant execute on function public.consulta_por_link(text, date, date) to service_role;
