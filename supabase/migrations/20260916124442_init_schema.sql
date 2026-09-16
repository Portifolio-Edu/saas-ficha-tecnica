-- Ficha Tecnica SaaS - initial schema + row level security
--
-- Multi-tenancy model: `clientes` is the tenant (the restaurant). Each tenant
-- is owned by exactly one Supabase Auth user via clientes.user_id -- the MVP
-- is single-login-per-restaurant (handoff doc, secao 8, passo 2: "Auth e
-- onboarding de restaurante"). Every policy below is written directly against
-- auth.uid(), as requested, either on clientes.user_id itself or, for every
-- other table, through the auth_cliente_id() helper that resolves the
-- caller's own cliente_id from it.
--
-- Tables reachable only through a parent (receita_insumos, estoque,
-- checklist_itens, ...) are scoped by an EXISTS join up to their nearest
-- ancestor that carries cliente_id, instead of duplicating the column on
-- every leaf table.

create extension if not exists pgcrypto;

-- =========================================================================
-- clientes
-- =========================================================================

create table clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  nome_restaurante text not null,
  telefone text not null unique,
  cnpj text,
  plano text not null default 'trial',
  status_assinatura text not null default 'trial',
  margem_alvo numeric not null default 0.65 check (margem_alvo >= 0 and margem_alvo < 1),
  criado_em timestamptz not null default now()
);

alter table clientes enable row level security;

-- Policy direto em auth.uid(): esta é a única tabela que não passa pelo
-- helper auth_cliente_id(), porque o helper consulta esta própria tabela
-- (evita recursão de RLS).
create policy clientes_self on clientes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper usado por toda política abaixo. security definer + search_path
-- travado é o padrão recomendado pela Supabase para evitar reavaliação
-- recursiva da RLS de "clientes" a cada linha checada em outra tabela.
create or replace function auth_cliente_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from clientes where user_id = auth.uid()
$$;

create table locais_armazenamento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  temperatura_min_c numeric,
  temperatura_max_c numeric
);

alter table locais_armazenamento enable row level security;

create policy locais_armazenamento_tenant on locais_armazenamento
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- =========================================================================
-- insumos e preparos
-- =========================================================================

create table insumos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  categoria text not null default 'outro'
    check (categoria in ('proteina', 'hortalica', 'fruta', 'laticinio', 'tempero', 'embalagem', 'outro')),
  unidade_medida text not null check (unidade_medida in ('kg', 'g', 'l', 'ml', 'un')),
  tamanho_embalagem numeric not null check (tamanho_embalagem > 0),
  preco_embalagem numeric not null check (preco_embalagem >= 0),
  preco_unitario numeric generated always as (preco_embalagem / nullif(tamanho_embalagem, 0)) stored,
  fator_correcao numeric not null default 1 check (fator_correcao > 0),
  peso_por_unidade numeric,  -- só quando unidade_medida = 'un'
  local_armazenamento_id uuid references locais_armazenamento(id),
  atualizado_em timestamptz not null default now()
);
-- categoria NÃO pode ser inferida do fator de correção: fruta e hortaliça também
-- têm FC > 1. A aba de proteínas filtra por categoria = 'proteina'.

create index insumos_cliente_id_idx on insumos(cliente_id);

alter table insumos enable row level security;

create policy insumos_tenant on insumos
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- Catálogo geral (não por cliente): sugere FC ao cadastrar insumo novo.
-- Leitura liberada pra qualquer usuário autenticado; escrita reservada ao
-- service role (seed/curadoria), por isso não há policy de insert/update aqui.
create table fatores_correcao_referencia (
  id uuid primary key default gen_random_uuid(),
  nome_alimento text not null,
  categoria text not null,
  fator_correcao numeric not null check (fator_correcao > 0)
);

alter table fatores_correcao_referencia enable row level security;

create policy fatores_correcao_referencia_read on fatores_correcao_referencia
  for select
  to authenticated
  using (true);

create table historico_preco_insumo (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  preco_anterior numeric not null,
  preco_novo numeric not null,
  alterado_em timestamptz not null default now()
);

create index historico_preco_insumo_insumo_id_idx on historico_preco_insumo(insumo_id);

alter table historico_preco_insumo enable row level security;

create policy historico_preco_insumo_tenant on historico_preco_insumo
  for all
  using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));

