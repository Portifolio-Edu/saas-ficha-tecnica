"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ficha/Card";
import { nums, shadow } from "@/components/ficha/tema";
import { NovaProducaoForm } from "@/components/producoes/NovaProducaoForm";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Producao, StatusProducao, Turno, TipoItemProducao } from "@/lib/dominio/producao";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Movimentacao, EstoqueLinha } from "@/lib/dominio/estoque";
import { calcularCapacidadeProducao, linhasCapacidadeDaReceita, type SaldoEstoque } from "@/lib/calculo/capacidadeProducao";
import { pesoBrutoDaLinha } from "@/lib/dados/adaptadores";
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

interface ConsumoInsumo {
  insumoId: string;
  nome: string;
  unidadeMedida: string;
  quantidade: number;
}

function obterConsumosReceita(
  receita: Receita,
  fator: number,
  receitasMap: Map<string, Receita>,
  insumosMap: Map<string, Insumo>,
  procs: Processamento[]
): ConsumoInsumo[] {
  const consumos: ConsumoInsumo[] = [];

  for (const linha of receita.ficha) {
    if (linha.insumoId) {
      const insumo = insumosMap.get(linha.insumoId);
      if (!insumo) continue;
      let qtdBase = 0;
      try {
        const bruto = pesoBrutoDaLinha(linha, insumosMap, procs);
        if (bruto !== null && !isNaN(bruto) && bruto > 0) {
          qtdBase = bruto;
        } else {
          qtdBase = linha.pesoLiquido;
        }
      } catch {
        qtdBase = linha.pesoLiquido;
      }
      consumos.push({
        insumoId: insumo.id,
        nome: insumo.nome,
        unidadeMedida: insumo.unidadeMedida,
        quantidade: Number((qtdBase * fator).toFixed(3)),
      });
    } else if (linha.subReceitaId) {
      const sub = receitasMap.get(linha.subReceitaId);
      if (sub) {
        const proporcao = (linha.pesoLiquido / (sub.rendimento || 1)) * fator;
        const subConsumos = obterConsumosReceita(sub, proporcao, receitasMap, insumosMap, procs);
        consumos.push(...subConsumos);
      }
    }
  }

  // Agrupar insumos repetidos
  const agrupado = new Map<string, ConsumoInsumo>();
  for (const c of consumos) {
    const ex = agrupado.get(c.insumoId);
    if (ex) {
      ex.quantidade = Number((ex.quantidade + c.quantidade).toFixed(3));
    } else {
      agrupado.set(c.insumoId, { ...c });
    }
  }

  return Array.from(agrupado.values());
}

