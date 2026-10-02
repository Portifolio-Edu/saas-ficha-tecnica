// AGENTE IA (2026-09-26): ferramentas que o agente do n8n chama (POST
// /api/agente/ferramentas com o passe). Cada uma diz quais papéis podem usar
// e roda COMO a pessoa (comoUsuario → RLS). Consultas devolvem só o que a
// tela daquela pessoa mostraria; o que grava vira PROPOSTA pra confirmar.
// Pra criar uma ferramenta: só a entrada aqui. O app manda pro n8n a lista
// das que o papel pode usar (catalogoDoPapel) e o workflow "FT — Agente IA"
// chama todas pela mesma ferramenta "sistema" (docs/AGENTE_IA.md).
import type { Papel } from "@/lib/auth/papeis";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarProducoes } from "@/lib/dados/producoes";
import { listarAgendaFornecedores, listarRequisicoes } from "@/lib/dados/requisicoes";
import { listarPlanoDoDia } from "@/lib/dados/planoProducao";
import { carregarEscalaPublica } from "@/lib/dados/escalas";
import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCmvReceita } from "@/lib/calculo/cmv";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { CAMPOS_NUTRICIONAIS, type ValoresNutricionais } from "@/lib/calculo/nutricional";
import { montarEscalaPublica } from "@/lib/escalas/publica";
import { paraDia, paraISO } from "@/lib/escalas/datas";
import { lerNotaDeCompra } from "@/lib/integracoes/documentoFiscal";
import { progressoDoPlano } from "@/lib/dominio/planoProducao";
import {
  CATEGORIAS_PEDIDO, UNIDADES_PEDIDO, agoraNoRestaurante, categoriaDoInsumo, frasePrazo, pedidosDaCategoria,
  type CategoriaPedido, type UnidadePedido,
} from "@/lib/dominio/requisicao";
import { montarEntrada, sugerirInsumos, type ItemNota } from "./entradaNota";
import {
  cancelarProposta, confirmarProposta, criarProposta, listarPropostasPendentes,
  type DadosEntrada, type DadosListaProducao, type DadosNutricionais, type DadosPedido, type DadosPerda,
} from "./propostas";
import type { PasseAgente } from "./passe";
import { ErroFerramenta } from "./erro";
import { dataBR } from "@/lib/formato";

type Args = Record<string, unknown>;

export interface Ferramenta {
  descricao: string;
  papeis: Papel[];
  executar: (a: Args, passe: PasseAgente) => Promise<unknown>;
}

export { ErroFerramenta };

// ---------------------------------------------------------------------------
// Leitura dos argumentos (o modelo às vezes manda número como texto)

function texto(a: Args, k: string, { obrigatorio = false, max = 300 } = {}): string | null {
  const v = a[k];
  if (v === undefined || v === null || v === "") {
    if (obrigatorio) throw new ErroFerramenta(`Falta "${k}".`);
    return null;
  }
  return String(v).trim().slice(0, max);
}

function numero(a: Args, k: string, { obrigatorio = false } = {}): number | null {
  const v = a[k];
  if (v === undefined || v === null || v === "") {
    if (obrigatorio) throw new ErroFerramenta(`Falta "${k}".`);
    return null;
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) throw new ErroFerramenta(`"${k}" precisa ser um número.`);
  return n;
}

function lista(a: Args, k: string, max = 60): Args[] {
  let v = a[k];
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new ErroFerramenta(`"${k}" precisa ser uma lista.`);
    }
  }
  if (!Array.isArray(v) || v.length === 0) throw new ErroFerramenta(`"${k}" precisa ser uma lista com pelo menos um item.`);
  return v.slice(0, max).map((x) => (typeof x === "object" && x ? (x as Args) : {}));
}

const GESTAO: Papel[] = ["dono", "gestor"];
const ESTOQUE: Papel[] = ["dono", "gestor", "estoquista"];
const reais = (n: number) => Math.round(n * 100) / 100;

