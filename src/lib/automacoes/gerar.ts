// AVISOS NO WHATSAPP (2026-10-02): monta os avisos que estão na hora e põe na
// caixa de saída (tabela avisos). Roda no servidor, chamado pelo n8n
// (/api/automacoes/pendentes) a cada poucos minutos.
//
// Usa a service role (não há usuário logado: é o relógio que chama), então
// TODA consulta aqui filtra por restaurante explicitamente. Só vai pra quem
// é dono ou gestor ativo com o WhatsApp verificado no agente.
// A chave única da tabela faz o mesmo aviso não sair duas vezes, mesmo que
// isto rode várias vezes no mesmo minuto.
//
// AVISOS PRA GESTÃO (2026-10-02): insumo abaixo do mínimo, fornecedor (pedido
// fechando, preço subiu, carne rendendo menos), equipe, desperdício e vendas.
// Os avisos "em lote" juntam o que é novo num aviso só e guardam os itens em
// avisos.detalhe; item já avisado não volta. Temperatura saiu (nutricionista).

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inicioDoDiaISO, hojeLocalISO } from "@/lib/calculo/dia";
import { agoraNoRestaurante, categoriaDoInsumo, frasePrazo, pedidosDaCategoria, proximoPedido, type AgendaFornecedor, type CategoriaPedido } from "@/lib/dominio/requisicao";
import type { Categoria } from "@/lib/dominio/insumo";
import { paraConfig, type LinhaConfig } from "@/lib/dados/escalas";
import { paraMotor, type PessoaEscala } from "@/lib/escalas/cadastro";
import { gerarEscala, REGRAS_PADRAO } from "@/lib/escalas/motor";
import { PERFIL_VAZIO } from "@/lib/escalas/perfil";
import type { Ocorrencia, RegrasEscala, Setor } from "@/lib/escalas/tipos";
import {
  JANELA_MIN,
  LIMITES,
  TIPOS_EM_LOTE,
  cmvDoFechamento,
  configDaLinha,
  emMinutos,
  itensNovos,
  minutoLocal,
  naJanela,
  noSilencio,
  textoChecklistAbertura,
  textoComprasPrazo,
  textoDesperdicio,
  textoEquipe,
  textoEstoqueBaixo,
  textoPrecoSubiu,
  textoRendimentoBaixo,
  textoResumo,
  textoVendas,
  type ConfigAvisos,
  type TipoAviso,
  type TipoEmLote,
} from "./avisos";

interface Destinatario {
  userId: string;
  telefone: string;
}

export interface NovoAviso {
  cliente_id: string;
  tipo: TipoAviso;
  chave: string;
  user_id: string;
  telefone: string;
  texto: string;
  detalhe: { itens: string[] } | null;
}

type Linha = Record<string, unknown>;

function agrupar<T>(itens: T[], chave: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of itens) m.set(chave(i), [...(m.get(chave(i)) ?? []), i]);
  return m;
}

