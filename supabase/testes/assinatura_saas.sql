-- Cobrança do SaaS: não promove sandbox, só servidor grava, sem duplicação.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;
insert into auth.users (id, email) values
 ('f7111111-0000-0000-0000-000000000001','assinatura-a@exemplo.invalid'),
 ('f7222222-0000-0000-0000-000000000001','assinatura-b@exemplo.invalid');
insert into public.clientes (id,user_id,nome,nome_restaurante,telefone) values
 ('f7a00000-0000-0000-0000-000000000001','f7111111-0000-0000-0000-000000000001','A','A','5500000000171'),
 ('f7b00000-0000-0000-0000-000000000001','f7222222-0000-0000-0000-000000000001','B','B','5500000000172');
insert into public.assinaturas_saas (id,cliente_id,ambiente,valor_centavos) values
 ('f7a00000-1111-0000-0000-000000000001','f7a00000-0000-0000-0000-000000000001','sandbox',9900),
 ('f7a00000-2222-0000-0000-000000000001','f7a00000-0000-0000-0000-000000000001','producao',9900);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f7222222-0000-0000-0000-000000000001","role":"authenticated"}',true);
insert into resultado select 'B não lê assinatura de A','0',count(*)::text from public.assinaturas_saas;
select set_config('request.jwt.claims','{"sub":"f7111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
insert into resultado select 'A lê as próprias assinaturas','2',count(*)::text from public.assinaturas_saas;
do $$ begin
 begin update public.assinaturas_saas set estado='ativa'; insert into resultado values ('dono não se dá plano pago','bloqueado','falhou');
 exception when insufficient_privilege then insert into resultado values ('dono não se dá plano pago','bloqueado','bloqueado'); end;
 begin perform public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','ativa',null,'2026-10-07',null);
 insert into resultado values ('dono não chama RPC financeira','bloqueado','falhou');
 exception when insufficient_privilege then insert into resultado values ('dono não chama RPC financeira','bloqueado','bloqueado'); end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.assinaturas_saas; insert into resultado values ('anônimo sem consulta','bloqueado','falhou');
 exception when insufficient_privilege then insert into resultado values ('anônimo sem consulta','bloqueado','bloqueado'); end;
end $$;
reset role;

set local role service_role;
select public.conciliar_assinatura_saas('f7a00000-1111-0000-0000-000000000001','sub_s','cus_a','ativa',null,'2026-10-07','evt_s');
insert into resultado select 'sandbox não ativa plano real','trial trial',plano||' '||status_assinatura from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','pendente',null,'2026-10-07','evt_p0');
insert into resultado select 'criação pendente não dá plano pago','trial pendente',plano||' '||status_assinatura from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','ativa',null,'2026-10-08','evt_p1');
insert into resultado select 'pagamento conciliado ativa plano','pro ativa',plano||' '||status_assinatura from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','atrasada',null,'2026-10-09','evt_p1');
insert into resultado select 'evento repetido não regrava','ativa',estado from public.assinaturas_saas where id='f7a00000-2222-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','atrasada',null,'2026-10-06','evt_antigo');
insert into resultado select 'conciliação antiga não sobrescreve recente','ativa',estado from public.assinaturas_saas where id='f7a00000-2222-0000-0000-000000000001';
do $$ begin
 begin insert into public.assinaturas_saas(cliente_id,ambiente,valor_centavos) values ('f7a00000-0000-0000-0000-000000000001','producao',9900);
 insert into resultado values ('uma reserva por restaurante e ambiente','bloqueado','falhou');
 exception when unique_violation then insert into resultado values ('uma reserva por restaurante e ambiente','bloqueado','bloqueado'); end;
 begin perform public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_outra','cus_b','ativa',null,'2026-10-10','evt_cruzado');
 insert into resultado values ('não troca vínculo de cobrança','bloqueado','falhou');
 exception when raise_exception then insert into resultado values ('não troca vínculo de cobrança','bloqueado','bloqueado'); end;
 begin delete from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
 insert into resultado values ('não exclui conta com recorrência','bloqueado','falhou');
 exception when raise_exception then insert into resultado values ('não exclui conta com recorrência','bloqueado','bloqueado'); end;
end $$;
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','inativa',null,'2026-10-10','evt_inativa');
insert into resultado select 'suspensão não é cancelamento definitivo','inativa',estado from public.assinaturas_saas where id='f7a00000-2222-0000-0000-000000000001';
do $$ begin
 begin delete from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
 insert into resultado values ('suspensão não libera exclusão de conta','bloqueado','falhou');
 exception when raise_exception then insert into resultado values ('suspensão não libera exclusão de conta','bloqueado','bloqueado'); end;
end $$;
select public.conciliar_assinatura_saas('f7a00000-1111-0000-0000-000000000001','sub_s','cus_a','cancelada',null,'2026-10-11','evt_cs');
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','cancelada',null,'2026-10-11','evt_cp');
insert into public.assinaturas_saas(id,cliente_id,ambiente,valor_centavos,criado_em) values ('f7a00000-3333-0000-0000-000000000001','f7a00000-0000-0000-0000-000000000001','producao',9900,now()+interval '1 second');
select public.conciliar_assinatura_saas('f7a00000-3333-0000-0000-000000000001','sub_nova','cus_novo','ativa',null,'2026-10-12','evt_novo');
insert into resultado select 'permite nova assinatura depois do cancelamento','ativa',estado from public.assinaturas_saas where id='f7a00000-3333-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-2222-0000-0000-000000000001','sub_p','cus_a','cancelada',null,'2026-10-13','evt_antigo_depois');
insert into resultado select 'evento da recorrência antiga não cancela a nova','ativa',status_assinatura from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
select public.conciliar_assinatura_saas('f7a00000-3333-0000-0000-000000000001','sub_nova','cus_novo','cancelada',null,'2026-10-14','evt_cn');
delete from public.clientes where id='f7a00000-0000-0000-0000-000000000001';
insert into resultado select 'apaga cobrança local após cancelar','0',count(*)::text from public.assinaturas_saas where cliente_id='f7a00000-0000-0000-0000-000000000001';
reset role;
select teste,esperado,obtido,case when esperado=obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
