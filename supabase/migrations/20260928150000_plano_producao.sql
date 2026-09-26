-- LISTA DE PRODUÇÃO (2026-09-26): o que a cozinha deve produzir no dia.
--
-- Pedido do dono: embaixo do quadro de Produção do tablet, uma lista do que
-- tem que ser produzido. Quem monta: gestão (dono/gestor, no painel ou no
-- celular) E a cozinha (o chef adiciona no tablet). Cada item: dia, receita,
-- quanto (na unidade de rendimento da ficha) e uma observação. O "feito" não
-- é gravado aqui: o app soma o que foi produzido no dia daquela receita.
--
-- Quem mexe:
--   - gestão: cria, muda e tira qualquer item do restaurante;
--   - cozinha: cria, e muda/tira só o que o tablet criou (não apaga o que o
--     gestor pediu);
--   - estoquista: só vê.
-- Uma linha por receita por dia (pedir de novo = mudar a quantidade).
-- Reverter: supabase/reverter/20260928150000_plano_producao.sql

create table plano_producao (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  data date not null,
  receita_id uuid not null references receitas(id) on delete cascade,
  quantidade numeric not null check (quantidade > 0 and quantidade < 100000),
  observacao text check (observacao is null or char_length(observacao) <= 140),
  responsavel text check (responsavel is null or char_length(responsavel) between 1 and 80),
  criado_por uuid,
  criado_em timestamptz not null default now(),
  unique (cliente_id, data, receita_id)
);
create index plano_producao_dia on plano_producao (cliente_id, data);

alter table plano_producao enable row level security;
create policy plano_producao_leitura on plano_producao for select to authenticated
  using (cliente_id = interno.auth_cliente_id());
create policy plano_producao_criar on plano_producao for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and (interno.auth_gestao() or interno.auth_papel() = 'cozinha'));
create policy plano_producao_mudar on plano_producao for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and (interno.auth_gestao() or (interno.auth_papel() = 'cozinha' and criado_por = auth.uid())))
  with check (cliente_id = interno.auth_cliente_id());
create policy plano_producao_tirar on plano_producao for delete to authenticated
  using (cliente_id = interno.auth_cliente_id() and (interno.auth_gestao() or (interno.auth_papel() = 'cozinha' and criado_por = auth.uid())));

revoke all on plano_producao from anon, authenticated;
grant select, delete on plano_producao to authenticated;
grant insert (cliente_id, data, receita_id, quantidade, observacao, responsavel) on plano_producao to authenticated;
grant update (quantidade, observacao) on plano_producao to authenticated;

create trigger plano_producao_mesma_casa before insert or update on plano_producao
  for each row execute function interno.garantir_mesmo_restaurante('cliente_id', 'receita_id:receitas');
create trigger plano_producao_criado_por before insert or update on plano_producao
  for each row execute function interno.carimbar_criado_por();
