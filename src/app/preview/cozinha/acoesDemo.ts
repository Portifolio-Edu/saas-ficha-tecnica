"use client";

// DEMO (2026-09-25): ações do modo cozinha na demonstração. Gravam no
// "banco" da demo (src/lib/demo/armazem.ts) nos mesmos formatos que as telas
// do gestor leem, e com as mesmas regras do app:
//   - produção entra em Produções e baixa o estoque pela ficha (peso bruto,
//     sub-receitas na proporção), com movimentação "saída produção";
//   - checklist marcado aparece em Checklists de turno;
//   - temperatura aparece em Segurança alimentar (e nos alertas);
//   - contagem cega vai pro topo de Estoque, com o saldo da hora guardado.
// No app essas ações são src/app/cozinha/actions.ts, gravando no Supabase.

import type { AcoesCozinha } from "@/components/cozinha/CozinhaApp";
import { CHAVES_DEMO, gravarDemo, lerDemo } from "@/lib/demo/armazem";
import { consumoDeInsumosDaProducao } from "@/lib/calculo/consumoProducao";
import { gerarLote } from "@/lib/calculo/lote";
import type { Producao } from "@/lib/dominio/producao";
import type { Checklist } from "@/lib/dominio/checklist";
import type { RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { ContagemCega, EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import {
  checklists as checklistsFixture,
  estoque as estoqueFixture,
  insumos,
  locais,
  movimentacoes as movimentacoesFixture,
  processamentos,
  producoes as producoesFixture,
  registrosTemperatura,
  todasReceitas,
} from "../fixtures";
import { contagensDemo } from "../equipeDemo";

const receitaPorId = new Map(todasReceitas.map((r) => [r.id, r]));
const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

export const lerProducoesDemo = () => lerDemo<Producao>(CHAVES_DEMO.producoes, producoesFixture);
export const lerChecklistsDemo = () => lerDemo<Checklist>(CHAVES_DEMO.checklists, checklistsFixture);
export const lerTemperaturasDemo = () => lerDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, registrosTemperatura);
export const lerContagensDemo = () => lerDemo<ContagemCega>(CHAVES_DEMO.contagens, contagensDemo);
const lerEstoqueDemo = () => lerDemo<EstoqueLinha>(CHAVES_DEMO.estoque, estoqueFixture);
const lerMovimentacoesDemo = () => lerDemo<Movimentacao>(CHAVES_DEMO.movimentacoes, movimentacoesFixture);

const id = (prefixo: string) => `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const pausa = () => new Promise((r) => setTimeout(r, 150));

function exigirNome(responsavel: string) {
  if (!responsavel.trim()) throw new Error("Escolha quem está fazendo antes de registrar.");
}

function erro(e: unknown) {
  return { ok: false as const, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export const acoesCozinhaDemo: AcoesCozinha = {
  async marcarItem(itemId, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      gravarDemo(CHAVES_DEMO.checklists, lerChecklistsDemo().map((c) => ({ ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, concluidoHoje: true } : i)) })));
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },

  async desmarcarItem(itemId) {
    await pausa();
    gravarDemo(CHAVES_DEMO.checklists, lerChecklistsDemo().map((c) => ({ ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, concluidoHoje: false } : i)) })));
    return { ok: true };
  },

  async registrarTemperatura(localId, temperatura, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      const local = locais.find((l) => l.id === localId);
      if (!local) throw new Error("Equipamento não encontrado.");
      const novo: RegistroTemperatura = {
        id: id("demo-temp"),
        localArmazenamentoId: local.id,
        nomeLocal: local.nome,
        temperaturaC: temperatura,
        responsavel,
        registradoEm: new Date().toISOString(),
        insumoId: null,
        nomeInsumo: null,
      };
      gravarDemo(CHAVES_DEMO.temperaturas, [...lerTemperaturasDemo(), novo]);
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },

  async registrarProducao(receitaId, quantidade, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      const receita = receitaPorId.get(receitaId);
      if (!receita) throw new Error("Receita não encontrada.");
      if (!(quantidade > 0)) throw new Error("Informe a quantidade produzida.");

      const agora = new Date();
      const producoes = lerProducoesDemo();
      const lote = gerarLote(receita.nomePrato, producoes.filter((p) => p.receitaId === receitaId).length + 1, agora);
      const nova: Producao = {
        id: id("demo-cozinha"),
        lote,
        tipo: receita.tipo === "preparo_base" ? "preparo" : "prato",
        receitaId,
        nomeReceita: receita.nomePrato,
        unidadeRendimento: receita.unidadeRendimento,
        quantidade,
        responsavel,
        turnoId: null,
        nomeTurno: null,
        chefeTurno: null,
        validade: null,
        status: "em_producao",
        motivoPerda: null,
        criadoEm: agora.toISOString(),
      };
      gravarDemo(CHAVES_DEMO.producoes, [nova, ...producoes]);

      // Baixa pela ficha, só nos insumos com estoque controlado — igual ao app.
      const consumos = consumoDeInsumosDaProducao(receita, quantidade, receitaPorId, insumoPorId, processamentos).filter(
        (c) => insumoPorId.get(c.insumoId)?.estoque,
      );
      if (consumos.length > 0) {
        const gasto = new Map(consumos.map((c) => [c.insumoId, c.quantidade]));
        gravarDemo(
          CHAVES_DEMO.estoque,
          lerEstoqueDemo().map((l) => (gasto.has(l.insumoId) ? { ...l, saldoAtual: Math.max(0, Number((l.saldoAtual - gasto.get(l.insumoId)!).toFixed(3))) } : l)),
        );
        const novas: Movimentacao[] = consumos.map((c) => ({
          id: id("demo-mov"),
          insumoId: c.insumoId,
          nomeInsumo: c.nome,
          unidadeMedida: c.unidadeMedida,
          tipo: "saida_producao",
          quantidade: c.quantidade,
          origem: `Produção (cozinha) — lote ${lote} (${receita.nomePrato})`,
          criadoEm: agora.toISOString(),
        }));
        gravarDemo(CHAVES_DEMO.movimentacoes, [...novas, ...lerMovimentacoesDemo()]);
      }
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },

  async atualizarProducao(producaoId, status, motivo) {
    await pausa();
    if (status === "perda" && !motivo?.trim()) return { ok: false, erro: "Diga o motivo da perda." };
    gravarDemo(
      CHAVES_DEMO.producoes,
      lerProducoesDemo().map((p) => (p.id === producaoId ? { ...p, status, motivoPerda: status === "perda" ? motivo : null } : p)),
    );
    return { ok: true };
  },

  async enviarContagem(responsavel, itens) {
    await pausa();
    try {
      exigirNome(responsavel);
      const validos = itens.filter((i) => Number.isFinite(i.quantidade) && i.quantidade >= 0);
      if (validos.length === 0) throw new Error("Conte pelo menos um item.");
      // Guarda o saldo do sistema na hora do envio (a cozinha não vê).
      const saldo = new Map(lerEstoqueDemo().map((l) => [l.insumoId, l.saldoAtual]));
      const contagem: ContagemCega = {
        id: id("demo-contagem"),
        responsavel,
        criadoEm: new Date().toISOString(),
        aplicadaEm: null,
        itens: validos
          .map((i) => insumoPorId.get(i.insumoId) && { insumo: insumoPorId.get(i.insumoId)!, contada: i.quantidade })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
          .map(({ insumo, contada }) => ({
            insumoId: insumo.id,
            nome: insumo.nome,
            unidadeMedida: insumo.unidadeMedida,
            precoUnitario: insumo.precoUnitario,
            contada,
            sistema: saldo.get(insumo.id) ?? insumo.estoque?.saldoAtual ?? 0,
          })),
      };
      gravarDemo(CHAVES_DEMO.contagens, [contagem, ...lerContagensDemo()]);
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },
};
