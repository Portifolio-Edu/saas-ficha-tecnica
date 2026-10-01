import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarProducoes } from "@/lib/dados/producoes";
import { listarFechamentos } from "@/lib/dados/fechamentosCmv";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { VisaoGeralClient } from "./VisaoGeralClient";

export default async function VisaoGeralPage() {
  const cliente = await exigirAcesso("/visao-geral");

  const [insumos, receitas, processamentos, producoes, fechamentos] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarProducoes(),
    listarFechamentos(),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Visão geral">
      {/* EQUIPE (2026-09-25): mostra o que a cozinha registrou sem precisar recarregar. */}
      <AtualizacaoAutomatica />
      <VisaoGeralClient
        margemAlvoCliente={cliente.margemAlvo}
        insumos={insumos}
        receitas={receitas}
        processamentos={processamentos}
        producoes={producoes}
        fechamentos={fechamentos}
      />
    </AppShell>
  );
}