async function ler<T = Linha>(consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/** Chave do aviso em lote: a mesma lista de itens dá a mesma chave (dois disparos juntos não duplicam). */
function chaveDoLote(itens: string[]): string {
  return createHash("sha256").update([...itens].sort().join("|")).digest("hex").slice(0, 32);
}

const horasAtras = (agora: Date, h: number) => new Date(agora.getTime() - h * 3_600_000).toISOString();
const somarDias = (data: string, n: number) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Monta os avisos do momento (sem gravar). Separado de gravar pra testar. */
export async function montarAvisos(admin: SupabaseClient, app: string, agora = new Date()): Promise<NovoAviso[]> {
  // 1. Quem recebe: WhatsApp verificado + dono/gestor ativo.
  const zaps = await ler<{ cliente_id: string; user_id: string; telefone: string }>(
    admin.from("agente_whatsapp").select("cliente_id, user_id, telefone").not("verificado_em", "is", null),
  );
  if (!zaps.length) return [];
  const membros = await ler<{ cliente_id: string; user_id: string }>(
    admin.from("membros").select("cliente_id, user_id").in("user_id", zaps.map((z) => z.user_id)).eq("ativo", true).in("papel", ["dono", "gestor"]),
  );
  const pode = new Set(membros.map((m) => `${m.cliente_id}:${m.user_id}`));
  const destinatarios = new Map<string, Destinatario[]>();
  for (const z of zaps) {
    if (!pode.has(`${z.cliente_id}:${z.user_id}`)) continue;
    destinatarios.set(z.cliente_id, [...(destinatarios.get(z.cliente_id) ?? []), { userId: z.user_id, telefone: z.telefone }]);
  }
  const ids = [...destinatarios.keys()];
  if (!ids.length) return [];

  const [configs, restaurantes] = await Promise.all([
    ler(admin.from("avisos_config").select("*").in("cliente_id", ids)),
    ler<{ id: string; nome_restaurante: string }>(admin.from("clientes").select("id, nome_restaurante").in("id", ids)),
  ]);
  const cfgDe = new Map(ids.map((id) => [id, configDaLinha(configs.find((c) => c.cliente_id === id))]));
  const nomeDe = (id: string) => restaurantes.find((r) => r.id === id)?.nome_restaurante ?? "";

  const minuto = minutoLocal(agora);
  const relogio = agoraNoRestaurante(agora);
  const hoje = hojeLocalISO(agora);
  const inicioHoje = inicioDoDiaISO(agora);
  const inicioOntem = inicioDoDiaISO(new Date(Date.parse(inicioHoje) - 60 * 60 * 1000));
  const ontem = hojeLocalISO(new Date(inicioOntem));

  // Quem quer cada aviso agora (ligado e fora do silêncio).
  const quer = (pred: (c: ConfigAvisos) => boolean) =>
    ids.filter((id) => {
      const c = cfgDe.get(id)!;
      return pred(c) && !noSilencio(minuto, c);
    });
  const comEstoque = quer((c) => c.estoqueBaixo);
  const comFornecedor = quer((c) => c.fornecedor);
  const comEquipe = quer((c) => c.equipe && minuto >= emMinutos(c.equipeHora));
  const comDesperdicio = quer((c) => c.desperdicio);
  const comVendas = quer((c) => c.vendas);
  const comChecklist = quer((c) => c.checklistAbertura && naJanela(minuto, c.checklistAberturaAte, JANELA_MIN.checklist_abertura));
  const comResumo = quer((c) => c.resumoDiario && naJanela(minuto, c.resumoHora, JANELA_MIN.resumo_diario));

  const novos: NovoAviso[] = [];
  const paraTodos = (cliente: string, tipo: TipoAviso, chave: string, texto: string, itens: string[] | null = null) => {
    for (const d of destinatarios.get(cliente) ?? [])
      novos.push({ cliente_id: cliente, tipo, chave, user_id: d.userId, telefone: d.telefone, texto, detalhe: itens ? { itens } : null });
  };

  // Itens já avisados (avisos em lote dos últimos dias), por restaurante e tipo.
  const emLote = [...new Set([...comEstoque, ...comFornecedor, ...comEquipe, ...comDesperdicio])];
  const jaAvisados = new Map<string, Set<string>>();
  if (emLote.length) {
    const anteriores = await ler<{ cliente_id: string; tipo: string; detalhe: { itens?: string[] } | null }>(
      admin
        .from("avisos")
        .select("cliente_id, tipo, detalhe")
        .in("cliente_id", emLote)
        .in("tipo", [...TIPOS_EM_LOTE])
        .gte("criado_em", horasAtras(agora, LIMITES.lembraDias * 24)),
    );
    for (const a of anteriores) {
      const k = `${a.cliente_id}|${a.tipo}`;
      const s = jaAvisados.get(k) ?? new Set<string>();
      for (const i of a.detalhe?.itens ?? []) s.add(i);
      jaAvisados.set(k, s);
    }
  }
  /** Avisa só o que é novo; nada novo, nada sai. */
  const lote = <T extends { chave: string }>(cliente: string, tipo: TipoEmLote, itens: T[], texto: (novos: T[]) => string) => {
    const frescos = itensNovos(itens, jaAvisados.get(`${cliente}|${tipo}`) ?? new Set());
    if (!frescos.length) return;
    const chaves = frescos.map((i) => i.chave);
    paraTodos(cliente, tipo, chaveDoLote(chaves), texto(frescos), chaves);
  };

  // 2. Agenda dos fornecedores (prazo do pedido, sugestão no estoque baixo).
  const precisaAgenda = [...new Set([...comEstoque, ...comFornecedor])];
  const fornecedores = precisaAgenda.length
    ? await ler<{ cliente_id: string; empresa: string; entrega_dias: number[]; pedido_ate: string | null; pedido_antecedencia: number; categorias_pedido: CategoriaPedido[] }>(
        admin.from("fornecedores").select("cliente_id, empresa, entrega_dias, pedido_ate, pedido_antecedencia, categorias_pedido").in("cliente_id", precisaAgenda),
      )
    : [];
  const agendaDe = (cliente: string): AgendaFornecedor[] =>
    fornecedores
      .filter((f) => f.cliente_id === cliente)
      .map((f) => ({ empresa: f.empresa, categorias: f.categorias_pedido ?? [], diasEntrega: f.entrega_dias ?? [], pedidoAte: f.pedido_ate, antecedencia: f.pedido_antecedencia }));

  // 3. Insumos abaixo do mínimo (aviso e resumo). Um aviso por insumo a cada
  //    vez que ele cai: a última entrada (compra) entra na chave do item.
  const precisaEstoque = [...new Set([...comEstoque, ...comResumo])];
  const estoque = precisaEstoque.length
    ? (
        await ler<{ insumo_id: string; saldo_atual: number; estoque_minimo: number; insumos: { cliente_id: string; nome: string; unidade_medida: string; categoria: Categoria } }>(
          admin
            .from("estoque")
            .select("insumo_id, saldo_atual, estoque_minimo, insumos!inner(cliente_id, nome, unidade_medida, categoria)")
            .in("insumos.cliente_id", precisaEstoque)
            .gt("estoque_minimo", 0),
        )
      ).filter((e) => Number(e.saldo_atual) < Number(e.estoque_minimo))
    : [];
  const baixosAvisar = estoque.filter((e) => comEstoque.includes(e.insumos.cliente_id));
  if (baixosAvisar.length) {
    const entradas = await ler<{ insumo_id: string; criado_em: string }>(
      admin
        .from("movimentacoes_estoque")
        .select("insumo_id, criado_em")
        .in("insumo_id", baixosAvisar.map((e) => e.insumo_id))
        .eq("tipo", "entrada")
        .gte("criado_em", horasAtras(agora, LIMITES.lembraDias * 24))
        .order("criado_em", { ascending: false }),
    );
    const ultimaEntrada = new Map<string, string>();
    for (const m of entradas) if (!ultimaEntrada.has(m.insumo_id)) ultimaEntrada.set(m.insumo_id, m.criado_em);
    for (const [cliente, linhas] of agrupar(baixosAvisar, (e) => e.insumos.cliente_id)) {
      const agenda = agendaDe(cliente);
      const itens = linhas
        .sort((a, b) => a.insumos.nome.localeCompare(b.insumos.nome, "pt-BR"))
        .map((e) => {
          const p = pedidosDaCategoria(agenda, categoriaDoInsumo(e.insumos.categoria), relogio)[0];
          return {
            chave: `${e.insumo_id}:${ultimaEntrada.get(e.insumo_id) ?? "-"}`,
            nome: e.insumos.nome,
            saldo: Number(e.saldo_atual),
            minimo: Number(e.estoque_minimo),
            unidade: e.insumos.unidade_medida,
            prazo: p ? `${p.empresa}: ${frasePrazo(p, relogio).replace(/^Peça/, "peça")}` : null,
          };
        });
      lote(cliente, "estoque_baixo", itens, (n) => textoEstoqueBaixo({ restaurante: nomeDe(cliente), itens: n, app }));
    }
  }

  // 4. Fornecedor: pedido fechando com pedido da cozinha esperando, preço que
  //    subiu e carne rendendo menos que a ficha.
  if (comFornecedor.length) {
    const [pendentes, precos, processamentos] = await Promise.all([
      ler<{ cliente_id: string; categoria: CategoriaPedido; descricao: string }>(
        admin.from("requisicoes").select("cliente_id, categoria, descricao").in("cliente_id", comFornecedor).eq("status", "pendente").order("criado_em"),
      ),
      ler<{ id: string; preco_anterior: number; preco_novo: number; insumos: { cliente_id: string; nome: string; unidade_medida: string } }>(
        admin
          .from("historico_preco_insumo")
          .select("id, preco_anterior, preco_novo, insumos!inner(cliente_id, nome, unidade_medida)")
          .in("insumos.cliente_id", comFornecedor)
          .gte("alterado_em", horasAtras(agora, LIMITES.recenteHoras.preco_subiu))
          .order("alterado_em"),
      ),
      ler<{ id: string; fornecedor: string | null; fc_observado: number | null; insumos: { cliente_id: string; nome: string; fator_correcao: number | null } }>(
        admin
          .from("processamentos_proteina")
          .select("id, fornecedor, fc_observado, insumos!inner(cliente_id, nome, fator_correcao)")
          .in("insumos.cliente_id", comFornecedor)
          .gte("processado_em", horasAtras(agora, LIMITES.recenteHoras.rendimento_baixo))
          .order("processado_em"),
      ),
    ]);

    for (const cliente of comFornecedor) {
      const pedidos = pendentes.filter((p) => p.cliente_id === cliente);
      if (pedidos.length) {
        for (const f of agendaDe(cliente)) {
          const p = proximoPedido(f, relogio);
          if (!p || p.minutosRestantes > LIMITES.prazoPedidoMin) continue;
          const esperando = pedidos.filter((r) => f.categorias.includes(r.categoria)).map((r) => r.descricao);
          if (!esperando.length) continue;
          const item = { chave: `${f.empresa}:${p.prazoData}:${p.prazoHora ?? "dia"}` };
          lote(cliente, "compras_prazo", [item], () =>
            textoComprasPrazo({ restaurante: nomeDe(cliente), empresa: f.empresa, minutosRestantes: p.minutosRestantes, frase: frasePrazo(p, relogio), pedidos: esperando, app }),
          );
        }
      }

      const subiram = precos
        .filter((h) => h.insumos.cliente_id === cliente && Number(h.preco_anterior) > 0 && Number(h.preco_novo) >= Number(h.preco_anterior) * (1 + LIMITES.precoSubiu))
        .map((h) => ({ chave: h.id, nome: h.insumos.nome, antes: Number(h.preco_anterior), depois: Number(h.preco_novo), unidade: h.insumos.unidade_medida }));
      lote(cliente, "preco_subiu", subiram, (n) => textoPrecoSubiu({ restaurante: nomeDe(cliente), itens: n, app }));

      const renderamMenos = processamentos
        .filter((p) => {
          const fc = Number(p.insumos.fator_correcao);
          return p.insumos.cliente_id === cliente && fc > 0 && Number(p.fc_observado) > fc * (1 + LIMITES.rendimentoPior);
        })
        .map((p) => ({ chave: p.id, nome: p.insumos.nome, fornecedor: p.fornecedor, rendeu: 1 / Number(p.fc_observado), esperado: 1 / Number(p.insumos.fator_correcao) }));
      lote(cliente, "rendimento_baixo", renderamMenos, (n) => textoRendimentoBaixo({ restaurante: nomeDe(cliente), itens: n, app }));
    }
  }

  // 5. Equipe: falta/atestado e equipe abaixo do mínimo, hoje e amanhã (motor da escala).
  if (comEquipe.length) {
    const amanha = somarDias(hoje, 1);
    const [funcs, escalas, regras, ocs] = await Promise.all([
      ler<{ id: string; cliente_id: string; nome: string; setor: Setor | null; cargo: string | null; admitido_em: string | null; desligado_em: string | null }>(
        admin.from("funcionarios").select("id, cliente_id, nome, setor, cargo, admitido_em, desligado_em").in("cliente_id", comEquipe).eq("ativo", true),
      ),
      ler<LinhaConfig & { cliente_id: string }>(
        admin
          .from("escalas_config")
          .select("cliente_id, funcionario_id, tipo, ancora, folgas_preferidas, intervalo_domingo_semanas, turno_inicio, turno_fim")
          .in("cliente_id", comEquipe),
      ),
      ler<{ cliente_id: string; intervalo_domingo_semanas: number; cobertura_minima: Record<string, number> | null }>(
        admin.from("escalas_regras").select("cliente_id, intervalo_domingo_semanas, cobertura_minima").in("cliente_id", comEquipe),
      ),
      ler<{ id: string; cliente_id: string; funcionario_id: string; tipo: Ocorrencia["tipo"]; inicio: string; fim: string; restricoes: Ocorrencia["restricoes"] | null }>(
        admin.from("prontuario_ocorrencias").select("id, cliente_id, funcionario_id, tipo, inicio, fim, restricoes").in("cliente_id", comEquipe).gte("fim", somarDias(hoje, -60)),
      ),
    ]);
    const configDe = new Map(escalas.map((c) => [c.funcionario_id, paraConfig(c)]));
    for (const cliente of comEquipe) {
      const pessoas: PessoaEscala[] = funcs
        .filter((f) => f.cliente_id === cliente)
        .map((f) => ({
          id: f.id,
          nome: f.nome,
          setor: f.setor,
          cargo: f.cargo,
          admissao: f.admitido_em,
          desligamento: f.desligado_em,
          escala: configDe.get(f.id) ?? null,
          perfil: PERFIL_VAZIO,
        }));
      const equipe = paraMotor(pessoas);
      if (!equipe.length) continue;
      const r = regras.find((x) => x.cliente_id === cliente);
      const regrasCasa: RegrasEscala = r ? { intervaloDomingoSemanas: r.intervalo_domingo_semanas, coberturaMinima: r.cobertura_minima ?? {} } : REGRAS_PADRAO;
      const ocorrencias: Ocorrencia[] = ocs
        .filter((o) => o.cliente_id === cliente)
        .map((o) => ({ id: o.id, funcionarioId: o.funcionario_id, tipo: o.tipo, inicio: o.inicio, fim: o.fim, restricoes: o.restricoes ?? [] }));
      const { alertas } = gerarEscala({ funcionarios: equipe, ocorrencias, regras: regrasCasa, inicio: hoje, fim: amanha });
      const itens = alertas
        .filter((a) => (a.tipo === "contingencia" || a.tipo === "cobertura") && a.data && a.data >= hoje && a.data <= amanha)
        .sort((a, b) => (a.data! < b.data! ? -1 : a.data! > b.data! ? 1 : 0))
        .map((a) => ({
          chave: a.tipo === "contingencia" ? `falta:${a.funcionarioId}:${a.data}` : `cobertura:${a.equipe}:${a.data}:${a.faltam}`,
          linha: a.mensagem,
        }));
      lote(cliente, "equipe", itens, (n) => textoEquipe({ restaurante: nomeDe(cliente), alertas: n.map((i) => i.linha), app }));
    }
  }

  // 6. Desperdício: produção marcada como perda.
  if (comDesperdicio.length) {
    const perdas = await ler<{ id: string; cliente_id: string; quantidade: number; responsavel: string; motivo_perda: string | null; receitas: { nome_prato: string; unidade_rendimento: string } | null }>(
      admin
        .from("producoes")
        .select("id, cliente_id, quantidade, responsavel, motivo_perda, receitas(nome_prato, unidade_rendimento)")
        .in("cliente_id", comDesperdicio)
        .eq("status", "perda")
        .gte("criado_em", horasAtras(agora, LIMITES.recenteHoras.desperdicio))
        .order("criado_em"),
    );
    for (const [cliente, linhas] of agrupar(perdas, (p) => p.cliente_id)) {
      const itens = linhas.map((p) => ({
        chave: p.id,
        receita: p.receitas?.nome_prato ?? "Produção",
        quantidade: Number(p.quantidade),
        unidade: p.receitas?.unidade_rendimento ?? "porção",
        motivo: p.motivo_perda ?? "sem motivo",
        responsavel: p.responsavel,
      }));
      lote(cliente, "desperdicio", itens, (n) => textoDesperdicio({ restaurante: nomeDe(cliente), itens: n, app }));
    }
  }

  // 7. Vendas: fechamento de CMV recém-fechado (faturamento, CMV, mais vendidos).
  if (comVendas.length) {
    const fechamentos = await ler<{ id: string; cliente_id: string; periodo_inicio: string; periodo_fim: string; estoque_inicial: number; compras: number; estoque_final: number; faturamento: number }>(
      admin
        .from("fechamentos_cmv")
        .select("id, cliente_id, periodo_inicio, periodo_fim, estoque_inicial, compras, estoque_final, faturamento")
        .in("cliente_id", comVendas)
        .gte("fechado_em", horasAtras(agora, LIMITES.recenteHoras.vendas)),
    );
    const vendas = fechamentos.length
      ? await ler<{ fechamento_id: string; quantidade: number; receitas: { nome_prato: string } | null }>(
          admin.from("vendas_periodo").select("fechamento_id, quantidade, receitas(nome_prato)").in("fechamento_id", fechamentos.map((f) => f.id)),
        )
      : [];
    for (const f of fechamentos) {
      const porPrato = new Map<string, number>();
      for (const v of vendas.filter((x) => x.fechamento_id === f.id)) {
        const nome = v.receitas?.nome_prato ?? "Prato";
        porPrato.set(nome, (porPrato.get(nome) ?? 0) + Number(v.quantidade));
      }
      const maisVendidos = [...porPrato]
        .filter(([, q]) => q > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nome, quantidade]) => ({ nome, quantidade }));
      paraTodos(
        f.cliente_id,
        "vendas",
        f.id,
        textoVendas({
          restaurante: nomeDe(f.cliente_id),
          inicio: f.periodo_inicio,
          fim: f.periodo_fim,
          faturamento: Number(f.faturamento),
          cmv: cmvDoFechamento({ estoqueInicial: Number(f.estoque_inicial), compras: Number(f.compras), estoqueFinal: Number(f.estoque_final) }),
          maisVendidos,
          app,
        }),
      );
    }
  }

  // 8. Checklists: abertura de hoje (atrasada) e todos de ontem (resumo).
  const precisaChecklists = [...new Set([...comChecklist, ...comResumo])];
  if (precisaChecklists.length) {
    const checklists = await ler<{ id: string; cliente_id: string; nome: string; momento: string }>(
      admin.from("checklists").select("id, cliente_id, nome, momento").in("cliente_id", precisaChecklists),
    );
    const itens = checklists.length
      ? await ler<{ id: string; checklist_id: string }>(admin.from("checklist_itens").select("id, checklist_id").in("checklist_id", checklists.map((c) => c.id)))
      : [];
    const execucoes = itens.length
      ? await ler<{ checklist_item_id: string; concluido_em: string }>(
          admin.from("checklist_execucoes").select("checklist_item_id, concluido_em").in("checklist_item_id", itens.map((i) => i.id)).gte("concluido_em", inicioOntem),
        )
      : [];
    const feitosHoje = new Set(execucoes.filter((e) => e.concluido_em >= inicioHoje).map((e) => e.checklist_item_id));
    const feitosOntem = new Set(execucoes.filter((e) => e.concluido_em < inicioHoje).map((e) => e.checklist_item_id));
    const itensDe = agrupar(itens, (i) => i.checklist_id);

    for (const cliente of comChecklist) {
      const pendentes = checklists
        .filter((c) => c.cliente_id === cliente && c.momento === "abertura")
        .map((c) => {
          const lista = itensDe.get(c.id) ?? [];
          return { nome: c.nome, total: lista.length, feitos: lista.filter((i) => feitosHoje.has(i.id)).length };
        })
        .filter((p) => p.total > 0 && p.feitos < p.total);
      if (pendentes.length) {
        paraTodos(cliente, "checklist_abertura", hoje, textoChecklistAbertura({ restaurante: nomeDe(cliente), limite: cfgDe.get(cliente)!.checklistAberturaAte, pendentes, app }));
      }
    }

    // 9. Resumo de ontem.
    if (comResumo.length) {
      const [producoes, pedidos] = await Promise.all([
        ler<{ cliente_id: string; status: string; motivo_perda: string | null; receitas: { nome_prato: string } | null }>(
          admin.from("producoes").select("cliente_id, status, motivo_perda, receitas(nome_prato)").in("cliente_id", comResumo).gte("criado_em", inicioOntem).lt("criado_em", inicioHoje),
        ),
        ler<{ cliente_id: string }>(admin.from("requisicoes").select("cliente_id").in("cliente_id", comResumo).eq("status", "pendente")),
      ]);
      for (const cliente of comResumo) {
        const prods = producoes.filter((p) => p.cliente_id === cliente);
        const itensCliente = checklists.filter((c) => c.cliente_id === cliente).flatMap((c) => itensDe.get(c.id) ?? []);
        paraTodos(
          cliente,
          "resumo_diario",
          hoje,
          textoResumo({
            restaurante: nomeDe(cliente),
            data: ontem,
            produzidas: prods.filter((p) => p.status === "produzido").length,
            perdas: prods.filter((p) => p.status === "perda").map((p) => ({ receita: p.receitas?.nome_prato ?? "Produção", motivo: p.motivo_perda ?? "sem motivo" })),
            checklist: { total: itensCliente.length, feitos: itensCliente.filter((i) => feitosOntem.has(i.id)).length },
            pedidosPendentes: pedidos.filter((p) => p.cliente_id === cliente).length,
            insumosAbaixo: estoque.filter((e) => e.insumos.cliente_id === cliente).length,
            app,
          }),
        );
      }
    }
  }

  return novos;
}

/** Põe na caixa de saída; o que já existe (mesma chave) é ignorado. Devolve quantos eram novos. */
export async function gravarAvisos(admin: SupabaseClient, avisos: NovoAviso[]): Promise<number> {
  if (!avisos.length) return 0;
  const { data, error } = await admin
    .from("avisos")
    .upsert(avisos, { onConflict: "cliente_id,tipo,chave,user_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