function transicaoValida(origem: ColunaId, destino: ColunaId): boolean {
  if (origem === destino) return false;
  if (origem === "estoque") return destino === "em_producao";
  if (origem === "em_producao") return destino === "produzido" || destino === "perda";
  if (origem === "produzido") return destino === "perda";
  return false;
}

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

  const [listaProducoes, setListaProducoes] = useState<Producao[]>(producoes);

  const [saldosMap, setSaldosMap] = useState<Map<string, number>>(() => {
    const mapa = new Map<string, number>();
    for (const i of insumos) {
      if (i.estoque) mapa.set(i.id, i.estoque.saldoAtual);
    }
    return mapa;
  });

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
      if (e.key === "demo_producoes" || e.key === "demo_estoque") {
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
          rendimentoLabel: `${c.receita.rendimento}${c.receita.unidadeRendimento} por lote`,
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

  // Identidade de cor marcante por etapa do fluxo:
  // estoque=Azul Safira, em produção=Âmbar/Laranja, produzido=Verde Esmeralda, perda=Vermelho Carmim
  const estilosColunas: Record<
    ColunaId,
    {
      cor: string;
      corTexto: string;
      fundoColuna: string;
      fundoBadge: string;
      borda: string;
      bordaTopo: string;
      ponto: string;
    }
  > = {
    estoque: {
      cor: "#2563EB",
      corTexto: "#1D4ED8",
      fundoColuna: "rgba(37, 99, 235, 0.04)",
      fundoBadge: "rgba(37, 99, 235, 0.12)",
      borda: "rgba(37, 99, 235, 0.22)",
      bordaTopo: "#2563EB",
      ponto: "#2563EB",
    },
    em_producao: {
      cor: "#D97706",
      corTexto: "#B45309",
      fundoColuna: "rgba(217, 119, 6, 0.04)",
      fundoBadge: "rgba(217, 119, 6, 0.12)",
      borda: "rgba(217, 119, 6, 0.22)",
      bordaTopo: "#D97706",
      ponto: "#D97706",
    },
    produzido: {
      cor: "#059669",
      corTexto: "#047857",
      fundoColuna: "rgba(5, 150, 105, 0.04)",
      fundoBadge: "rgba(5, 150, 105, 0.12)",
      borda: "rgba(5, 150, 105, 0.22)",
      bordaTopo: "#059669",
      ponto: "#059669",
    },
    perda: {
      cor: "#DC2626",
      corTexto: "#B91C1C",
      fundoColuna: "rgba(220, 38, 38, 0.04)",
      fundoBadge: "rgba(220, 38, 38, 0.12)",
      borda: "rgba(220, 38, 38, 0.22)",
      bordaTopo: "#DC2626",
      ponto: "#DC2626",
    },
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
        const consumos = obterConsumosReceita(
          receitaObj,
          1,
          receitaPorId,
          insumoPorId,
          processamentos
        );

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
    <div className="max-w-6xl space-y-7 select-none font-sans">
      {erroAcao && (
        <div className="text-[13px] font-bold rounded-xl px-4 py-3 flex items-center justify-between border shadow-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)", borderColor: "rgba(220, 38, 38, 0.3)" }}>
          <span>{erroAcao}</span>
          <button onClick={() => setErroAcao(null)} className="font-extrabold uppercase text-[11px] ml-3 px-2 py-1 rounded bg-[var(--panel)] border border-[var(--linha)]">
            fechar
          </button>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-[18px] md:text-[20px] font-black tracking-tight text-[var(--tinta)]">
              Quadro de Produção da Cozinha
            </h2>
            <p className="text-[13px] font-semibold text-[var(--tinta-sub)] mt-0.5">
              Acompanhamento do fluxo operacional da bancada por lotes e estações.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-xl border bg-[var(--panel)] shadow-sm" style={{ borderColor: "var(--linha)" }}>
            <span className="text-[12px] font-bold text-[var(--tinta-sub)] uppercase">Turno:</span>
            <select
              value={turnoId ?? ""}
              onChange={(e) => setTurnoId(e.target.value || null)}
              className="text-[13px] font-bold px-2.5 py-1.5 rounded-lg border bg-[var(--panel-elevated)]"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
            >
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
              ))}
            </select>
            <span className="text-[12px] font-bold text-[var(--tinta-sub)] uppercase">Chefe:</span>
            <input
              value={chefeTurno}
              onChange={(e) => setChefeTurno(e.target.value)}
              placeholder="Nome"
              className="text-[13px] font-bold px-2.5 py-1.5 rounded-lg border bg-[var(--panel-elevated)] w-28"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
            />
          </div>
        </div>

        {/* Grid do Kanban com Cores Distintas por Coluna */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {colunas.map((col) => {
            const cardsProducao = listaProducoes.filter((p) => p.status === col.id);
            const podeSoltarAqui = !!loteArrastando && transicaoValida(loteArrastando.colunaOrigem, col.id);
            const emHoverValido = colunaAlvo === col.id && podeSoltarAqui;
            const emHoverInvalido = colunaAlvo === col.id && !!loteArrastando && !podeSoltarAqui;
            const contagem = col.id === "estoque" ? disponivelProduzir.length : cardsProducao.length;
            const estilo = estilosColunas[col.id];

            return (
              <div
                key={col.id}
                className="rounded-2xl p-4 flex flex-col transition-all duration-200"
                style={{
                  backgroundColor: emHoverValido ? estilo.fundoBadge : estilo.fundoColuna,
                  border: `1px solid ${emHoverInvalido ? "var(--danger)" : estilo.borda}`,
                  borderTop: `4px solid ${emHoverInvalido ? "var(--danger)" : estilo.bordaTopo}`,
                  boxShadow: emHoverValido || emHoverInvalido ? `0 0 0 2px ${emHoverInvalido ? "var(--danger)" : estilo.cor} inset` : "0 4px 16px -2px rgba(0, 0, 0, 0.03)",
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
                {/* Header da Coluna */}
                <div className="flex items-center justify-between pb-2 mb-1 border-b" style={{ borderColor: estilo.borda }}>
                  <span className="flex items-center gap-2 text-[14px] font-black tracking-tight" style={{ color: estilo.corTexto }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: estilo.ponto }} />
                    {col.titulo}
                  </span>
                  <span
                    className="text-[12px] font-black px-2.5 py-0.5 rounded-full shadow-sm"
                    style={{ backgroundColor: estilo.fundoBadge, color: estilo.corTexto }}
                  >
                    {contagem}
                  </span>
                </div>
                <div className="text-[11.5px] font-semibold mb-3 text-[var(--tinta-sub)]">{col.desc}</div>

                {/* Área de Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {contagem === 0 && (
                    <div className="text-[12px] font-bold py-6 text-center rounded-xl border border-dashed" style={{ borderColor: estilo.borda, color: estilo.corTexto }}>
                      {podeSoltarAqui ? "Solte o lote aqui" : "Nenhum item nesta etapa"}
                    </div>
                  )}

                  {col.id === "estoque" &&
                    disponivelProduzir.map((d) => (
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
                        className="rounded-xl p-3.5 bg-[var(--panel)] cursor-grab active:cursor-grabbing transition-all hover:shadow-md border shadow-sm"
                        style={{
                          borderColor: "var(--linha)",
                          borderLeft: `4px solid ${estilo.cor}`,
                          opacity: loteArrastando?.item === d ? 0.4 : 1,
                        }}
                      >
                        <div className="text-[14px] font-bold text-[var(--tinta)] leading-snug">{d.nome}</div>
                        <div className="text-[12px] font-semibold text-[var(--tinta-sub)] mt-1">{d.rendimentoLabel}</div>
                        <div className="text-[12px] font-extrabold mt-2 flex items-baseline gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded text-[13px] font-black"
                            style={{
                              backgroundColor: d.lotes <= 2 ? "rgba(220, 38, 38, 0.12)" : "rgba(37, 99, 235, 0.12)",
                              color: d.lotes <= 2 ? "var(--danger)" : estilo.corTexto,
                            }}
                          >
                            {d.lotes} {d.lotes > 1 ? "lotes possíveis" : "lote possível"}
                          </span>
                        </div>
                        {d.gargalo && (
                          <div className="text-[11px] font-bold mt-1.5 text-[var(--tinta-sub)]">
                            Gargalo: <strong className="text-[var(--tinta)]">{d.gargalo}</strong>
                          </div>
                        )}
                        <button
                          onClick={() => iniciarProducao(d)}
                          className="mt-3 w-full text-[12px] font-black py-2 rounded-xl text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                          style={{ backgroundColor: estilo.cor }}
                        >
                          Iniciar Produção
                        </button>
                      </div>
                    ))}

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
                        className={`rounded-xl p-3.5 bg-[var(--panel)] transition-all hover:shadow-md border shadow-sm ${
                          col.id !== "perda" ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                        style={{
                          borderColor: "var(--linha)",
                          borderLeft: `4px solid ${estilo.cor}`,
                          opacity: loteArrastando?.item === pr ? 0.4 : 1,
                        }}
                      >
                        <div className="text-[11px] font-black uppercase tracking-wider text-[var(--tinta-sub)]">{pr.lote}</div>
                        <div className="text-[14px] font-bold text-[var(--tinta)] leading-snug mt-0.5">{pr.nomeReceita}</div>
                        <div className="text-[12px] font-semibold text-[var(--tinta-sub)] mt-1.5">
                          {pr.quantidade} {pr.unidadeRendimento} · <strong className="text-[var(--tinta)]">{pr.responsavel}</strong>
                        </div>
                        <div className="text-[11px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-md bg-[var(--panel-elevated)] border border-[var(--linha)] text-[var(--tinta-sub)]">
                          {pr.nomeTurno ?? "—"} · chefe {pr.chefeTurno ?? "—"}
                        </div>
                        {pr.validade && (
                          <div className="text-[11px] font-semibold mt-1 text-[var(--tinta-sub)]">
                            Validade: {pr.validade}
                          </div>
                        )}
                        {pr.motivoPerda && (
                          <div className="text-[12px] font-extrabold mt-2 p-2 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300">
                            Motivo: {pr.motivoPerda}
                          </div>
                        )}

                        {col.id === "em_producao" && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => concluirProducao(pr.id)}
                              className="flex-1 text-[12px] font-black py-2 rounded-xl text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                              style={{ backgroundColor: "#059669" }}
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                              className="text-[12px] font-black py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              Perda
                            </button>
                          </div>
                        )}

                        {col.id === "produzido" && (
                          <button
                            onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                            className="mt-3 w-full text-[12px] font-black py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                          >
                            Registrar Descarte / Perda
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Detalhe de capacidade por prato</h2>
          <button
            onClick={() => setShowNovaProducao(!showNovaProducao)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovaProducao ? "var(--bg)" : "var(--accent)", color: showNovaProducao ? "var(--text)" : "#fff", border: `1px solid ${showNovaProducao ? "var(--border-strong)" : "var(--accent)"}` }}
          >
            {showNovaProducao ? "Fechar" : "+ Registrar produção"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Detalhamento em porções por prato, com o insumo que vai faltar primeiro. O quadro acima mostra a mesma coisa em lotes.</p>

        {showNovaProducao && (
          <Card className="mb-3">
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

        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Prato</th>
                <th className="py-2.5 px-3 font-medium text-right">Rende por receita</th>
                <th className="py-2.5 px-3 font-medium text-right">Ainda dá pra fazer</th>
                <th className="py-2.5 px-5 font-medium">Primeiro insumo a faltar</th>
              </tr>
            </thead>
            <tbody>
              {capacidadePratos.map((p) => (
                <tr key={p.receita.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                  <td className="py-2.5 px-5 font-medium">{p.receita.nomePrato}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{p.receita.rendimento} porç{p.receita.rendimento > 1 ? "ões" : "ão"}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={{ ...nums, color: p.porcoesPossiveis !== null && p.porcoesPossiveis < 10 ? "var(--danger)" : "var(--text)" }}>
                    {p.porcoesPossiveis === null ? <span style={{ color: "var(--faint)", fontWeight: 400 }}>sem estoque rastreado</span> : `${p.porcoesPossiveis} porções`}
                  </td>
                  <td className="py-2.5 px-5" style={{ color: "var(--sub)" }}>
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

      {modalPerda && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(13,13,15,0.45)", zIndex: 50 }}
          onClick={() => setModalPerda(null)}
        >
          <div className="rounded-xl p-5 w-full max-w-sm ftv-panel" style={{ background: "var(--panel)", boxShadow: shadow }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-1">Registrar perda</h3>
            <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>O que aconteceu com esse lote? O motivo fica registrado pra investigar depois — perda sem motivo não serve pra nada.</p>
            <textarea
              autoFocus
              value={modalPerda.motivo}
              onChange={(e) => setModalPerda({ ...modalPerda, motivo: e.target.value })}
              placeholder="Ex: esqueceu fora da câmara a noite toda, queimou na chapa, validade vencida..."
              className="text-[12.5px] px-2.5 py-2 rounded-md w-full mb-3"
              style={{ border: `1px solid ${"var(--border-strong)"}`, background: "var(--panel)", minHeight: 84 }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalPerda(null)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
                Cancelar
              </button>
              <button
                onClick={confirmarPerda}
                disabled={!modalPerda.motivo.trim()}
                className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg"
                style={{ background: "var(--danger)", color: "#fff", opacity: modalPerda.motivo.trim() ? 1 : 0.5 }}
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
