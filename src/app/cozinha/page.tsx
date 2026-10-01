import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { carregarDadosCozinha, itensDeContagem, listarLotesProteina, listarProducoesDeHoje } from "@/lib/dados/cozinha";
import { listarChecklists } from "@/lib/dados/checklists";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { listarFuncionarios } from "@/lib/dados/equipe";
import { carregarEscalaPublica } from "@/lib/dados/escalas";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { montarEscalaPublica, periodoCozinha, type EscalaPublica } from "@/lib/escalas/publica";
import { CozinhaApp } from "@/components/cozinha/CozinhaApp";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { PareamentoForm } from "./PareamentoForm";
import { listarAgendaFornecedores, listarRequisicoes } from "@/lib/dados/requisicoes";
import { listarPlanoDoDia } from "@/lib/dados/planoProducao";
import { ehGestao } from "@/lib/auth/papeis";
import { agoraNoRestaurante, categoriaDoInsumo } from "@/lib/dominio/requisicao";
import {
  acaoAtualizarProducao,
  acaoDesmarcarItem,
  acaoEnviarContagem,
  acaoMarcarItem,
  acaoRegistrarProducao,
  acaoRegistrarTemperatura,
  acaoRegistrarLoteProteina,
  acaoCriarRequisicao,
  acaoRemoverRequisicao,
  acaoAdicionarAoPlano,
  acaoTirarDoPlano,
} from "./actions";

// EQUIPE (2026-09-25): modo cozinha. Sem login mostra o pareamento por
// código; com o aparelho pareado (ou dono/gestor testando) abre a rotina da
// cozinha. Tudo aqui passa pela RLS do papel cozinha: sem R$, sem saldo.
export const dynamic = "force-dynamic";

// ESCALAS (2026-09-26): a escala do tablet é calculada aqui no servidor e só
// o resultado público (trabalha/folga/férias/ausente) vai pro navegador. Se
// algo falhar, a aba mostra "em revisão" e o resto da cozinha segue normal.
async function escalaDaCozinha(hoje: string): Promise<EscalaPublica | null> {
  try {
    const { inicio, fim } = periodoCozinha(hoje);
    return montarEscalaPublica(await carregarEscalaPublica(inicio, fim), inicio, fim);
  } catch {
    return null;
  }
}

export default async function CozinhaPage() {
  if (!supabaseConfigurado()) redirect("/preview/cozinha");

  const cliente = await getClienteAtual();
  if (!cliente) return <PareamentoForm />;
  if (cliente.papel === "estoquista") redirect("/estoque");

  const dados = await carregarDadosCozinha();
  const hoje = hojeLocalISO();
  const [checklists, locais, temperaturas, funcionarios, producoes, lotesProteina, escala, requisicoes, agendaFornecedores, plano] = await Promise.all([
    listarChecklists(),
    listarLocaisArmazenamento(),
    listarRegistrosTemperatura(40),
    listarFuncionarios(),
    listarProducoesDeHoje(dados.fichas),
    listarLotesProteina(30),
    escalaDaCozinha(hoje),
    listarRequisicoes(),
    listarAgendaFornecedores(),
    listarPlanoDoDia(hoje, cliente.userId, ehGestao(cliente.papel)),
  ]);

  return (
    <>
      {/* EQUIPE (2026-09-25): checklist novo ou item marcado pelo gestor aparece no tablet sozinho. */}
      <AtualizacaoAutomatica />
      <CozinhaApp
        nomeRestaurante={cliente.nomeRestaurante}
        funcionarios={funcionarios}
        checklists={checklists}
        locais={locais}
        temperaturas={temperaturas}
        fichas={dados.fichas}
        itensContagem={itensDeContagem(dados, locais)}
        producoes={producoes}
        proteinas={dados.proteinas}
        lotesProteina={lotesProteina}
        escala={escala}
        hoje={hoje}
        requisicoes={requisicoes}
        plano={plano}
        agendaFornecedores={agendaFornecedores}
        sugestoesPedido={dados.insumosCalc.map((i) => ({ id: i.id, nome: i.nome, categoria: categoriaDoInsumo(i.categoria) }))}
        agoraInicial={agoraNoRestaurante()}
        acoes={{
          marcarItem: acaoMarcarItem,
          desmarcarItem: acaoDesmarcarItem,
          registrarTemperatura: acaoRegistrarTemperatura,
          registrarProducao: acaoRegistrarProducao,
          atualizarProducao: acaoAtualizarProducao,
          enviarContagem: acaoEnviarContagem,
          registrarLoteProteina: acaoRegistrarLoteProteina,
          pedir: acaoCriarRequisicao,
          desistirDoPedido: acaoRemoverRequisicao,
          adicionarAoPlano: acaoAdicionarAoPlano,
          tirarDoPlano: acaoTirarDoPlano,
        }}
      />
    </>
  );
}
