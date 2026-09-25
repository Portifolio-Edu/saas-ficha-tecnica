import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarProducoes } from "@/lib/dados/producoes";
import { listarFechamentos } from "@/lib/dados/fechamentosCmv";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { AppShell } from "@/components/ficha/AppShell";
import { RelatoriosClient } from "./RelatoriosClient";

export default async function RelatoriosPage() {
  const cliente = await exigirAcesso("/relatorios");

  const [insumos, receitas, processamentos, producoes, fechamentos, locais, registrosTemperatura] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarProducoes(),
    listarFechamentos(),
    listarLocaisArmazenamento(),
    listarRegistrosTemperatura(),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Relatórios">
      <RelatoriosClient
        insumos={insumos}
        receitas={receitas}
        processamentos={processamentos}
        producoes={producoes}
        fechamentos={fechamentos}
        locais={locais}
        registrosTemperatura={registrosTemperatura}
        margemAlvoCliente={cliente.margemAlvo}
        nomeRestaurante={cliente.nomeRestaurante}
      />
    </AppShell>
  );
}
