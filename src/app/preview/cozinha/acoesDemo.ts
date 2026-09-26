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
import type { Processamento } from "@/lib/dominio/processamento";
import {
  checklists as checklistsFixture,
  estoque as estoqueFixture,
  insumos,
  locais,
  movimentacoes as movimentacoesFixture,
  processamentos,
  processamentos as processamentosFixture,
  producoes as producoesFixture,
  registrosTemperatura,
  requisicoesDemo,
  todasReceitas,
} from "../fixtures";
import { validarRequisicao, type Requisicao } from "@/lib/dominio/requisicao";
import { contagensDemo } from "../equipeDemo";
import { planoDemoInicial, type ItemPlanoDemo } from "@/lib/demo/planoProducao";
import { validarItemPlano } from "@/lib/dominio/planoProducao";
import { hojeLocalISO } from "@/lib/calculo/dia";

const receitaPorId = new Map(todasReceitas.map((r) => [r.id, r]));
const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

export const lerProducoesDemo = () => lerDemo<Producao>(CHAVES_DEMO.producoes, producoesFixture);
export const lerChecklistsDemo = () => lerDemo<Checklist>(CHAVES_DEMO.checklists, checklistsFixture);
export const lerTemperaturasDemo = () => lerDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, registrosTemperatura);
export const lerContagensDemo = () => lerDemo<ContagemCega>(CHAVES_DEMO.contagens, contagensDemo);
export const lerRequisicoesDemo = () => lerDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
export const lerProcessamentosDemo = () => lerDemo<Processamento>(CHAVES_DEMO.processamentos, processamentosFixture);
export const lerPlanoDemo = () => lerDemo<ItemPlanoDemo>(CHAVES_DEMO.planoProducao, planoDemoInicial(hojeLocalISO(), todasReceitas));

/** Põe na lista do dia (mesma regra do banco: receita repetida no dia muda a quantidade). */
export function porNoPlanoDemo(receitaId: string, quantidade: number, observacao: string | null, responsavel: string, origem: "gestao" | "cozinha", data = hojeLocalISO()): { aviso?: string } {
  const problema = validarItemPlano({ receitaId, quantidade, observacao });
  if (problema) throw new Error(problema);
  const lista = lerPlanoDemo();
  const existente = lista.find((i) => i.data === data && i.receitaId === receitaId);
  if (existente) {
    if (origem === "cozinha" && existente.origem !== "cozinha") throw new Error("Essa ficha já está na lista, pedida pelo gestor. Fale com ele pra mudar a quantidade.");
    gravarDemo(CHAVES_DEMO.planoProducao, lista.map((i) => (i.id === existente.id ? { ...i, quantidade, observacao: observacao?.trim() || i.observacao } : i)));
    return { aviso: "Já estava na lista: quantidade atualizada." };
  }
  const novo: ItemPlanoDemo = { id: id("plano"), data, receitaId, quantidade, observacao: observacao?.trim() || null, responsavel, origem, criadoEm: new Date().toISOString() };
  gravarDemo(CHAVES_DEMO.planoProducao, [...lista, novo]);
  return {};
}

export function tirarDoPlanoDemo(idItem: string, origem: "gestao" | "cozinha") {
  const lista = lerPlanoDemo();
  const item = lista.find((i) => i.id === idItem);
  if (!item) return;
  if (origem === "cozinha" && item.origem !== "cozinha") throw new Error("Só quem pediu (ou o gestor) tira esse item.");
  gravarDemo(CHAVES_DEMO.planoProducao, lista.filter((i) => i.id !== idItem));
}

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

  // PROTEÍNAS (2026-09-25): mesmo que registrar_processamento_cozinha no banco:
  // valor pago por kg vem do cadastro do insumo, a cozinha só manda pesos.
  async registrarLoteProteina(lote, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      const insumo = insumoPorId.get(lote.insumoId);
      if (!insumo || insumo.categoria !== "proteina") throw new Error("Proteína não encontrada.");
      if (!(lote.pesoBruto > 0) || !(lote.pesoLimpo > 0)) throw new Error("Informe o peso bruto e o limpo.");
      if (lote.pesoLimpo + lote.aparas > lote.pesoBruto) throw new Error("O peso limpo mais as aparas passam do peso bruto. Confira a balança.");
      const novo: Processamento = {
        id: id("demo-proteina"),
        insumoId: insumo.id,
        responsavel,
        pesoBrutoRecebido: lote.pesoBruto,
        valorPagoKg: insumo.precoUnitario,
        pesoLiquidoResultante: lote.pesoLimpo,
        pesoAparasReaproveitaveis: lote.aparas,
        pesoDescartePuro: Number((lote.pesoBruto - lote.pesoLimpo - lote.aparas).toFixed(3)),
        fcObservado: lote.pesoBruto / lote.pesoLimpo,
        fornecedor: null,
        observacao: lote.observacao,
        processadoEm: new Date().toISOString(),
      };
      gravarDemo(CHAVES_DEMO.processamentos, [...lerProcessamentosDemo(), novo]);
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
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
  // PEDIDOS DA COZINHA (2026-09-26)
  async pedir(r, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      const problema = validarRequisicao(r);
      if (problema) throw new Error(problema);
      const nova: Requisicao = {
        id: id("req"),
        categoria: r.categoria,
        insumoId: r.insumoId,
        descricao: r.descricao.trim(),
        quantidade: r.quantidade,
        unidade: r.quantidade === null ? null : r.unidade,
        observacao: r.observacao?.trim() || null,
        responsavel,
        status: "pendente",
        criadoEm: new Date().toISOString(),
        resolvidoEm: null,
      };
      gravarDemo(CHAVES_DEMO.requisicoes, [nova, ...lerRequisicoesDemo()]);
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },
  async desistirDoPedido(idPedido) {
    await pausa();
    const lista = lerRequisicoesDemo();
    if (!lista.some((r) => r.id === idPedido && r.status === "pendente")) return erro(new Error("Esse item já foi comprado; não dá mais pra tirar do pedido."));
    gravarDemo(CHAVES_DEMO.requisicoes, lista.filter((r) => r.id !== idPedido));
    return { ok: true };
  },
  // LISTA DE PRODUÇÃO (2026-09-26)
  async adicionarAoPlano(receitaId, quantidade, observacao, responsavel) {
    await pausa();
    try {
      exigirNome(responsavel);
      const { aviso } = porNoPlanoDemo(receitaId, quantidade, observacao, responsavel, "cozinha");
      return aviso ? { ok: true, aviso } : { ok: true };
    } catch (e) {
      return erro(e);
    }
  },
  async tirarDoPlano(idItem) {
    await pausa();
    try {
      tirarDoPlanoDemo(idItem, "cozinha");
      return { ok: true };
    } catch (e) {
      return erro(e);
    }
  },
};
