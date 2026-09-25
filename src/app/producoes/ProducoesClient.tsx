"use client";

// SISTEMA premium (escala do DESIGN.md): "Capacidade por prato" e título do modal de perda de 18px black para 16px semibold. Reverter: git revert do commit "polimento(sistema): tamanhos e cores na escala".

// SISTEMA premium (2026-09-22): botões de etapa tingidos, colunas com canto 12px e
// topo de 3px, título no padrão das outras telas. Versão anterior:
// `git show 4f29ec6:src/app/producoes/ProducoesClient.tsx`.
// POLIMENTO producoes (2026-09-22) -- elevação da tela com o Impeccable, pensada
// pro chef no tablet da bancada (PRODUCT.md). Cada mudança marcada com
// "POLIMENTO producoes" diz como era antes. Versão anterior: commit e5e84b8
// (as correções de lógica de estoque daquele commit continuam valendo).
// Desfazer só esta tela: git revert do commit "polimento(producoes)";
// ou: git checkout 3f0b207 -- src/app/producoes/ProducoesClient.tsx
// Registro geral: docs/POLIMENTO.md

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Play, Check, Trash2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { nums, shadow } from "@/components/ficha/tema";
import { NovaProducaoForm } from "@/components/producoes/NovaProducaoForm";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Producao, StatusProducao, Turno, TipoItemProducao } from "@/lib/dominio/producao";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Movimentacao, EstoqueLinha } from "@/lib/dominio/estoque";
import { calcularCapacidadeProducao, linhasCapacidadeDaReceita, type SaldoEstoque } from "@/lib/calculo/capacidadeProducao";
import { consumoDeInsumosDaProducao } from "@/lib/calculo/consumoProducao";
import { movimentacoes as fixturesMovimentacoes } from "@/app/preview/fixtures";
import { acaoIniciarProducao, acaoAtualizarStatusProducao } from "./actions";

type ColunaId = "estoque" | "em_producao" | "produzido" | "perda";

interface CardEstoque {
  receitaId: string;
  tipo: TipoItemProducao;
  nome: string;
  rendimentoLabel: string;
  lotes: number;
  gargalo: string | null;
}

function transicaoValida(origem: ColunaId, destino: ColunaId): boolean {
  if (origem === destino) return false;
  if (origem === "estoque") return destino === "em_producao";
  if (origem === "em_producao") return destino === "produzido" || destino === "perda";
  if (origem === "produzido") return destino === "perda";
  return false;
}

// POLIMENTO producoes: plural da unidade de rendimento. Antes aparecia "15 porção".
function unidadeNoPlural(qtd: number, unidade: string): string {
  if (qtd === 1) return unidade;
  if (unidade.endsWith("ção")) return unidade.slice(0, -3) + "ções";
  if (/^(kg|g|l|ml|un)$/i.test(unidade) || unidade.endsWith("s")) return unidade;
  return /[aeiou]$/i.test(unidade) ? unidade + "s" : unidade;
}