create table receitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome_prato text not null,
  categoria text,
  tipo text not null default 'prato_final' check (tipo in ('prato_final', 'preparo_base')),
  preco_venda numeric,  -- null quando preparo_base
  vendas_mes integer,
  rendimento numeric not null default 1 check (rendimento > 0),
  unidade_rendimento text not null default 'porção',
  peso_porcao_g numeric,  -- necessário pro cálculo por 100g
  forma_fisica text default 'solido' check (forma_fisica in ('solido', 'liquido')),
  margem_alvo numeric check (margem_alvo is null or (margem_alvo >= 0 and margem_alvo < 1)),  -- sobrescreve clientes.margem_alvo
  destino_venda text not null default 'proprio' check (destino_venda in ('proprio', 'varejo_terceiro')),
  modo_preparo text,
  foto_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint receitas_preco_venda_obrigatorio_prato_final check (
    tipo = 'preparo_base' or preco_venda is not null
  )
);

create index receitas_cliente_id_idx on receitas(cliente_id);

alter table receitas enable row level security;

create policy receitas_tenant on receitas
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table receita_insumos (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  insumo_id uuid references insumos(id),
  sub_receita_id uuid references receitas(id),
  peso_liquido numeric not null check (peso_liquido > 0),
  unidade text not null check (unidade in ('kg', 'g', 'l', 'ml', 'un')),
  constraint receita_insumos_um_tipo check (
    (insumo_id is not null and sub_receita_id is null) or
    (insumo_id is null and sub_receita_id is not null)
  ),
  constraint receita_insumos_nao_auto_referencia check (sub_receita_id is distinct from receita_id)
);

create index receita_insumos_receita_id_idx on receita_insumos(receita_id);
create index receita_insumos_sub_receita_id_idx on receita_insumos(sub_receita_id) where sub_receita_id is not null;

alter table receita_insumos enable row level security;

create policy receita_insumos_tenant on receita_insumos
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

create table receita_embalagens (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  insumo_id uuid not null references insumos(id)  -- insumo com categoria = 'embalagem'
);

create index receita_embalagens_receita_id_idx on receita_embalagens(receita_id);

alter table receita_embalagens enable row level security;

create policy receita_embalagens_tenant on receita_embalagens
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

create table fichas_tecnicas (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  cmv_calculado numeric not null,
  margem_calculada numeric not null,
  preco_sugerido numeric,
  pdf_url text,
  gerado_em timestamptz not null default now()
);
-- gerado_em dá o gráfico de CMV no tempo de graça, sem tabela extra

create index fichas_tecnicas_receita_id_idx on fichas_tecnicas(receita_id);

alter table fichas_tecnicas enable row level security;

create policy fichas_tecnicas_tenant on fichas_tecnicas
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

-- =========================================================================
-- canais de venda
-- =========================================================================

create table canais_venda (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome_canal text not null,
  comissao_percentual numeric not null check (comissao_percentual >= 0 and comissao_percentual < 1),
  taxa_fixa numeric,
  embala boolean not null default false,  -- balcão não embala; viagem e delivery sim
  ativo boolean not null default true
);

create index canais_venda_cliente_id_idx on canais_venda(cliente_id);

alter table canais_venda enable row level security;

create policy canais_venda_tenant on canais_venda
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table precos_canal (
  id uuid primary key default gen_random_uuid(),
  ficha_tecnica_id uuid not null references fichas_tecnicas(id) on delete cascade,
  canal_id uuid not null references canais_venda(id),
  preco_sugerido numeric not null,
  margem_liquida_canal numeric not null
);

create index precos_canal_ficha_tecnica_id_idx on precos_canal(ficha_tecnica_id);

alter table precos_canal enable row level security;

create policy precos_canal_tenant on precos_canal
  for all
  using (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id()));

-- =========================================================================
-- estoque
-- =========================================================================

create table estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade unique,
  saldo_atual numeric not null default 0,
  estoque_minimo numeric not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table estoque enable row level security;

create policy estoque_tenant on estoque
  for all
  using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida_venda', 'ajuste')),
  quantidade numeric not null check (quantidade > 0),  -- sempre positivo, o tipo decide o sinal
  origem text,
  criado_em timestamptz not null default now()
);

create index movimentacoes_estoque_insumo_id_idx on movimentacoes_estoque(insumo_id);

alter table movimentacoes_estoque enable row level security;

