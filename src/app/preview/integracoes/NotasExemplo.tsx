"use client";

// Função não atravessa a fronteira servidor → cliente como prop, então o gerador
// de notas de exemplo é importado aqui, do lado do cliente.
import { IntegracoesClient } from "@/app/integracoes/IntegracoesClient";
import { gerarNotasExemplo } from "../integracoesDemo";
import type { PedidoRecebido } from "@/lib/integracoes/pdvs";

export function NotasExemploProvider({
  fichas,
  conectados,
  pedidos,
  resumoHoje,
}: {
  fichas: { id: string; nome: string }[];
  conectados: string[];
  pedidos: PedidoRecebido[];
  resumoHoje: Record<string, { pedidos: number; valor: number }>;
}) {
  return <IntegracoesClient fichas={fichas} demo={{ conectados, pedidos, resumoHoje, notasExemplo: gerarNotasExemplo }} />;
}
