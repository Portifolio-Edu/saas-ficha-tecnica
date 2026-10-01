-- RÓTULO PARA VAREJO (2026-09-26): dados estruturados do rótulo de
-- supermercado (RDC 429/2020, IN 75/2020, RDC 26/2015, Lei 10.674/2003,
-- RDC 136/2017). Antes eram textos livres (alergenos, gluten, lactose), sem
-- como o sistema conferir se o rótulo estava completo e coerente.
--
--  - alergenicos: {"trigo":"derivados","leite":"pode_conter",...}
--      null = ainda não revisado; {} = revisado, sem alergênico.
--  - gluten_status: contem | nao_contem  (obrigatório em todo alimento)
--  - lactose_status: contem | zero | baixo | nao_se_aplica
--  - medida_caseira: "1 fatia", "2 colheres de sopa"...
--  - modo_preparo: preparo/aquecimento pro consumidor final.
-- As colunas de texto antigas ficam (histórico); o glúten é aproveitado.
-- Quem mexe: a policy rotulagem_gestao que já existe (dono e gestor).
-- Reverter: supabase/reverter/20260928160000_rotulo_varejo.sql

alter table rotulagem
  add column alergenicos jsonb check (alergenicos is null or jsonb_typeof(alergenicos) = 'object'),
  add column gluten_status text check (gluten_status in ('contem', 'nao_contem')),
  add column lactose_status text check (lactose_status in ('contem', 'zero', 'baixo', 'nao_se_aplica')),
  add column medida_caseira text check (medida_caseira is null or char_length(medida_caseira) <= 60),
  add column modo_preparo text check (modo_preparo is null or char_length(modo_preparo) <= 600);

-- Só aceita os alergênicos da RDC 26/2015 e as três presenças.
create or replace function interno.alergenicos_validos(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p is null or not exists (
    select 1 from jsonb_each_text(p) e
    where e.key not in ('trigo','centeio','cevada','aveia','leite','ovos','soja','amendoim','peixes','crustaceos',
                        'amendoa','avela','castanha-caju','castanha-para','macadamia','nozes','peca','pistache','pinoli','castanhas','latex')
       or e.value not in ('contem','derivados','pode_conter')
  )
$$;
alter table rotulagem add constraint rotulagem_alergenicos_validos check (interno.alergenicos_validos(alergenicos));

-- Aproveita o que já estava escrito sobre glúten.
update rotulagem set gluten_status = case
  when gluten ~* 'n[ãa]o\s+cont[ée]m' then 'nao_contem'
  when gluten ~* 'cont[ée]m' then 'contem'
end
where gluten is not null and gluten_status is null;
