begin;
create temp table resultado(teste text,esperado text,obtido text) on commit drop;
create temp table contas(numero integer,id uuid,assinatura uuid) on commit drop;
grant all on resultado,contas to service_role,authenticated,anon;
do $$ declare i integer; u uuid; c uuid; begin
  for i in 1..12 loop
    u:=gen_random_uuid(); c:=gen_random_uuid();
    insert into auth.users(id,email) values(u,'oferta-'||i||'@exemplo.invalid');
    insert into public.clientes(id,user_id,nome,nome_restaurante,telefone) values(c,u,'Oferta','Oferta','55000000009'||lpad(i::text,2,'0'));
    insert into contas values(i,c,null);
  end loop;
end $$;
insert into resultado select 'teste dura sete dias','true',bool_and(termina_em-inicia_em=interval '7 days')::text from public.testes_saas where cliente_id in(select id from contas);
insert into resultado select 'vencimento após término, em Brasília','true',bool_and(o.primeiro_vencimento>(o.teste_termina_em at time zone 'America/Sao_Paulo')::date)::text from contas c cross join lateral public.consultar_oferta_saas(c.id,'producao') o;
set local role authenticated;
do $$ begin
  begin perform public.reservar_assinatura_saas((select id from contas limit 1),'producao',19700); insert into resultado values('dono não reserva vaga pelo banco','bloqueado','falhou');
  exception when insufficient_privilege then insert into resultado values('dono não reserva vaga pelo banco','bloqueado','bloqueado'); end;
  begin update public.testes_saas set termina_em=now()+interval '1 year'; insert into resultado values('dono não prolonga teste','bloqueado','falhou');
  exception when insufficient_privilege then insert into resultado values('dono não prolonga teste','bloqueado','bloqueado'); end;
  begin perform * from public.vagas_fundadores_saas; insert into resultado values('dono não consulta outras vagas','bloqueado','falhou');
  exception when insufficient_privilege then insert into resultado values('dono não consulta outras vagas','bloqueado','bloqueado'); end;
end $$;
reset role;
set local role service_role;
do $$ declare c record; a public.assinaturas_saas; begin
  for c in select * from contas where numero<=10 order by numero loop
    a:=public.reservar_assinatura_saas(c.id,'producao',19700);
    update contas set assinatura=a.id where id=c.id;
  end loop;
end $$;
insert into resultado select 'dez reservas sem vaga repetida','10',count(*)::text from public.vagas_fundadores_saas where ambiente='producao';
insert into resultado select 'cadastro e reserva não confirmam fundador','0',count(*)::text from public.vagas_fundadores_saas where ambiente='producao' and confirmado_em is not null;
insert into resultado select 'décimo primeiro recebe preço normal','29700',valor_centavos::text from public.consultar_oferta_saas((select id from contas where numero=11),'producao');
do $$ begin
  begin perform public.reservar_assinatura_saas((select id from contas where numero=11),'producao',19700); insert into resultado values('oferta antiga não gera cobrança maior','bloqueado','falhou');
  exception when raise_exception then insert into resultado values('oferta antiga não gera cobrança maior','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'perda da oferta não grava assinatura','0',count(*)::text from public.assinaturas_saas where cliente_id=(select id from contas where numero=11);
select public.conciliar_oferta_saas((select assinatura from contas where numero=1),'sub_oferta_1','cus_oferta_1','pendente',null,now(),'evt_oferta_1',true);
insert into resultado select 'pagamento antecipado confirma condição, não ciclo atual','true pendente',fundador_confirmado::text||' '||estado from public.assinaturas_saas where id=(select assinatura from contas where numero=1);
select public.conciliar_oferta_saas((select assinatura from contas where numero=1),'sub_oferta_1','cus_oferta_1','cancelada',null,now(),'evt_oferta_c1',true);
insert into resultado select 'vaga paga não é revendida no cancelamento','10',count(*)::text from public.vagas_fundadores_saas where ambiente='producao';
select public.conciliar_oferta_saas((select assinatura from contas where numero=2),'sub_oferta_2','cus_oferta_2','cancelada',null,now(),'evt_oferta_c2',false);
insert into resultado select 'reserva cancelada sem pagamento libera vaga','9',count(*)::text from public.vagas_fundadores_saas where ambiente='producao';
insert into resultado select 'reassinar após cancelar perde benefício','29700',valor_centavos::text from public.consultar_oferta_saas((select id from contas where numero=1),'producao');
insert into resultado select 'sandbox tem vagas independentes','10',vagas_disponiveis::text from public.consultar_oferta_saas((select id from contas where numero=1),'sandbox');
select public.reservar_assinatura_saas((select id from contas where numero=1),'producao',29700);
insert into resultado select 'novo contrato não herda desconto','29700',valor_centavos::text from public.assinaturas_saas where cliente_id=(select id from contas where numero=1) and estado<>'cancelada';
select public.conciliar_oferta_saas((select id from public.assinaturas_saas where cliente_id=(select id from contas where numero=1) and estado<>'cancelada'),'sub_oferta_re','cus_oferta_re','cancelada',null,now(),'evt_oferta_re',false);
delete from public.clientes where id=(select id from contas where numero=1);
insert into resultado select 'exclusão preserva contagem anônima de fundador pago','9',count(*)::text from public.vagas_fundadores_saas where ambiente='producao';
insert into resultado select 'exclusão remove dados do teste','0',count(*)::text from public.testes_saas where cliente_id=(select id from contas where numero=1);
reset role;
select teste,case when esperado=obtido then 'OK' else 'FALHOU: esperado '||esperado||', obtido '||coalesce(obtido,'NULL') end status from resultado;
do $$ begin if exists(select 1 from resultado where esperado is distinct from obtido) then raise exception 'Teste da oferta falhou'; end if; end $$;
rollback;
