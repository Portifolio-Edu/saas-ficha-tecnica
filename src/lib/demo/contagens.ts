"use client";

// DEMO (2026-09-25): aplicar/descartar contagem cega na demonstração, com a
// mesma regra do app (src/lib/dados/estoque.ts → aplicarContagem): cada
// diferença entre o contado e o saldo guardado no envio vira movimentação
// ("entrada" se sobrou, "ajuste" se faltou) e mexe no saldo por essa
// diferença. Grava no "banco" da demo (armazem.ts), então Estoque e
// Movimentações mostram o ajuste na hora.
// Estoque e movimentações já estão gravados: EstoqueClient grava ao abrir.

import { CHAVES_DEMO, gravarDemo, lerDemo } from "./armazem";
import type { ContagemCega, EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";

export function aplicarContagemDemo(contagem: ContagemCega, atuais: ContagemCega[]): void {
  const dia = new Date(contagem.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const agora = new Date().toISOString();
  const diferencas = contagem.itens
    .map((i) => ({ ...i, diferenca: Number((i.contada - i.sistema).toFixed(3)) }))
    .filter((i) => i.diferenca !== 0);

  if (diferencas.length > 0) {
    const delta = new Map(diferencas.map((i) => [i.insumoId, i.diferenca]));
    gravarDemo(
      CHAVES_DEMO.estoque,
      lerDemo<EstoqueLinha>(CHAVES_DEMO.estoque, []).map((l) =>
        delta.has(l.insumoId) ? { ...l, saldoAtual: Math.max(0, Number((l.saldoAtual + delta.get(l.insumoId)!).toFixed(3))) } : l,
      ),
    );
    const novas: Movimentacao[] = diferencas.map((i) => ({
      id: `demo-mov-${Date.now()}-${i.insumoId}`,
      insumoId: i.insumoId,
      nomeInsumo: i.nome,
      unidadeMedida: i.unidadeMedida,
      tipo: i.diferenca > 0 ? "entrada" : "ajuste",
      quantidade: Math.abs(i.diferenca),
      origem: `Contagem cega de ${contagem.responsavel} (${dia})`,
      criadoEm: agora,
    }));
    gravarDemo(CHAVES_DEMO.movimentacoes, [...novas, ...lerDemo<Movimentacao>(CHAVES_DEMO.movimentacoes, [])]);
  }

  gravarDemo(
    CHAVES_DEMO.contagens,
    lerDemo(CHAVES_DEMO.contagens, atuais).map((c) => (c.id === contagem.id ? { ...c, aplicadaEm: agora } : c)),
  );
}

export function descartarContagemDemo(contagemId: string, atuais: ContagemCega[]): void {
  gravarDemo(
    CHAVES_DEMO.contagens,
    lerDemo(CHAVES_DEMO.contagens, atuais).filter((c) => c.id !== contagemId),
  );
}
