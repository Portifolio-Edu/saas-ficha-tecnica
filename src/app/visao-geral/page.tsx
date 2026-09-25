import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarProducoes } from "@/lib/dados/producoes";
import { listarFechamentos } from "@/lib/dados/fechamentosCmv";
import { AppShell } from "@/components/ficha/AppShell";
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
