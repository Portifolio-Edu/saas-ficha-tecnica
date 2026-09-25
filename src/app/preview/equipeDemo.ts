// EQUIPE (2026-09-25): dados da demo pra equipe, modo cozinha e contagem
// cega, derivados dos fixtures da Cantina Bella Notte (mesmos insumos,
// receitas e locais). A visão da cozinha sai sem nenhum preço, como no app.

import type { Membro, Funcionario } from "@/lib/dominio/equipe";
import type { ContagemCega } from "@/lib/dominio/estoque";
import type { FichaCozinha, ItemContagem } from "@/lib/dominio/cozinha";
import type { FechamentoEstoque } from "@/lib/dominio/fechamentoCmv";
import { fechamentos, insumos, locais, todasReceitas } from "./fixtures";

export const USER_ID_DONO_DEMO = "u-dono";

export const membrosDemo: Membro[] = [
  { id: "m-dono", userId: USER_ID_DONO_DEMO, papel: "dono", nome: "Rafael Bellini", usuario: null, ativo: true, criadoEm: "2026-08-01T10:00:00.000Z" },
  { id: "m-gestor", userId: "u-gestor", papel: "gestor", nome: "Juliana Costa", usuario: "juliana.gestao", ativo: true, criadoEm: "2026-08-03T10:00:00.000Z" },
  { id: "m-estoque", userId: "u-estoque", papel: "estoquista", nome: "Carlos Mendes", usuario: "carlos.estoque", ativo: true, criadoEm: "2026-08-05T10:00:00.000Z" },
  { id: "m-tablet", userId: "u-tablet", papel: "cozinha", nome: "Aparelho da cozinha 1", usuario: null, ativo: true, criadoEm: "2026-09-01T10:00:00.000Z" },
];

export const funcionariosDemo: Funcionario[] = [
  { id: "f-ana", nome: "Ana Souza" },
  { id: "f-juliana", nome: "Juliana Costa" },
  { id: "f-marcos", nome: "Marcos Silva" },
  { id: "f-pedro", nome: "Pedro Alves" },
];

const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
const receitaPorId = new Map(todasReceitas.map((r) => [r.id, r]));

export const fichasCozinhaDemo: FichaCozinha[] = todasReceitas.map((r) => ({
  id: r.id,
  nome: r.nomePrato,
  tipo: r.tipo,
  categoria: r.categoria,
  rendimento: r.rendimento,
  unidadeRendimento: r.unidadeRendimento,
  pesoPorcaoG: r.pesoPorcaoG,
  modoPreparo: r.modoPreparo,
  fotoUrl: r.fotoUrl,
  ingredientes: r.ficha.map((l) => ({
    id: l.id,
    nome: (l.insumoId ? insumoPorId.get(l.insumoId)?.nome : receitaPorId.get(l.subReceitaId ?? "")?.nomePrato) ?? "Item",
    quantidade: l.pesoLiquido,
    unidade: l.unidade,
    ehPreparo: !l.insumoId,
  })),
  etapas: r.etapas.map((e) => ({ ordem: e.ordem, titulo: e.titulo, texto: e.texto, fotoUrl: e.fotoUrl })),
}));

const nomeLocal = new Map(locais.map((l) => [l.id, l.nome]));

export const itensContagemDemo: ItemContagem[] = insumos
  .filter((i) => i.estoque)
  .map((i) => ({
    insumoId: i.id,
    nome: i.nome,
    unidade: i.unidadeMedida,
    local: (i.localArmazenamentoId && nomeLocal.get(i.localArmazenamentoId)) || "Outros",
  }));

const hoje = (hora: string) => {
  const d = new Date();
  const [h, m] = hora.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/** Contagem cega de exemplo: camarão e mussarela abaixo do que o sistema esperava. */
export const contagensDemo: ContagemCega[] = [
  {
    id: "cont-1",
    responsavel: "Pedro Alves",
    criadoEm: hoje("07:30"),
    aplicadaEm: null,
    itens: ["i-camarao", "i-mussarela", "i-frango", "i-patinho", "i-parmesao"]
      .map((id) => insumoPorId.get(id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i?.estoque))
      .map((i) => {
        const sistema = i.estoque!.saldoAtual;
        const falta = i.id === "i-camarao" ? 1.2 : i.id === "i-mussarela" ? 0.8 : 0;
        return { insumoId: i.id, nome: i.nome, unidadeMedida: i.unidadeMedida, precoUnitario: i.precoUnitario, contada: Number(Math.max(0, sistema - falta).toFixed(2)), sistema };
      }),
  },
];

export const fechamentosEstoqueDemo: FechamentoEstoque[] = fechamentos.map((f) => ({
  id: f.id,
  periodoInicio: f.periodoInicio,
  periodoFim: f.periodoFim,
  estoqueInicial: f.estoqueInicial,
  compras: f.compras,
  estoqueFinal: f.estoqueFinal,
}));