async function acharInsumo(a: Args) {
  const insumos = await listarInsumos();
  const id = texto(a, "insumo_id");
  if (id) {
    const i = insumos.find((x) => x.id === id);
    if (!i) throw new ErroFerramenta("Esse insumo não existe neste restaurante.");
    return i;
  }
  const busca = texto(a, "insumo", { obrigatorio: true })!;
  const sugestoes = sugerirInsumos(busca, insumos);
  if (!sugestoes.length || sugestoes[0].nota < 0.6) throw new ErroFerramenta(`Não achei "${busca}". Parecidos: ${sugestoes.map((s) => s.nome).join(", ") || "nenhum"}.`);
  return insumos.find((x) => x.id === sugestoes[0].id)!;
}

async function acharReceita(nomeOuId: string) {
  const receitas = await listarReceitas();
  const r = receitas.find((x) => x.id === nomeOuId) ?? receitas.find((x) => x.nomePrato.toLowerCase() === nomeOuId.toLowerCase());
  if (r) return r;
  const parecida = sugerirInsumos(nomeOuId, receitas.map((x) => ({ id: x.id, nome: x.nomePrato })))[0];
  if (parecida && parecida.nota >= 0.6) return receitas.find((x) => x.id === parecida.id)!;
  throw new ErroFerramenta(`Não achei a ficha "${nomeOuId}".`);
}

// ---------------------------------------------------------------------------