// POLIMENTO producoes: validade em dd/mm quando vier como data ISO ("2026-09-14");
// texto livre ("7 dias") passa como está. Antes aparecia o ISO cru.
function validadeLegivel(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}` : v;
}

// POLIMENTO producoes: tints sobre os tokens do tema.
const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

export function ProducoesClient({
  insumos,
  receitas,
  producoes,
  turnos,
  processamentos,
  isDemo,
}: {
  insumos: Insumo[];
  receitas: Receita[];
  producoes: Producao[];
  turnos: Turno[];
  processamentos: Processamento[];
  isDemo?: boolean;
}) {
  const pathname = usePathname();
  const emModoDemo = isDemo || pathname?.startsWith("/preview");

  const saldosDoServidor = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of insumos) {
      if (i.estoque) mapa.set(i.id, i.estoque.saldoAtual);
    }
    return mapa;
  }, [insumos]);

  // Estado local só alimenta a demo (/preview, sem banco). Fora dela o quadro
  // e os saldos vêm das props, que o servidor atualiza quando a server action
  // revalida a rota -- um useState inicializado das props ficaria congelado.
  const [producoesDemo, setListaProducoes] = useState<Producao[]>(producoes);
  const [saldosDemo, setSaldosMap] = useState<Map<string, number>>(saldosDoServidor);
  const listaProducoes = emModoDemo ? producoesDemo : producoes;
  const saldosMap = emModoDemo ? saldosDemo : saldosDoServidor;

  // Carregar dados salvos em preview para persistência imediata
  useEffect(() => {
    if (!emModoDemo) return;

    const carregarDemo = () => {
      try {
        const salvo = localStorage.getItem("demo_producoes");
        if (salvo) {
          const parsed = JSON.parse(salvo);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListaProducoes(parsed);
          }
        }
        const salvoEst = localStorage.getItem("demo_estoque");
        if (salvoEst) {
          const parsedEst = JSON.parse(salvoEst);
          if (Array.isArray(parsedEst) && parsedEst.length > 0) {
            setSaldosMap((prev) => {
              const novo = new Map(prev);
              for (const item of parsedEst) {
                if (item.insumoId && typeof item.saldoAtual === "number") {
                  novo.set(item.insumoId, item.saldoAtual);
                }
              }
              return novo;
            });
          }
        }
      } catch {}
    };

    carregarDemo();

    const escutarStorage = (e: StorageEvent) => {
      // DEMO (2026-09-25): key nula = "Recomeçar a demonstração" (limparDemo).
      if (!e.key || e.key === "demo_producoes" || e.key === "demo_estoque") {
        carregarDemo();
      }
    };
    window.addEventListener("storage", escutarStorage);
    return () => window.removeEventListener("storage", escutarStorage);
  }, [emModoDemo]);

  const atualizarProducoes = (novas: Producao[] | ((prev: Producao[]) => Producao[])) => {
    setListaProducoes((prev) => {
      const atualizado = typeof novas === "function" ? novas(prev) : novas;
      if (emModoDemo) {
        try {
          localStorage.setItem("demo_producoes", JSON.stringify(atualizado));
        } catch {}
      }
      return atualizado;
    });
  };

  const [turnoId, setTurnoId] = useState<string | null>(turnos[0]?.id ?? null);
  const [chefeTurno, setChefeTurno] = useState("");
  const [showNovaProducao, setShowNovaProducao] = useState(false);
  const [loteArrastando, setLoteArrastando] = useState<{ colunaOrigem: ColunaId; item: CardEstoque | Producao } | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<ColunaId | null>(null);
  const [modalPerda, setModalPerda] = useState<{ loteId: string; motivo: string } | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const preparos = receitas.filter((r) => r.tipo === "preparo_base");
  const pratos = receitas.filter((r) => r.tipo === "prato_final");

  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const saldosPorInsumoId = useMemo(() => {
    const mapa = new Map<string, SaldoEstoque>();
    for (const [id, saldo] of saldosMap.entries()) {
      mapa.set(id, { insumoId: id, saldoAtual: saldo });
    }
    return mapa;
  }, [saldosMap]);

  const capacidadePratos = useMemo(
    () =>
      pratos.map((p) => {
        const linhasInsumo = linhasCapacidadeDaReceita(p, insumoPorId, processamentos);
        const resultado = calcularCapacidadeProducao(linhasInsumo, saldosPorInsumoId);
        const semRastreioNomes: string[] = [];
        for (const id of resultado.insumosForaDoCalculo) {
          const nome = insumoPorId.get(id)?.nome;
          if (nome) semRastreioNomes.push(nome);
        }
        return {
          receita: p,
          porcoesPossiveis: resultado.porcoesPossiveis,
          nomeGargalo: resultado.insumoGargalo ? (insumoPorId.get(resultado.insumoGargalo)?.nome ?? null) : null,
          semRastreio: semRastreioNomes.length,
        };
      }),
    [pratos, insumoPorId, saldosPorInsumoId, processamentos],
  );

  const capacidadePreparos = useMemo(
    () =>
      preparos.map((prep) => {
        const linhasInsumo = linhasCapacidadeDaReceita(prep, insumoPorId, processamentos);
        const resultado = calcularCapacidadeProducao(linhasInsumo, saldosPorInsumoId);
        return {
          receita: prep,
          lotesPossiveis: resultado.porcoesPossiveis,
          nomeGargalo: resultado.insumoGargalo ? (insumoPorId.get(resultado.insumoGargalo)?.nome ?? null) : null,
        };
      }),
    [preparos, insumoPorId, saldosPorInsumoId, processamentos],
  );

  const disponivelProduzir: CardEstoque[] = useMemo(
    () => [
      ...capacidadePreparos
        .filter((c) => c.lotesPossiveis !== null && c.lotesPossiveis > 0)
        .map((c) => ({
          receitaId: c.receita.id,
          tipo: "preparo" as const,
          nome: c.receita.nomePrato,
          rendimentoLabel: `${c.receita.rendimento} ${c.receita.unidadeRendimento} por lote`,
          lotes: c.lotesPossiveis as number,
          gargalo: c.nomeGargalo,
        })),
      ...capacidadePratos
        .filter((c) => c.porcoesPossiveis !== null && Math.floor(c.porcoesPossiveis / c.receita.rendimento) > 0)
        .map((c) => ({
          receitaId: c.receita.id,
          tipo: "prato" as const,
          nome: c.receita.nomePrato,
          rendimentoLabel: `${c.receita.rendimento} porç${c.receita.rendimento > 1 ? "ões" : "ão"} por receita`,
          lotes: Math.floor((c.porcoesPossiveis as number) / c.receita.rendimento),
          gargalo: c.nomeGargalo,
        })),
    ],
    [capacidadePreparos, capacidadePratos],
  );

  const receitaPorId = useMemo(() => new Map(receitas.map((r) => [r.id, r])), [receitas]);

  const colunas: { id: ColunaId; titulo: string; desc: string }[] = [
    { id: "estoque", titulo: "Em estoque", desc: "lotes que dá pra produzir" },
    { id: "em_producao", titulo: "Em produção", desc: "pegos pela cozinha agora" },
    { id: "produzido", titulo: "Produzido", desc: "pronto pra uso ou venda" },
    { id: "perda", titulo: "Perdas", desc: "lote descartado" },
  ];

  // POLIMENTO producoes: cor de cada etapa vem dos tokens --etapa-* (globals.css,
  // DESIGN.md "The Stage Color Rule"). Antes: hex fixos aqui (#2563EB, #D97706,
  // #059669, #DC2626), iguais nos dois temas -- o texto azul-escuro sumia no escuro.
  const estiloDaEtapa = (etapa: "estoque" | "producao" | "produzido" | "perda") => {
    const cor = `var(--etapa-${etapa})`;
    return {
      cor,
      corTexto: `var(--etapa-${etapa}-texto)`,
      fundoColuna: tint(cor, 5),
      fundoBadge: tint(cor, 14),
      borda: tint(cor, 26),
    };
  };
  const estilosColunas: Record<ColunaId, ReturnType<typeof estiloDaEtapa>> = {
    estoque: estiloDaEtapa("estoque"),
    em_producao: estiloDaEtapa("producao"),
    produzido: estiloDaEtapa("produzido"),
    perda: estiloDaEtapa("perda"),
  };

  const executarAcao = async (promessa: Promise<{ ok: boolean; erro?: string }>) => {
    const resultado = await promessa;
    if (!resultado.ok) setErroAcao(resultado.erro ?? "Erro desconhecido.");
  };

  const gerarCodigoLote = (nome: string, seq: number) => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, "0");
    const mm = String(agora.getMonth() + 1).padStart(2, "0");
    const sigla = nome
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return `${sigla}-${dd}${mm}-${String(seq).padStart(2, "0")}`;
  };

  const iniciarProducao = (item: CardEstoque) => {
    if (emModoDemo) {
      const agora = new Date();
      const receitaObj = receitaPorId.get(item.receitaId);
      const turnoObj = turnos.find((t) => t.id === turnoId);
      const novoLote = gerarCodigoLote(item.nome, listaProducoes.length + 1);

      const nova: Producao = {
        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        lote: novoLote,
        tipo: item.tipo,
        receitaId: item.receitaId,
        quantidade: receitaObj?.rendimento ?? 1,
        responsavel: chefeTurno.trim() || "Cozinheiro Operacional",
        turnoId,
        chefeTurno: chefeTurno.trim() || null,
        validade: "7 dias",
        status: "em_producao",
        motivoPerda: null,
        criadoEm: agora.toISOString(),
        nomeReceita: item.nome,
        unidadeRendimento: receitaObj?.unidadeRendimento ?? "un",
        nomeTurno: turnoObj?.nome ?? "Manhã",
      };

      atualizarProducoes((prev) => [nova, ...prev]);

      // REGISTRAR SAÍDA DO ESTOQUE PARA PRODUÇÃO
      if (receitaObj) {
        const consumos = consumoDeInsumosDaProducao(receitaObj, receitaObj.rendimento, receitaPorId, insumoPorId, processamentos);

        if (consumos.length > 0) {
          // 1. Criar e salvar movimentações de saída para produção
          try {
            let movsAtuais: Movimentacao[] = [];
            const salvoMov = localStorage.getItem("demo_movimentacoes");
            if (salvoMov) {
              const parsed = JSON.parse(salvoMov);
              if (Array.isArray(parsed) && parsed.length > 0) {
                movsAtuais = parsed;
              }
            }
            if (movsAtuais.length === 0) {
              movsAtuais = [...fixturesMovimentacoes];
            }

            const novasMovs: Movimentacao[] = consumos.map((c, idx) => ({
              id: `demo-mov-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              insumoId: c.insumoId,
              nomeInsumo: c.nome,
              unidadeMedida: c.unidadeMedida,
              tipo: "saida_producao",
              quantidade: c.quantidade,
              origem: `Produção — lote ${novoLote} (${item.nome})`,
              criadoEm: agora.toISOString(),
            }));

            const todasMovs = [...novasMovs, ...movsAtuais];
            localStorage.setItem("demo_movimentacoes", JSON.stringify(todasMovs));
          } catch {}

          // 2. Abater saldo no armazenamento (demo_estoque)
          try {
            let estoqueAtual: EstoqueLinha[] = [];
            const salvoEst = localStorage.getItem("demo_estoque");
            if (salvoEst) {
              const parsedEst = JSON.parse(salvoEst);
              if (Array.isArray(parsedEst) && parsedEst.length > 0) {
                estoqueAtual = parsedEst;
              }
            }
            if (estoqueAtual.length === 0) {
              estoqueAtual = insumos.map((i) => ({
                insumoId: i.id,
                nome: i.nome,
                categoria: i.categoria,
                unidadeMedida: i.unidadeMedida,
                precoUnitario: i.precoUnitario,
                saldoAtual: i.estoque?.saldoAtual ?? 0,
                estoqueMinimo: i.estoque?.estoqueMinimo ?? 0,
                atualizadoEm: agora.toISOString(),
              }));
            }

            const consumoMap = new Map(consumos.map((c) => [c.insumoId, c.quantidade]));

            const novoEstoque = estoqueAtual.map((linha) => {
              const gasto = consumoMap.get(linha.insumoId);
              if (!gasto) return linha;
              return {
                ...linha,
                saldoAtual: Math.max(0, Number((linha.saldoAtual - gasto).toFixed(3))),
                atualizadoEm: agora.toISOString(),
              };
            });

            localStorage.setItem("demo_estoque", JSON.stringify(novoEstoque));
          } catch {}

          // 3. Atualizar saldos locais em ProducoesClient para recalcular capacidade em tempo real
          setSaldosMap((prev) => {
            const novo = new Map(prev);
            for (const c of consumos) {
              const atual = novo.get(c.insumoId) ?? 0;
              novo.set(c.insumoId, Math.max(0, Number((atual - c.quantidade).toFixed(3))));
            }
            return novo;
          });
        }
      }

      setErroAcao(null);
      return;
    }

    void executarAcao(
      acaoIniciarProducao(item.receitaId, item.tipo, item.nome, receitaPorId.get(item.receitaId)?.rendimento ?? 1, turnoId, chefeTurno.trim() || null),
    );
  };

  const soltarNaColuna = (destino: ColunaId) => {
    if (!loteArrastando) return;
    const { colunaOrigem, item } = loteArrastando;
    if (!transicaoValida(colunaOrigem, destino)) return;

    if (colunaOrigem === "estoque" && destino === "em_producao") {
      iniciarProducao(item as CardEstoque);
    } else if (destino === "perda") {
      setModalPerda({ loteId: (item as Producao).id, motivo: "" });
    } else {
      if (emModoDemo) {
        atualizarProducoes((prev) =>
          prev.map((p) => (p.id === (item as Producao).id ? { ...p, status: destino as StatusProducao } : p))
        );
        setErroAcao(null);
        return;
      }
      void executarAcao(acaoAtualizarStatusProducao((item as Producao).id, destino as StatusProducao));
    }
  };

  const concluirProducao = (id: string) => {
    if (emModoDemo) {
      atualizarProducoes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "produzido" } : p))
      );
      setErroAcao(null);
      return;
    }
    void executarAcao(acaoAtualizarStatusProducao(id, "produzido"));
  };

  const confirmarPerda = () => {
    if (!modalPerda || !modalPerda.motivo.trim()) return;
    if (emModoDemo) {
      atualizarProducoes((prev) =>
        prev.map((p) =>
          p.id === modalPerda.loteId
            ? { ...p, status: "perda", motivoPerda: modalPerda.motivo.trim() }
            : p
        )
      );
      setModalPerda(null);
      setErroAcao(null);
      return;
    }
    void executarAcao(acaoAtualizarStatusProducao(modalPerda.loteId, "perda", modalPerda.motivo.trim()));
    setModalPerda(null);
  };

  return (
    <div className="max-w-7xl space-y-8 font-sans">
      {erroAcao && (
        <div
          role="alert"
          className="text-[14px] font-bold rounded-xl px-4 py-3 flex items-center justify-between gap-3 border"
          style={{ background: tint("var(--sinal)", 10), color: "var(--sinal)", borderColor: tint("var(--sinal)", 30) }}
        >
          <span className="flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" />{erroAcao}</span>
          <button onClick={() => setErroAcao(null)} className="font-bold text-[13px] min-h-[var(--alvo-toque)] px-3 rounded-lg bg-[var(--panel)] border border-[var(--linha)]">
            Fechar
          </button>
        </div>
      )}

      <div>
        {/* Cabeçalho do quadro.
            POLIMENTO producoes: "Registrar produção" subiu pra cá (antes ficava escondido
            abaixo do quadro, junto da tabela de capacidade); turno e chefe com 44px de
            altura pro dedo (antes ~30px); rótulos em caixa normal (antes "TURNO:"/"CHEFE:");
            subtítulo mais curto. */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">Quadro de produção</h2>
            <p className="text-[14px] text-[var(--tinta-sub)] mt-1">
              Arraste o lote entre as etapas ou use os botões do card.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-end gap-3 shrink-0">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-[var(--tinta-sub)]">Turno</span>
              <select
                value={turnoId ?? ""}
                onChange={(e) => setTurnoId(e.target.value || null)}
                className="text-[14px] font-bold px-3 min-h-[var(--alvo-toque)] rounded-xl border bg-[var(--panel)]"
                style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
              >
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-[var(--tinta-sub)]">Chefe do turno</span>
              <input
                value={chefeTurno}
                onChange={(e) => setChefeTurno(e.target.value)}
                placeholder="Nome"
                className="text-[14px] font-bold px-3 min-h-[var(--alvo-toque)] rounded-xl border bg-[var(--panel)] w-40"
                style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
              />
            </label>
            <button
              onClick={() => setShowNovaProducao(!showNovaProducao)}
              className="flex items-center gap-2 text-[14px] font-extrabold px-4 min-h-[var(--alvo-toque)] rounded-xl"
              style={{
                background: showNovaProducao ? "var(--panel)" : "var(--accent)",
                color: showNovaProducao ? "var(--tinta)" : "var(--accent-contrast)",
                border: `1px solid ${showNovaProducao ? "var(--linha-forte)" : "var(--accent)"}`,
              }}
            >
              {!showNovaProducao && <Plus size={16} strokeWidth={2.6} />}
              {showNovaProducao ? "Fechar" : "Registrar produção"}
            </button>
          </div>
        </div>

        {showNovaProducao && (
          <Card className="mb-5">
            <NovaProducaoForm
              preparos={preparos}
              pratos={pratos}
              turnoId={turnoId}
              chefeTurno={chefeTurno}
              onSave={() => setShowNovaProducao(false)}
              onCancel={() => setShowNovaProducao(false)}
              onSalvarDemo={emModoDemo ? (novaProdInput) => {
                const agora = new Date();
                const receitaObj = receitas.find((r) => r.id === novaProdInput.receitaId);
                const turnoObj = turnos.find((t) => t.id === novaProdInput.turnoId);
                const nova: Producao = {
                  id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  lote: novaProdInput.lote,
                  tipo: novaProdInput.tipo,
                  receitaId: novaProdInput.receitaId,
                  quantidade: novaProdInput.quantidade,
                  responsavel: novaProdInput.responsavel,
                  turnoId: novaProdInput.turnoId,
                  chefeTurno: novaProdInput.chefeTurno,
                  validade: novaProdInput.validade,
                  status: "em_producao",
                  motivoPerda: null,
                  criadoEm: agora.toISOString(),
                  nomeReceita: receitaObj?.nomePrato ?? "Item Produzido",
                  unidadeRendimento: receitaObj?.unidadeRendimento ?? "un",
                  nomeTurno: turnoObj?.nome ?? "Manhã",
                };
                atualizarProducoes((prev) => [nova, ...prev]);
                setShowNovaProducao(false);
              } : undefined}
            />
          </Card>
        )}

        {/* Quadro.
            POLIMENTO producoes: a partir de 1024px cada coluna rola por dentro e o quadro
            inteiro cabe na altura da tela -- antes "Em estoque" com 9 cards esticava a
            página pra ~2.700px e "Perdas" sumia do campo de visão do chef.
            select-none só no quadro (evita selecionar texto ao arrastar); antes valia pra
            tela toda. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
          {colunas.map((col) => {
            const cardsProducao = listaProducoes.filter((p) => p.status === col.id);
            const podeSoltarAqui = !!loteArrastando && transicaoValida(loteArrastando.colunaOrigem, col.id);
            const emHoverValido = colunaAlvo === col.id && podeSoltarAqui;
            const emHoverInvalido = colunaAlvo === col.id && !!loteArrastando && !podeSoltarAqui;
            const contagem = col.id === "estoque" ? disponivelProduzir.length : cardsProducao.length;
            const estilo = estilosColunas[col.id];

            return (
              <section
                key={col.id}
                aria-label={`${col.titulo}: ${contagem}`}
                className="rounded-xl flex flex-col transition-colors duration-200 min-w-0 lg:max-h-[calc(100dvh-230px)] lg:min-h-[520px]"
                style={{
                  backgroundColor: emHoverValido ? estilo.fundoBadge : estilo.fundoColuna,
                  border: `1px solid ${emHoverInvalido ? "var(--sinal)" : estilo.borda}`,
                  borderTop: `3px solid ${emHoverInvalido ? "var(--sinal)" : estilo.cor}`,
                  boxShadow: emHoverValido || emHoverInvalido ? `0 0 0 2px ${emHoverInvalido ? "var(--sinal)" : estilo.cor} inset` : "none",
                }}
                onDragOver={(e) => {
                  if (!loteArrastando) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = podeSoltarAqui ? "move" : "none";
                  if (colunaAlvo !== col.id) setColunaAlvo(col.id);
                }}
                onDragLeave={() => setColunaAlvo((atual) => (atual === col.id ? null : atual))}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarNaColuna(col.id);
                  setColunaAlvo(null);
                }}
              >
                {/* Cabeçalho da coluna. POLIMENTO producoes: título 16px e contador maior
                    (antes 14px/12px), pra ler de longe. */}
                <div className="px-4 pt-3.5 pb-3 border-b" style={{ borderColor: estilo.borda }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-[16px] font-black tracking-tight" style={{ color: estilo.corTexto }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: estilo.cor }} aria-hidden />
                      {col.titulo}
                    </h3>
                    <span className="text-[14px] font-black min-w-8 text-center px-2.5 py-0.5 rounded-full" style={{ backgroundColor: estilo.fundoBadge, color: estilo.corTexto }}>
                      {contagem}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold mt-1 text-[var(--tinta-sub)]">{col.desc}</p>
                </div>

                {/* Cards (rolam por dentro da coluna no desktop/tablet deitado) */}
                <div className="p-3 space-y-3 flex-1 lg:overflow-y-auto overscroll-contain">
                  {contagem === 0 && (
                    <div className="text-[13px] font-bold py-8 text-center rounded-xl border border-dashed" style={{ borderColor: estilo.borda, color: estilo.corTexto }}>
                      {podeSoltarAqui ? "Solte o lote aqui" : "Nenhum lote nesta etapa"}
                    </div>
                  )}

                  {/* Card de capacidade ("Em estoque").
                      POLIMENTO producoes: o número de lotes virou o destaque (24px) com o rótulo
                      embaixo; antes "27 lotes possíveis" era um chip de 13px que quebrava linha.
                      "Gargalo:" virou "Falta primeiro:", que é o que a cozinha fala.
                      Botão com 44px e ícone; antes ~32px e "Iniciar Produção". */}
                  {col.id === "estoque" &&
                    disponivelProduzir.map((d) => {
                      const poucos = d.lotes <= 2;
                      return (
                        <div
                          key={`${d.tipo}-${d.receitaId}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setLoteArrastando({ colunaOrigem: "estoque", item: d });
                          }}
                          onDragEnd={() => {
                            setLoteArrastando(null);
                            setColunaAlvo(null);
                          }}
                          className="rounded-xl p-3.5 bg-[var(--panel)] cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md border"
                          style={{
                            borderColor: tint(estilo.cor, 30),
                            boxShadow: "var(--shadow-sm)",
                            opacity: loteArrastando?.item === d ? 0.4 : 1,
                          }}
                        >
                          <div className="text-[15px] font-black text-[var(--tinta)] leading-snug">{d.nome}</div>
                          <div className="text-[13px] font-semibold text-[var(--tinta-sub)] mt-0.5">{d.rendimentoLabel}</div>

                          <div className="flex items-baseline gap-1.5 mt-2.5">
                            <span className="text-[24px] font-black leading-none" style={{ color: poucos ? "var(--sinal)" : estilo.corTexto }}>
                              {d.lotes}
                            </span>
                            <span className="text-[13px] font-bold text-[var(--tinta-sub)]">
                              {d.lotes === 1 ? "lote possível" : "lotes possíveis"}
                            </span>
                          </div>
                          {d.gargalo && (
                            <div className="text-[12px] font-semibold mt-1 text-[var(--tinta-sub)]">
                              Falta primeiro: <strong className="text-[var(--tinta)]">{d.gargalo}</strong>
                            </div>
                          )}

                          <button
                            onClick={() => iniciarProducao(d)}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-2 text-[14px] font-extrabold min-h-[var(--alvo-toque)] rounded-xl transition-opacity hover:opacity-90"
                            // SISTEMA premium: botão tingido da etapa (fundo 12%, texto -texto, borda 30%).
                            // Antes era preenchido, e no escuro virava um pastel chapado destoando do resto.
                            style={{ backgroundColor: tint(estilo.cor, 12), color: estilo.corTexto, border: `1px solid ${tint(estilo.cor, 30)}` }}
                          >
                            {/* Ícone só a partir de 1280px: na coluna do tablet deitado ele empurrava o texto pra 2 linhas. */}
                            <Play size={15} strokeWidth={2.6} className="hidden xl:block" />
                            <span className="whitespace-nowrap">Iniciar produção</span>
                          </button>
                        </div>
                      );
                    })}

                  {/* Card de lote (em produção / produzido / perda).
                      POLIMENTO producoes: quantidade com plural certo, validade em dd/mm,
                      botões de 44px. "Registrar Descarte / Perda" (vermelho em todo card
                      produzido) virou "Registrar perda" neutro com ícone -- o vermelho fica
                      reservado pra perda que aconteceu. Motivo da perda com tint do token. */}
                  {col.id !== "estoque" &&
                    cardsProducao.map((pr) => (
                      <div
                        key={pr.id}
                        draggable={col.id !== "perda"}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setLoteArrastando({ colunaOrigem: col.id, item: pr });
                        }}
                        onDragEnd={() => {
                          setLoteArrastando(null);
                          setColunaAlvo(null);
                        }}
                        className={`rounded-xl p-3.5 bg-[var(--panel)] transition-shadow hover:shadow-md border ${
                          col.id !== "perda" ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                        style={{
                          borderColor: tint(estilo.cor, 30),
                          boxShadow: "var(--shadow-sm)",
                          opacity: loteArrastando?.item === pr ? 0.4 : 1,
                        }}
                      >
                        <div className="text-[12px] font-medium text-[var(--tinta-sub)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: estilo.cor }} aria-hidden />
                          {pr.lote}
                        </div>
                        <div className="text-[15px] font-black text-[var(--tinta)] leading-snug mt-1">{pr.nomeReceita}</div>
                        <div className="text-[13px] font-semibold text-[var(--tinta-sub)] mt-1">
                          <strong className="text-[var(--tinta)] font-black">
                            {pr.quantidade.toLocaleString("pt-BR")} {unidadeNoPlural(pr.quantidade, pr.unidadeRendimento)}
                          </strong>
                          {" · "}
                          {pr.responsavel}
                        </div>
                        <div className="text-[12px] font-semibold mt-1.5 text-[var(--tinta-sub)]">
                          {pr.nomeTurno ?? "Sem turno"}
                          {pr.chefeTurno ? ` · chefe ${pr.chefeTurno}` : ""}
                          {pr.validade ? ` · validade ${validadeLegivel(pr.validade)}` : ""}
                        </div>
                        {pr.motivoPerda && (
                          <div
                            className="text-[13px] font-bold mt-2.5 p-2.5 rounded-lg"
                            style={{ background: tint("var(--etapa-perda)", 10), color: "var(--etapa-perda-texto)" }}
                          >
                            {pr.motivoPerda}
                          </div>
                        )}

                        {col.id === "em_producao" && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => concluirProducao(pr.id)}
                              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 text-[14px] font-extrabold min-h-[var(--alvo-toque)] rounded-xl transition-opacity hover:opacity-90"
                              // SISTEMA premium: tingido como os demais botões de etapa (antes preenchido).
                              style={{ backgroundColor: tint("var(--etapa-produzido)", 12), color: "var(--etapa-produzido-texto)", border: `1px solid ${tint("var(--etapa-produzido)", 30)}` }}
                            >
                              <Check size={16} strokeWidth={2.8} />
                              Concluir
                            </button>
                            {/* Perda como botão de ícone quadrado (44px): com o texto, os dois botões
                                não cabiam lado a lado na coluna de ~200px do tablet deitado. */}
                            <button
                              onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                              className="shrink-0 flex items-center justify-center w-[var(--alvo-toque)] min-h-[var(--alvo-toque)] rounded-xl border bg-[var(--panel)]"
                              style={{ borderColor: tint("var(--etapa-perda)", 40), color: "var(--etapa-perda-texto)" }}
                              aria-label={`Registrar perda do lote ${pr.lote}`}
                              title="Registrar perda"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        )}

                        {col.id === "produzido" && (
                          <button
                            onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                            className="mt-3 w-full flex items-center justify-center gap-2 text-[14px] font-bold min-h-[var(--alvo-toque)] rounded-xl border bg-[var(--panel)] text-[var(--tinta-sub)] hover:text-[var(--etapa-perda-texto)]"
                            style={{ borderColor: "var(--linha-forte)" }}
                          >
                            <Trash2 size={15} />
                            Registrar perda
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Capacidade por prato.
          POLIMENTO producoes: texto 14px (antes 12.5px) e cabeçalhos legíveis (antes 10.5px
          em --faint). O botão "Registrar produção" saiu daqui e foi pro cabeçalho do quadro. */}
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight text-[var(--tinta)]">Capacidade por prato</h2>
        <p className="text-[14px] mt-1 mb-3 text-[var(--tinta-sub)]">
          Quantas porções ainda dá pra fazer com o estoque de hoje, e o que acaba primeiro.
        </p>

        <Card>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[var(--tinta-sub)]">
                <th className="py-3 px-5 font-bold">Prato</th>
                {/* "Rende por receita" some no celular: 4 colunas não cabiam em 390px. */}
                <th className="py-3 px-3 font-bold text-right hidden sm:table-cell">Rende por receita</th>
                <th className="py-3 px-3 font-bold text-right">Ainda dá pra fazer</th>
                <th className="py-3 px-5 font-bold">Acaba primeiro</th>
              </tr>
            </thead>
            <tbody>
              {capacidadePratos.map((p) => (
                <tr key={p.receita.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="py-3 px-5 font-bold">{p.receita.nomePrato}</td>
                  <td className="py-3 px-3 text-right hidden sm:table-cell" style={nums}>{p.receita.rendimento} {unidadeNoPlural(p.receita.rendimento, "porção")}</td>
                  <td className="py-3 px-3 text-right font-black" style={{ ...nums, color: p.porcoesPossiveis !== null && p.porcoesPossiveis < 10 ? "var(--sinal)" : "var(--text)" }}>
                    {p.porcoesPossiveis === null ? <span style={{ color: "var(--faint)", fontWeight: 500 }}>sem estoque rastreado</span> : `${p.porcoesPossiveis} ${unidadeNoPlural(p.porcoesPossiveis, "porção")}`}
                  </td>
                  <td className="py-3 px-5 text-[var(--tinta-sub)]">
                    {p.nomeGargalo ?? "—"}
                    {p.semRastreio > 0 && <span style={{ color: "var(--faint)" }}> · {p.semRastreio} insumo{p.semRastreio > 1 ? "s" : ""} fora do cálculo</span>}
                  </td>
                </tr>
              ))}
              {capacidadePratos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>
                    Nenhum prato final cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Modal de perda. POLIMENTO producoes: botões e campo com 44px, texto 14px
          (antes 12.5px e botões ~30px); fundo do overlay neutro (antes rgba azulado). */}
      {modalPerda && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
          onClick={() => setModalPerda(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-perda"
            className="rounded-2xl p-5 w-full max-w-md"
            style={{ background: "var(--panel)", boxShadow: shadow, border: "1px solid var(--linha)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="titulo-modal-perda" className="text-[16px] font-semibold mb-1">Registrar perda</h3>
            <p className="text-[14px] mb-3 text-[var(--tinta-sub)]">O que aconteceu com esse lote? O motivo fica registrado pra investigar depois.</p>
            <textarea
              autoFocus
              value={modalPerda.motivo}
              onChange={(e) => setModalPerda({ ...modalPerda, motivo: e.target.value })}
              placeholder="Ex: ficou fora da câmara a noite toda, queimou na chapa, validade vencida..."
              className="text-[15px] px-3 py-2.5 rounded-xl w-full mb-4"
              style={{ border: "1px solid var(--border-strong)", background: "var(--panel)", minHeight: 110 }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalPerda(null)} className="text-[14px] font-bold px-4 min-h-[var(--alvo-toque)] rounded-xl" style={{ border: "1px solid var(--border-strong)" }}>
                Cancelar
              </button>
              <button
                onClick={confirmarPerda}
                disabled={!modalPerda.motivo.trim()}
                className="text-[14px] font-extrabold px-4 min-h-[var(--alvo-toque)] rounded-xl"
                style={{ background: "var(--etapa-perda-texto)", color: "var(--panel)", opacity: modalPerda.motivo.trim() ? 1 : 0.5 }}
              >
                Registrar perda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
