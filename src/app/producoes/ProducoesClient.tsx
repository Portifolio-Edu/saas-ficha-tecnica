"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ficha/Card";
import { inputStyle, nums, shadow } from "@/components/ficha/tema";
import { NovaProducaoForm } from "@/components/producoes/NovaProducaoForm";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Producao, StatusProducao, Turno, TipoItemProducao } from "@/lib/dominio/producao";
import type { Processamento } from "@/lib/dominio/processamento";
import { calcularCapacidadeProducao, linhasCapacidadeDaReceita, type SaldoEstoque } from "@/lib/calculo/capacidadeProducao";
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

export function ProducoesClient({
  insumos,
  receitas,
  producoes,
  turnos,
  processamentos,
}: {
  insumos: Insumo[];
  receitas: Receita[];
  producoes: Producao[];
  turnos: Turno[];
  processamentos: Processamento[];
}) {
  const [turnoId, setTurnoId] = useState<string | null>(turnos[0]?.id ?? null);
  const [chefeTurno, setChefeTurno] = useState("");
  const [showNovaProducao, setShowNovaProducao] = useState(false);
  const [loteArrastando, setLoteArrastando] = useState<{ colunaOrigem: ColunaId; item: CardEstoque | Producao } | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<ColunaId | null>(null);
  // Modal em vez de window.prompt: o mesmo motivo do quadro de produção do
  // mockup -- diálogo nativo pode ser bloqueado dependendo de onde a página
  // roda, então o motivo da perda é sempre pedido num modal próprio.
  const [modalPerda, setModalPerda] = useState<{ loteId: string; motivo: string } | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const preparos = receitas.filter((r) => r.tipo === "preparo_base");
  const pratos = receitas.filter((r) => r.tipo === "prato_final");

  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const saldosPorInsumoId = useMemo(() => {
    const mapa = new Map<string, SaldoEstoque>();
    for (const i of insumos) {
      if (i.estoque) mapa.set(i.id, { insumoId: i.id, saldoAtual: i.estoque.saldoAtual });
    }
    return mapa;
  }, [insumos]);

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

  // Identidade de cor por etapa do fluxo: estoque=azul, em produção=amarelo,
  // produzido=verde (--accent), perda=vermelho (--danger). Reaproveitada no
  // cabeçalho da coluna, na borda dos cards e nos botões de ação -- o botão
  // sempre herda a cor do destino pra onde ele move o lote.
  const coresStatus: Record<ColunaId, { cor: string; fundo: string }> = {
    estoque: { cor: "var(--status-estoque)", fundo: "var(--status-estoque-soft)" },
    em_producao: { cor: "var(--status-producao)", fundo: "var(--status-producao-soft)" },
    produzido: { cor: "var(--accent)", fundo: "var(--accent-soft)" },
    perda: { cor: "var(--danger)", fundo: "var(--danger-soft)" },
  };

  const executarAcao = async (promessa: Promise<{ ok: boolean; erro?: string }>) => {
    const resultado = await promessa;
    if (!resultado.ok) setErroAcao(resultado.erro ?? "Erro desconhecido.");
  };

  const iniciarProducao = (item: CardEstoque) => {
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
      void executarAcao(acaoAtualizarStatusProducao((item as Producao).id, destino as StatusProducao));
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {erroAcao && (
        <div className="text-[12.5px] rounded-lg px-3.5 py-2 flex items-center justify-between" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {erroAcao}
          <button onClick={() => setErroAcao(null)} className="font-medium ml-3">
            fechar
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Quadro de produção</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Turno</span>
            <select value={turnoId ?? ""} onChange={(e) => setTurnoId(e.target.value || null)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
              ))}
            </select>
            <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>chefe</span>
            <input value={chefeTurno} onChange={(e) => setChefeTurno(e.target.value)} placeholder="nome" className="text-[12px] px-2 py-1 rounded-md w-24" style={inputStyle} />
          </div>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>A cozinha move o lote de coluna conforme trabalha. Cada card carrega o número do lote, então dá pra rastrear depois o que saiu de onde.</p>
        <div className="grid grid-cols-4 gap-3">
          {colunas.map((col) => {
            const cardsProducao = producoes.filter((p) => p.status === col.id);
            const podeSoltarAqui = !!loteArrastando && transicaoValida(loteArrastando.colunaOrigem, col.id);
            const emHoverValido = colunaAlvo === col.id && podeSoltarAqui;
            const emHoverInvalido = colunaAlvo === col.id && !!loteArrastando && !podeSoltarAqui;
            const contagem = col.id === "estoque" ? disponivelProduzir.length : cardsProducao.length;
            const cor = coresStatus[col.id];

            return (
              <div
                key={col.id}
                className="rounded-xl p-3 transition-colors"
                style={{
                  background: emHoverValido ? cor.fundo : "var(--panel)",
                  border: "1px solid var(--border)",
                  borderTop: `3px solid ${emHoverInvalido ? "var(--danger)" : cor.cor}`,
                  boxShadow: emHoverValido || emHoverInvalido ? `0 0 0 2px ${emHoverInvalido ? "var(--danger)" : cor.cor} inset` : shadow,
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
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>
                    <span className="inline-block rounded-full shrink-0" style={{ width: 7, height: 7, background: cor.cor }} />
                    {col.titulo}
                  </span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ ...nums, background: cor.fundo, color: cor.cor }}>{contagem}</span>
                </div>
                <div className="text-[10.5px] mb-2.5" style={{ color: "var(--faint)" }}>{col.desc}</div>
                <div className="space-y-2">
                  {contagem === 0 && (
                    <div className="text-[11px] py-2" style={{ color: podeSoltarAqui ? cor.cor : "var(--faint)" }}>
                      {podeSoltarAqui ? "Solte aqui" : "Nada aqui."}
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
                        className="rounded-lg p-2.5 ftv-panel cursor-grab active:cursor-grabbing"
                        style={{ background: "var(--panel)", border: `1px solid color-mix(in srgb, ${cor.cor} 28%, var(--border))`, opacity: loteArrastando?.item === d ? 0.4 : 1 }}
                      >
                        <div className="text-[12px] font-medium leading-tight">{d.nome}</div>
                        <div className="text-[10.5px] mt-1" style={{ color: "var(--sub)" }}>{d.rendimentoLabel}</div>
                        <div className="text-[10.5px] mt-1.5 flex items-baseline gap-1">
                          <span className="font-semibold" style={{ ...nums, color: d.lotes <= 2 ? "var(--danger)" : "var(--text)", fontSize: 13 }}>{d.lotes}</span>
                          <span style={{ color: "var(--sub)" }}>lote{d.lotes > 1 ? "s" : ""} possível{d.lotes > 1 ? "eis" : ""}</span>
                        </div>
                        {d.gargalo && <div className="text-[10px] mt-1" style={{ color: "var(--faint)" }}>limite: {d.gargalo}</div>}
                        <button onClick={() => iniciarProducao(d)} className="mt-2 w-full text-[11px] font-semibold py-1.5 rounded-md" style={{ background: "var(--status-producao-soft)", color: "var(--status-producao)" }}>
                          Iniciar produção
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
                        className={col.id !== "perda" ? "rounded-lg p-2.5 ftv-panel cursor-grab active:cursor-grabbing" : "rounded-lg p-2.5 ftv-panel"}
                        style={{ background: "var(--panel)", border: `1px solid color-mix(in srgb, ${cor.cor} 28%, var(--border))`, opacity: loteArrastando?.item === pr ? 0.4 : 1 }}
                      >
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ ...nums, color: "var(--sub)" }}><span aria-hidden className="rounded-full shrink-0" style={{ width: 6, height: 6, background: cor.cor }} />{pr.lote}</div>
                        <div className="text-[12px] font-medium leading-tight mt-0.5">{pr.nomeReceita}</div>
                        <div className="text-[10.5px] mt-1" style={{ ...nums, color: "var(--sub)" }}>{pr.quantidade} {pr.unidadeRendimento} · {pr.responsavel}</div>
                        <div className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--sub)" }}>
                          {pr.nomeTurno ?? "—"} · chefe {pr.chefeTurno ?? "—"}
                        </div>
                        {pr.validade && <div className="text-[10px] mt-0.5" style={{ color: "var(--faint)" }}>validade {pr.validade}</div>}
                        {pr.motivoPerda && <div className="text-[10.5px] mt-1.5" style={{ color: "var(--danger)" }}>{pr.motivoPerda}</div>}

                        {col.id === "em_producao" && (
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => executarAcao(acaoAtualizarStatusProducao(pr.id, "produzido"))} className="flex-1 text-[11px] font-semibold py-1.5 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                              Concluir
                            </button>
                            <button
                              onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                              className="text-[11px] font-semibold py-1.5 px-2.5 rounded-md"
                              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                            >
                              Perda
                            </button>
                          </div>
                        )}

                        {col.id === "produzido" && (
                          <button
                            onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                            className="mt-2 w-full text-[11px] font-semibold py-1.5 rounded-md"
                            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                          >
                            Registrar perda
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
                onClick={() => {
                  if (!modalPerda.motivo.trim()) return;
                  void executarAcao(acaoAtualizarStatusProducao(modalPerda.loteId, "perda", modalPerda.motivo.trim()));
                  setModalPerda(null);
                }}
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
