import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { carregarDadosCozinha, itensDeContagem, listarProducoesDeHoje } from "@/lib/dados/cozinha";
import { listarChecklists } from "@/lib/dados/checklists";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { listarFuncionarios } from "@/lib/dados/equipe";
import { CozinhaApp } from "@/components/cozinha/CozinhaApp";
import { PareamentoForm } from "./PareamentoForm";
import {
  acaoAtualizarProducao,
  acaoDesmarcarItem,
  acaoEnviarContagem,
  acaoMarcarItem,
  acaoRegistrarProducao,
  acaoRegistrarTemperatura,
} from "./actions";

// EQUIPE (2026-09-25): modo cozinha. Sem login mostra o pareamento por
// código; com o aparelho pareado (ou dono/gestor testando) abre a rotina da
// cozinha. Tudo aqui passa pela RLS do papel cozinha: sem R$, sem saldo.
export const dynamic = "force-dynamic";

export default async function CozinhaPage() {
  if (!supabaseConfigurado()) redirect("/preview/cozinha");

  const cliente = await getClienteAtual();
  if (!cliente) return <PareamentoForm />;
  if (cliente.papel === "estoquista") redirect("/estoque");

  const dados = await carregarDadosCozinha();
  const [checklists, locais, temperaturas, funcionarios, producoes] = await Promise.all([
    listarChecklists(),
    listarLocaisArmazenamento(),
    listarRegistrosTemperatura(40),
    listarFuncionarios(),
    listarProducoesDeHoje(dados.fichas),
  ]);

  return (
    <CozinhaApp
      nomeRestaurante={cliente.nomeRestaurante}
      funcionarios={funcionarios}
      checklists={checklists}
      locais={locais}
      temperaturas={temperaturas}
      fichas={dados.fichas}
      itensContagem={itensDeContagem(dados, locais)}
      producoes={producoes}
      acoes={{
        marcarItem: acaoMarcarItem,
        desmarcarItem: acaoDesmarcarItem,
        registrarTemperatura: acaoRegistrarTemperatura,
        registrarProducao: acaoRegistrarProducao,
        atualizarProducao: acaoAtualizarProducao,
        enviarContagem: acaoEnviarContagem,
      }}
    />
  );
}