create policy movimentacoes_estoque_tenant on movimentacoes_estoque
  for all
  using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  empresa text not null,
  contato text,
  telefone text not null,
  email text,
  fornece text,
  dias_entrega text,
  horario_entrega text,
  prazo_urgencia text
);
-- existe pra que o contato não saia junto com o gerente que pediu demissão

create index fornecedores_cliente_id_idx on fornecedores(cliente_id);

alter table fornecedores enable row level security;

create policy fornecedores_tenant on fornecedores
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

-- =========================================================================
-- produção
-- =========================================================================

create table turnos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,  -- Manhã, Tarde, Noite
  horario text
);

create index turnos_cliente_id_idx on turnos(cliente_id);

alter table turnos enable row level security;

create policy turnos_tenant on turnos
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table producoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  lote text not null,
  receita_id uuid not null references receitas(id),
  quantidade numeric not null check (quantidade > 0),
  responsavel text not null,
  turno_id uuid references turnos(id),
  chefe_turno text,
  validade date,
  status text not null default 'em_producao' check (status in ('em_producao', 'produzido', 'perda')),
  motivo_perda text,
  criado_em timestamptz not null default now(),
  constraint producoes_motivo_perda_obrigatorio check (
    status <> 'perda' or motivo_perda is not null
  )
);
-- motivo_perda obrigatório quando status = 'perda'. O handoff pede validação
-- na aplicação; a constraint aqui é defesa em profundidade -- perda sem
-- motivo não serve pra investigar nada depois, então também barramos no banco.

create index producoes_cliente_id_idx on producoes(cliente_id);
create index producoes_receita_id_idx on producoes(receita_id);

alter table producoes enable row level security;

create policy producoes_tenant on producoes
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table processamentos_proteina (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  responsavel text not null,
  peso_bruto_recebido numeric not null check (peso_bruto_recebido > 0),
  valor_pago_kg numeric not null check (valor_pago_kg >= 0),
  peso_liquido_resultante numeric not null check (peso_liquido_resultante > 0),
  peso_aparas_reaproveitaveis numeric not null default 0 check (peso_aparas_reaproveitaveis >= 0),
  peso_descarte_puro numeric generated always as (
    peso_bruto_recebido - peso_liquido_resultante - peso_aparas_reaproveitaveis
  ) stored,
  fc_observado numeric generated always as (
    peso_bruto_recebido / nullif(peso_liquido_resultante, 0)
  ) stored,
  fornecedor text,
  observacao text,
  processado_em timestamptz not null default now(),
  constraint processamentos_proteina_reconciliacao check (
    peso_liquido_resultante + peso_aparas_reaproveitaveis <= peso_bruto_recebido
  )
);
-- peso_descarte_puro é calculado, nunca digitado. Se líquido + aparas passar
-- do bruto a conta não fecha, e a constraint acima barra o salvamento.

create index processamentos_proteina_insumo_id_idx on processamentos_proteina(insumo_id);

alter table processamentos_proteina enable row level security;

create policy processamentos_proteina_tenant on processamentos_proteina
  for all
  using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));

-- =========================================================================
-- checklists
-- =========================================================================

create table checklists (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  momento text not null check (momento in ('abertura', 'praca', 'processo', 'fechamento'))
);

create index checklists_cliente_id_idx on checklists(cliente_id);

alter table checklists enable row level security;

create policy checklists_tenant on checklists
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table checklist_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  texto text not null,
  ordem integer not null default 0
);

create index checklist_itens_checklist_id_idx on checklist_itens(checklist_id);

alter table checklist_itens enable row level security;

create policy checklist_itens_tenant on checklist_itens
  for all
  using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));

create table checklist_execucoes (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references checklist_itens(id) on delete cascade,
  turno_id uuid references turnos(id),
  chefe_turno text,
  responsavel text,
  concluido_em timestamptz not null default now()
);
-- os modelos entregues são ponto de partida: cada casa edita, remove e cria o seu

create index checklist_execucoes_item_id_idx on checklist_execucoes(checklist_item_id);

alter table checklist_execucoes enable row level security;

create policy checklist_execucoes_tenant on checklist_execucoes
  for all
  using (exists (
    select 1 from checklist_itens ci
    join checklists c on c.id = ci.checklist_id
    where ci.id = checklist_item_id and c.cliente_id = auth_cliente_id()
  ))
  with check (exists (
    select 1 from checklist_itens ci
    join checklists c on c.id = ci.checklist_id
    where ci.id = checklist_item_id and c.cliente_id = auth_cliente_id()
  ));

