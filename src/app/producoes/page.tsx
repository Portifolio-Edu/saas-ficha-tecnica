import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProducoes, garantirTurnosPadrao } from "@/lib/dados/producoes";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { ProducoesClient } from "./ProducoesClient";
import { PlanoProducaoGestao } from "@/components/producoes/PlanoProducaoGestao";
import { listarPlanoDoDia } from "@/lib/dados/planoProducao";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { acaoPlanoAdicionar, acaoPlanoTirar } from "./actions";

export default async function ProducoesPage() {
  const cliente = await exigirAcesso("/producoes");

  // LISTA DE PRODUÇÃO (2026-09-26): hoje e amanhã.
  const hoje = hojeLocalISO();
  const amanha = hojeLocalISO(new Date(Date.now() + 86_400_000));
  const [insumos, receitas, producoes, turnos, processamentos, planoHoje, planoAmanha] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProducoes(),
    garantirTurnosPadrao(cliente.id),
    listarProcessamentos(),
    listarPlanoDoDia(hoje, cliente.userId, true),
    listarPlanoDoDia(amanha, cliente.userId, true),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Produções">
      {/* EQUIPE (2026-09-25): mostra o que a cozinha registrou sem precisar recarregar. */}
      <AtualizacaoAutomatica />
      <PlanoProducaoGestao
        receitas={receitas.map((r) => ({ id: r.id, nome: r.nomePrato, tipo: r.tipo === "preparo_base" ? "preparo_base" : "prato_final", rendimento: r.rendimento, unidade: r.unidadeRendimento }))}
        plano={[...planoHoje, ...planoAmanha]}
        producoesHoje={producoes.filter((p) => hojeLocalISO(new Date(p.criadoEm)) === hoje)}
        hoje={hoje}
        amanha={amanha}
        acoes={{ adicionar: acaoPlanoAdicionar, tirar: acaoPlanoTirar }}
      />
      <ProducoesClient insumos={insumos} receitas={receitas} producoes={producoes} turnos={turnos} processamentos={processamentos} />
    </AppShell>
  );
}