export const FERRAMENTAS: Record<string, Ferramenta> = {
  resumo_do_dia: {
    descricao: "Visão rápida do restaurante agora: estoque abaixo do mínimo, pedidos da cozinha, produção de hoje, lista do que produzir e propostas esperando confirmação. Use no começo da conversa ou quando pedirem 'como está hoje'.",
    papeis: ESTOQUE,
    async executar(_a, passe) {
      const hoje = hojeLocalISO();
      const [insumos, requisicoes, pendentes] = await Promise.all([listarInsumos(), listarRequisicoes(), listarPropostasPendentes(passe)]);
      const baixo = insumos.filter((i) => i.estoque && i.estoque.saldoAtual < i.estoque.estoqueMinimo);
      const resumo: Record<string, unknown> = {
        restaurante: passe.r,
        pessoa: passe.n,
        papel: passe.p,
        agora: dataBR(new Date(), { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }),
        estoque_abaixo_do_minimo: baixo.slice(0, 10).map((i) => ({ nome: i.nome, saldo: i.estoque!.saldoAtual, minimo: i.estoque!.estoqueMinimo, unidade: i.unidadeMedida })),
        total_abaixo_do_minimo: baixo.length,
        pedidos_da_cozinha_pendentes: requisicoes.filter((r) => r.status === "pendente").length,
        propostas_esperando_confirmacao: pendentes.map((p) => ({ id: p.id, resumo: p.resumo })),
      };
      if (passe.p !== "estoquista") {
        const [producoes, plano] = await Promise.all([listarProducoes(), listarPlanoDoDia(hoje, passe.u, true)]);
        const deHoje = producoes.filter((p) => hojeLocalISO(new Date(p.criadoEm)) === hoje);
        resumo.producao_hoje = { em_producao: deHoje.filter((p) => p.status === "em_producao").length, prontos: deHoje.filter((p) => p.status === "produzido").length, perdas: deHoje.filter((p) => p.status === "perda").length };
        resumo.lista_do_dia = progressoDoPlano(plano, deHoje).map((p) => ({ receitaId: p.item.receitaId, meta: p.item.quantidade, falta: p.falta, estado: p.estado }));
      }
      return resumo;
    },
  },

  buscar_insumos: {
    descricao: "Procura insumos (ingredientes comprados) pelo nome e devolve id, unidade, preço por unidade, fator de correção e o estoque (saldo e mínimo). Sem 'busca', lista os primeiros.",
    papeis: ESTOQUE,
    async executar(a) {
      const busca = texto(a, "busca");
      const insumos = await listarInsumos();
      const achados = busca ? sugerirInsumos(busca, insumos, 15).map((s) => insumos.find((i) => i.id === s.id)!) : insumos.slice(0, 25);
      return achados.map((i) => ({
        id: i.id,
        nome: i.nome,
        categoria: i.categoria,
        unidade: i.unidadeMedida,
        preco_por_unidade: reais(i.precoUnitario),
        fator_correcao: i.fatorCorrecao,
        estoque: i.estoque ? { saldo: i.estoque.saldoAtual, minimo: i.estoque.estoqueMinimo } : "não rastreado",
      }));
    },
  },

  estoque_baixo: {
    descricao: "Insumos com saldo abaixo do estoque mínimo, com quanto falta pra chegar no mínimo.",
    papeis: ESTOQUE,
    async executar() {
      const insumos = await listarInsumos();
      return insumos
        .filter((i) => i.estoque && i.estoque.saldoAtual < i.estoque.estoqueMinimo)
        .map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidadeMedida, saldo: i.estoque!.saldoAtual, minimo: i.estoque!.estoqueMinimo, falta: reais(i.estoque!.estoqueMinimo - i.estoque!.saldoAtual), categoria_pedido: categoriaDoInsumo(i.categoria) }));
    },
  },

  buscar_fichas: {
    descricao: "Procura fichas técnicas (pratos e preparos) pelo nome e devolve rendimento, porção e ingredientes com quantidades. Para dono/gestor também traz custo, custo por porção, preço de venda e margem.",
    papeis: ESTOQUE,
    async executar(a, passe) {
      const busca = texto(a, "busca");
      const [receitas, insumos, processamentos] = await Promise.all([listarReceitas(), listarInsumos(), listarProcessamentos()]);
      const nomeInsumo = new Map(insumos.map((i) => [i.id, i.nome]));
      const nomeReceita = new Map(receitas.map((r) => [r.id, r.nomePrato]));
      const achadas = busca ? sugerirInsumos(busca, receitas.map((r) => ({ id: r.id, nome: r.nomePrato })), 5).map((s) => receitas.find((r) => r.id === s.id)!) : receitas.slice(0, 15);
      const verCusto = passe.p === "dono" || passe.p === "gestor";
      const ctx = verCusto ? construirContexto(insumos, receitas, processamentos) : null;
      return achadas.map((r) => {
        const base: Record<string, unknown> = {
          id: r.id,
          nome: r.nomePrato,
          tipo: r.tipo === "prato_final" ? "prato" : "preparo",
          rendimento: `${r.rendimento} ${r.unidadeRendimento}`,
          porcao_g: r.pesoPorcaoG,
          ingredientes: r.ficha.map((l) => ({ nome: (l.insumoId ? nomeInsumo.get(l.insumoId) : nomeReceita.get(l.subReceitaId ?? "")) ?? "?", quantidade: l.pesoLiquido, unidade: l.unidade })),
        };
        if (ctx) {
          try {
            const custo = calcularCmvReceita(r.id, ctx);
            const porPorcao = custo / r.rendimento;
            base.custo_total = reais(custo);
            base.custo_por_porcao = reais(porPorcao);
            if (r.precoVenda) {
              base.preco_venda = r.precoVenda;
              base.margem_percentual = Math.round((1 - porPorcao / r.precoVenda) * 1000) / 10;
            }
          } catch {
            base.custo_total = "não calculado (falta dado de algum insumo)";
          }
        }
        return base;
      });
    },
  },

  pedidos_da_cozinha: {
    descricao: "Pedidos de compra pendentes da cozinha, por categoria, com o prazo do fornecedor pra chegar na próxima entrega.",
    papeis: ESTOQUE,
    async executar() {
      const [requisicoes, agenda] = await Promise.all([listarRequisicoes(), listarAgendaFornecedores()]);
      const agora = agoraNoRestaurante();
      return CATEGORIAS_PEDIDO.map((c) => {
        const itens = requisicoes.filter((r) => r.status === "pendente" && r.categoria === c.id);
        const prazo = pedidosDaCategoria(agenda, c.id, agora)[0];
        return { categoria: c.rotulo, itens: itens.map((r) => ({ descricao: r.descricao, quantidade: r.quantidade, unidade: r.unidade, observacao: r.observacao, pediu: r.responsavel })), prazo: prazo ? `${prazo.empresa}: ${frasePrazo(prazo, agora)}` : null };
      }).filter((g) => g.itens.length > 0);
    },
  },

  producao_do_dia: {
    descricao: "Produções de hoje (em produção, prontas, perdas) e a lista do que tem que ser produzido hoje com quanto falta.",
    papeis: GESTAO,
    async executar(_a, passe) {
      const hoje = hojeLocalISO();
      const [producoes, plano, receitas] = await Promise.all([listarProducoes(), listarPlanoDoDia(hoje, passe.u, true), listarReceitas()]);
      const nome = new Map(receitas.map((r) => [r.id, r.nomePrato]));
      const deHoje = producoes.filter((p) => hojeLocalISO(new Date(p.criadoEm)) === hoje);
      return {
        producoes: deHoje.map((p) => ({ receita: p.nomeReceita, quantidade: p.quantidade, unidade: p.unidadeRendimento, status: p.status, responsavel: p.responsavel, motivo_perda: p.motivoPerda })),
        lista_do_dia: progressoDoPlano(plano, deHoje).map((p) => ({ receita: nome.get(p.item.receitaId) ?? "?", meta: p.item.quantidade, feito: p.feito, no_fogo: p.emProducao, falta: p.falta, estado: p.estado, observacao: p.item.observacao })),
      };
    },
  },

  escala_do_dia: {
    descricao: "Quem trabalha, folga ou está fora numa data (AAAA-MM-DD; sem data = hoje).",
    papeis: GESTAO,
    async executar(a) {
      const data = texto(a, "data") ?? hojeLocalISO();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroFerramenta('Use a data como AAAA-MM-DD.');
      const inicio = paraISO(paraDia(data) - 7);
      const escala = montarEscalaPublica(await carregarEscalaPublica(inicio, data), inicio, data);
      if (!escala) return { aviso: "A escala está em revisão (o motor recusou a configuração atual)." };
      const i = paraDia(data) - paraDia(inicio);
      return escala.pessoas.map((p) => ({ nome: p.nome, equipe: p.equipe, situacao: escala.dias[p.id]?.[i]?.situacao ?? "fora do contrato", turno: p.turno ? `${p.turno.inicio}–${p.turno.fim}` : null }));
    },
  },

  ler_nota_xml: {
    descricao: "Lê o XML de uma NF-e de compra (fornecedor) e devolve fornecedor, número e itens (descrição, quantidade, unidade, valor). Depois use propor_entrada_estoque com esses itens.",
    papeis: ESTOQUE,
    async executar(a) {
      const conteudo = texto(a, "xml", { obrigatorio: true, max: 2_000_000 })!;
      const nota = lerNotaDeCompra(conteudo);
      if ("erro" in nota) throw new ErroFerramenta(nota.erro);
      return nota;
    },
  },

  propor_entrada_estoque: {
    descricao:
      "Prepara a entrada de uma nota de compra no estoque (e a atualização do preço dos insumos pelo valor da nota). NÃO grava: cria uma proposta que a pessoa precisa confirmar. itens = [{descricao, quantidade, unidade, valor_total?, insumo_id?}]. Devolve o que casou com o cadastro e o que ficou pendente (item não cadastrado ou unidade como CX/PCT que precisa de conversão — pergunte à pessoa e proponha de novo).",
    papeis: ESTOQUE,
    async executar(a, passe) {
      const itens: ItemNota[] = lista(a, "itens").map((i) => ({
        descricao: texto(i, "descricao", { obrigatorio: true })!,
        quantidade: numero(i, "quantidade", { obrigatorio: true })!,
        unidade: texto(i, "unidade") ?? "un",
        valorTotal: numero(i, "valor_total"),
        insumoId: texto(i, "insumo_id"),
      }));
      const { entrada, pendentes } = montarEntrada(itens, await listarInsumos());
      if (!entrada.length) return { proposta: null, pendentes, aviso: "Nenhum item pôde entrar ainda. Resolva os pendentes com a pessoa." };
      const fornecedor = texto(a, "fornecedor");
      const numeroNota = texto(a, "numero_nota");
      const dados: DadosEntrada = { itens: entrada, fornecedor, numeroNota, atualizarPrecos: a.atualizar_precos !== false && a.atualizar_precos !== "false" };
      const linhas = entrada.map((e) => `${e.quantidade} ${e.unidade} de ${e.insumoNome}${e.precoUnitarioNovo !== null ? ` (R$ ${e.precoUnitarioNovo.toFixed(2)}/${e.unidade})` : ""}`);
      const proposta = await criarProposta(passe, "entrada_estoque", `Entrada${numeroNota ? ` da nota ${numeroNota}` : ""}${fornecedor ? ` (${fornecedor})` : ""}: ${linhas.join("; ")}`, dados);
      return { proposta: { id: proposta.id, resumo: proposta.resumo }, itens: entrada, pendentes, instrucao: "Mostre o resumo e peça confirmação. Só chame confirmar_proposta depois de um 'sim' explícito." };
    },
  },

  propor_valores_nutricionais: {
    descricao: "Prepara a tabela nutricional de um insumo (lida do rótulo da embalagem). NÃO grava: cria proposta pra confirmar. Informe insumo_id (ou insumo = nome), base_gramas (porção do rótulo, ex. 100) e os valores: caloriasKcal, carboidratosG, acucaresTotaisG, acucaresAdicionadosG, proteinasG, gordurasTotaisG, gordurasSaturadasG, gordurasTransG, fibraAlimentarG, sodioMg.",
    papeis: GESTAO,
    async executar(a, passe) {
      const insumo = await acharInsumo(a);
      const baseGramas = numero(a, "base_gramas") ?? 100;
      if (!(baseGramas > 0)) throw new ErroFerramenta("base_gramas precisa ser maior que zero.");
      const valores: Partial<ValoresNutricionais> = {};
      for (const c of CAMPOS_NUTRICIONAIS) {
        const v = numero(a, c);
        if (v !== null) valores[c] = v;
      }
      if (!Object.keys(valores).length) throw new ErroFerramenta("Nenhum valor nutricional informado.");
      const dados: DadosNutricionais = { insumoId: insumo.id, insumoNome: insumo.nome, baseGramas, valores };
      const proposta = await criarProposta(passe, "valores_nutricionais", `Tabela nutricional de ${insumo.nome} por ${baseGramas} g: ${Object.entries(valores).map(([k, v]) => `${k} ${v}`).join(", ")}`, dados);
      return { proposta: { id: proposta.id, resumo: proposta.resumo }, instrucao: "Peça confirmação antes de chamar confirmar_proposta." };
    },
  },

  propor_pedido_compra: {
    descricao: `Prepara pedidos de compra (entram em "Pedidos da cozinha"). NÃO grava: cria proposta. itens = [{descricao, quantidade?, unidade? (${UNIDADES_PEDIDO.join(", ")}), categoria? (hortifruti, proteinas, secos, laticinios, outros), observacao?}].`,
    papeis: ESTOQUE,
    async executar(a, passe) {
      const insumos = await listarInsumos();
      const itens: DadosPedido["itens"] = lista(a, "itens", 30).map((i) => {
        const descricao = texto(i, "descricao", { obrigatorio: true, max: 80 })!;
        const casado = sugerirInsumos(descricao, insumos, 1)[0];
        const insumo = casado && casado.nota >= 0.6 ? insumos.find((x) => x.id === casado.id) : undefined;
        const categoria = (texto(i, "categoria") as CategoriaPedido | null) ?? (insumo ? categoriaDoInsumo(insumo.categoria) : "outros");
        if (!CATEGORIAS_PEDIDO.some((c) => c.id === categoria)) throw new ErroFerramenta(`Categoria "${categoria}" não existe.`);
        const unidade = texto(i, "unidade")?.toLowerCase() as UnidadePedido | undefined;
        if (unidade && !UNIDADES_PEDIDO.includes(unidade)) throw new ErroFerramenta(`Unidade "${unidade}" não existe nos pedidos.`);
        const quantidade = numero(i, "quantidade");
        return { categoria, insumoId: insumo?.id ?? null, descricao, quantidade: quantidade && quantidade > 0 ? quantidade : null, unidade: quantidade ? (unidade ?? null) : null, observacao: texto(i, "observacao", { max: 120 }) };
      });
      const proposta = await criarProposta(passe, "pedido_compra", `Pedido de compra: ${itens.map((i) => `${i.descricao}${i.quantidade ? ` ${i.quantidade}${i.unidade ? ` ${i.unidade}` : ""}` : ""}`).join("; ")}`, { itens } satisfies DadosPedido);
      return { proposta: { id: proposta.id, resumo: proposta.resumo }, instrucao: "Peça confirmação antes de chamar confirmar_proposta." };
    },
  },

  propor_perda: {
    descricao: "Prepara o registro de uma perda de insumo (vencido, estragou, caiu…), que baixa o estoque. NÃO grava: cria proposta. Informe insumo_id (ou insumo = nome), quantidade na unidade do insumo e motivo.",
    papeis: ESTOQUE,
    async executar(a, passe) {
      const insumo = await acharInsumo(a);
      const quantidade = numero(a, "quantidade", { obrigatorio: true })!;
      if (!(quantidade > 0)) throw new ErroFerramenta("Quantidade precisa ser maior que zero.");
      const motivo = texto(a, "motivo", { obrigatorio: true, max: 120 })!;
      const dados: DadosPerda = { insumoId: insumo.id, insumoNome: insumo.nome, quantidade, unidade: insumo.unidadeMedida, motivo };
      const proposta = await criarProposta(passe, "perda_estoque", `Perda de ${quantidade} ${insumo.unidadeMedida} de ${insumo.nome}: ${motivo}`, dados);
      return { proposta: { id: proposta.id, resumo: proposta.resumo }, instrucao: "Peça confirmação antes de chamar confirmar_proposta." };
    },
  },

  propor_lista_producao: {
    descricao: "Prepara itens na lista do que produzir (aparece embaixo do quadro de Produção no tablet). NÃO grava: cria proposta. data = hoje ou amanha; itens = [{receita (nome ou id), quantidade (na unidade de rendimento da ficha), observacao?}].",
    papeis: GESTAO,
    async executar(a, passe) {
      const qual = texto(a, "data") ?? "hoje";
      const data = qual === "amanha" || qual === "amanhã" ? hojeLocalISO(new Date(Date.now() + 86_400_000)) : hojeLocalISO();
      const itens: DadosListaProducao["itens"] = [];
      for (const i of lista(a, "itens", 30)) {
        const r = await acharReceita(texto(i, "receita", { obrigatorio: true })!);
        const quantidade = numero(i, "quantidade", { obrigatorio: true })!;
        if (!(quantidade > 0)) throw new ErroFerramenta("Quantidade precisa ser maior que zero.");
        itens.push({ receitaId: r.id, receitaNome: r.nomePrato, quantidade, unidade: r.unidadeRendimento, observacao: texto(i, "observacao", { max: 140 }) });
      }
      const proposta = await criarProposta(passe, "lista_producao", `Lista de produção de ${data}: ${itens.map((i) => `${i.quantidade} ${i.unidade} de ${i.receitaNome}`).join("; ")}`, { data, itens } satisfies DadosListaProducao);
      return { proposta: { id: proposta.id, resumo: proposta.resumo }, instrucao: "Peça confirmação antes de chamar confirmar_proposta." };
    },
  },

  propostas_pendentes: {
    descricao: "Propostas desta pessoa que ainda esperam confirmação (id e resumo).",
    papeis: ESTOQUE,
    async executar(_a, passe) {
      return (await listarPropostasPendentes(passe)).map((p) => ({ id: p.id, resumo: p.resumo, criada: p.criadoEm }));
    },
  },

  confirmar_proposta: {
    descricao: "Grava uma proposta DEPOIS que a pessoa disse 'sim' explicitamente para aquele resumo. Nunca chame sem confirmação.",
    papeis: ESTOQUE,
    async executar(a, passe) {
      return { resultado: await confirmarProposta(passe, texto(a, "proposta_id", { obrigatorio: true })!) };
    },
  },

  cancelar_proposta: {
    descricao: "Cancela uma proposta pendente (a pessoa desistiu ou quer corrigir). Nada é gravado.",
    papeis: ESTOQUE,
    async executar(a, passe) {
      return { resultado: await cancelarProposta(passe, texto(a, "proposta_id", { obrigatorio: true })!) };
    },
  },
};

/** Catálogo público (nomes, descrições e papéis) — sem dado de restaurante. */
/** Ferramentas que ESTE papel pode usar, em texto pro prompt do agente (o n8n
 * recebe junto com cada mensagem; criar ferramenta nova não mexe no n8n). */
export function catalogoDoPapel(papel: Papel): string {
  return Object.entries(FERRAMENTAS)
    .filter(([, f]) => f.papeis.includes(papel))
    .map(([nome, f]) => `- ${nome}: ${f.descricao}`)
    .join("\n");
}

export function catalogo() {
  return Object.entries(FERRAMENTAS).map(([nome, f]) => ({ nome, descricao: f.descricao, papeis: f.papeis }));
}