-- =========================================================================
-- nutricional e segurança alimentar
-- =========================================================================

create table valores_nutricionais_insumo (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete cascade unique,
  base_gramas numeric not null default 100 check (base_gramas > 0),
  calorias_kcal numeric,
  carboidratos_g numeric,
  acucares_totais_g numeric,
  acucares_adicionados_g numeric,  -- campo separado dos totais, a norma exige os dois
  proteinas_g numeric,
  gorduras_totais_g numeric,
  gorduras_saturadas_g numeric,
  gorduras_trans_g numeric,
  fibra_alimentar_g numeric,
  sodio_mg numeric
);

alter table valores_nutricionais_insumo enable row level security;

create policy valores_nutricionais_insumo_tenant on valores_nutricionais_insumo
  for all
  using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));

create table nutricional_override (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade unique,
  origem text not null default 'laudo',
  calorias_kcal numeric, carboidratos_g numeric, acucares_totais_g numeric,
  acucares_adicionados_g numeric, proteinas_g numeric, gorduras_totais_g numeric,
  gorduras_saturadas_g numeric, gorduras_trans_g numeric, fibra_alimentar_g numeric,
  sodio_mg numeric,
  informado_em timestamptz not null default now()
);
-- quando existe laudo laboratorial, ele prevalece sobre o cálculo por composição

alter table nutricional_override enable row level security;

create policy nutricional_override_tenant on nutricional_override
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

create table rotulagem (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade unique,
  ingredientes text, alergenos text, gluten text, lactose text,
  fabricante text, endereco text, peso_liquido text, conservacao text
);
-- todos opcionais: só fazem falta pra quem vende em varejo de terceiro

alter table rotulagem enable row level security;

create policy rotulagem_tenant on rotulagem
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

create table registros_temperatura (
  id uuid primary key default gen_random_uuid(),
  local_armazenamento_id uuid not null references locais_armazenamento(id) on delete cascade,
  temperatura_c numeric not null,
  responsavel text not null,
  registrado_em timestamptz not null default now()
);
-- "dentro da faixa" NÃO é campo salvo, é calculado na leitura contra o local,
-- senão dessincroniza quando a faixa esperada muda

create index registros_temperatura_local_id_idx on registros_temperatura(local_armazenamento_id);

alter table registros_temperatura enable row level security;

create policy registros_temperatura_tenant on registros_temperatura
  for all
  using (exists (
    select 1 from locais_armazenamento l
    where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()
  ))
  with check (exists (
    select 1 from locais_armazenamento l
    where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()
  ));

-- =========================================================================
-- fechamento de CMV
-- =========================================================================

create table fechamentos_cmv (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim date not null,
  estoque_inicial numeric not null,
  compras numeric not null,
  estoque_final numeric not null,
  faturamento numeric not null,
  fechado_em timestamptz not null default now(),
  constraint fechamentos_cmv_periodo_valido check (periodo_fim >= periodo_inicio)
);

create index fechamentos_cmv_cliente_id_idx on fechamentos_cmv(cliente_id);

alter table fechamentos_cmv enable row level security;

create policy fechamentos_cmv_tenant on fechamentos_cmv
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());

create table vendas_periodo (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references fechamentos_cmv(id) on delete cascade,
  receita_id uuid not null references receitas(id),
  quantidade integer not null check (quantidade >= 0)
);
-- alimentado por importação (CSV do iFood ou do PDV) ou entrada manual

create index vendas_periodo_fechamento_id_idx on vendas_periodo(fechamento_id);

alter table vendas_periodo enable row level security;

create policy vendas_periodo_tenant on vendas_periodo
  for all
  using (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id()));

create table event_log (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text not null check (tipo in ('margem_baixa', 'estoque_minimo', 'temperatura_fora', 'fc_pior')),
  payload jsonb not null,
  processado_em timestamptz
);
-- fila de eventos drenada por cron, não trigger de banco chamando webhook
-- direto -- dá reprocessamento e histórico auditável.

create index event_log_cliente_id_idx on event_log(cliente_id);
create index event_log_pendentes_idx on event_log(cliente_id) where processado_em is null;

alter table event_log enable row level security;

create policy event_log_tenant on event_log
  for all
  using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());
