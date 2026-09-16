"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ficha/Card";
import { C, inputStyle, nums, shadow } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Producao, ProducaoInput, StatusProducao, Turno, TipoItemProducao } from "@/lib/dominio/producao";
import { pesoBrutoDaLinha } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { calcularCapacidadeProducao, type InsumoNaFicha, type SaldoEstoque } from "@/lib/calculo/capacidadeProducao";
import { acaoIniciarProducao, acaoRegistrarProducao, acaoAtualizarStatusProducao } from "./actions";

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

function NovaProducaoForm({
  preparos,
  pratos,
  turnoId,
  chefeTurno,
  onSave,
  onCancel,
}: {
  preparos: Receita[];
  pratos: Receita[];
  turnoId: string | null;
  chefeTurno: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<TipoItemProducao>("preparo");
  const [receitaId, setReceitaId] = useState(preparos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const opcoes = tipo === "preparo" ? preparos : pratos;
  const unidade = tipo === "preparo" ? (preparos.find((p) => p.id === receitaId)?.unidadeRendimento ?? "") : "porções";

  const trocarTipo = (novoTipo: TipoItemProducao) => {
    setTipo(novoTipo);
    setReceitaId(novoTipo === "preparo" ? (preparos[0]?.id ?? "") : (pratos[0]?.id ?? ""));
  };

  const salvar = async () => {
    if (!receitaId || !quantidade || !responsavel.trim() || !lote.trim()) return;
    setSalvando(true);
    setErro(null);
    const input: ProducaoInput = {
      lote: lote.trim(),
      tipo,
      receitaId,
      quantidade: parseFloat(quantidade),
      responsavel: responsavel.trim(),
      turnoId,
      chefeTurno: chefeTurno.trim() || null,
      validade: validade.trim() || null,
    };
    const resultado = await acaoRegistrarProducao(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSave();
  };

  return (
    <div className="px-5 py-4">
      <div className="flex gap-2 mb-2">
        {([["preparo", "Preparo próprio"], ["prato", "Prato final"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => trocarTipo(id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: tipo === id ? C.text : C.panel, color: tipo === id ? "#fff" : C.text, border: `1px solid ${tipo === id ? C.text : C.borderStrong}` }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={receitaId} onChange={(e) => setReceitaId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>{o.nomePrato}</option>
          ))}
        </select>
        <input placeholder={`Quantidade${unidade ? ` (${unidade})` : ""}`} type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <input placeholder="Número do lote" value={lote} onChange={(e) => setLote(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Validade (ex: 17/09)" value={validade} onChange={(e) => setValidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar produção"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
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

  // Capacidade de prato: peso bruto por PORÇÃO (ficha dividida pelo rendimento
  // da receita) -- o resultado já sai direto em porções, como na tabela de
  // detalhe. Capacidade de preparo: peso bruto do LOTE inteiro, sem dividir,
  // porque a ficha de um preparo representa o lote completo, não uma fração;
  // dividir por rendimento aqui infla a capacidade além do que a cozinha
  // realmente produz de uma vez.
  const capacidadePratos = useMemo(
    () =>
      pratos.map((p) => {
        const linhasInsumo: InsumoNaFicha[] = [];
        const semRastreioNomes: string[] = [];
        for (const linha of p.ficha) {
          if (!linha.insumoId) continue;
          const bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos);
          if (bruto === null) continue;
          linhasInsumo.push({ insumoId: linha.insumoId, pesoBrutoPorPorcao: bruto / p.rendimento });
        }
        const resultado = calcularCapacidadeProducao(linhasInsumo, saldosPorInsumoId);
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
        const linhasInsumo: InsumoNaFicha[] = [];
        for (const linha of prep.ficha) {
          if (!linha.insumoId) continue;
          const bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos);
          if (bruto === null) continue;
          linhasInsumo.push({ insumoId: linha.insumoId, pesoBrutoPorPorcao: bruto });
        }
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
        <div className="text-[12.5px] rounded-lg px-3.5 py-2 flex items-center justify-between" style={{ background: C.dangerSoft, color: C.danger }}>
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
            <span className="text-[11.5px]" style={{ color: C.faint }}>Turno</span>
            <select value={turnoId ?? ""} onChange={(e) => setTurnoId(e.target.value || null)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
              ))}
            </select>
            <span className="text-[11.5px]" style={{ color: C.faint }}>chefe</span>
            <input value={chefeTurno} onChange={(e) => setChefeTurno(e.target.value)} placeholder="nome" className="text-[12px] px-2 py-1 rounded-md w-24" style={inputStyle} />
          </div>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>A cozinha move o lote de coluna conforme trabalha. Cada card carrega o número do lote, então dá pra rastrear depois o que saiu de onde.</p>
        <div className="grid grid-cols-4 gap-3">
          {colunas.map((col) => {
            const cardsProducao = producoes.filter((p) => p.status === col.id);
            const podeSoltarAqui = !!loteArrastando && transicaoValida(loteArrastando.colunaOrigem, col.id);
            const emHoverValido = colunaAlvo === col.id && podeSoltarAqui;
            const emHoverInvalido = colunaAlvo === col.id && !!loteArrastando && !podeSoltarAqui;
            const contagem = col.id === "estoque" ? disponivelProduzir.length : cardsProducao.length;

            return (
              <div
                key={col.id}
                className="rounded-xl p-3 transition-colors"
                style={{
                  background: emHoverValido ? C.accentSoft : C.bg,
                  border: `1.5px dashed ${emHoverValido ? C.accent : emHoverInvalido ? C.danger : "transparent"}`,
                  outline: `1px solid ${emHoverValido || emHoverInvalido ? "transparent" : C.border}`,
                  outlineOffset: -1,
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
                  <span className="text-[12.5px] font-semibold" style={{ color: col.id === "perda" && contagem > 0 ? C.danger : C.text }}>{col.titulo}</span>
                  <span className="text-[12px] font-semibold" style={{ ...nums, color: col.id === "perda" && contagem > 0 ? C.danger : C.sub }}>{contagem}</span>
                </div>
                <div className="text-[10.5px] mb-2.5" style={{ color: C.faint }}>{col.desc}</div>
                <div className="space-y-2">
                  {contagem === 0 && (
                    <div className="text-[11px] py-2" style={{ color: podeSoltarAqui ? C.accent : C.faint }}>
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
                        style={{ border: `1px solid ${C.border}`, opacity: loteArrastando?.item === d ? 0.4 : 1 }}
                      >
                        <div className="text-[12px] font-medium leading-tight">{d.nome}</div>
                        <div className="text-[10.5px] mt-1" style={{ color: C.sub }}>{d.rendimentoLabel}</div>
                        <div className="text-[10.5px] mt-1.5 flex items-baseline gap-1">
                          <span className="font-semibold" style={{ ...nums, color: d.lotes <= 2 ? C.danger : C.text, fontSize: 13 }}>{d.lotes}</span>
                          <span style={{ color: C.sub }}>lote{d.lotes > 1 ? "s" : ""} possível{d.lotes > 1 ? "eis" : ""}</span>
                        </div>
                        {d.gargalo && <div className="text-[10px] mt-1" style={{ color: C.faint }}>limite: {d.gargalo}</div>}
                        <button onClick={() => iniciarProducao(d)} className="mt-2 w-full text-[11px] font-medium py-1.5 rounded-md" style={{ background: C.text, color: "#fff" }}>
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
                        style={{ border: `1px solid ${col.id === "perda" ? C.dangerSoft : C.border}`, opacity: loteArrastando?.item === pr ? 0.4 : 1 }}
                      >
                        <div className="text-[10.5px] font-semibold" style={{ ...nums, color: C.sub }}>{pr.lote}</div>
                        <div className="text-[12px] font-medium leading-tight mt-0.5">{pr.nomeReceita}</div>
                        <div className="text-[10.5px] mt-1" style={{ ...nums, color: C.sub }}>{pr.quantidade} {pr.unidadeRendimento} · {pr.responsavel}</div>
                        <div className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded" style={{ background: C.bg, color: C.sub }}>
                          {pr.nomeTurno ?? "—"} · chefe {pr.chefeTurno ?? "—"}
                        </div>
                        {pr.validade && <div className="text-[10px] mt-0.5" style={{ color: C.faint }}>validade {pr.validade}</div>}
                        {pr.motivoPerda && <div className="text-[10.5px] mt-1.5" style={{ color: C.danger }}>{pr.motivoPerda}</div>}

                        {col.id === "em_producao" && (
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => executarAcao(acaoAtualizarStatusProducao(pr.id, "produzido"))} className="flex-1 text-[11px] font-medium py-1.5 rounded-md" style={{ background: C.text, color: "#fff" }}>
                              Concluir
                            </button>
                            <button
                              onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                              className="text-[11px] font-medium py-1.5 px-2 rounded-md"
                              style={{ border: `1px solid ${C.borderStrong}`, color: C.danger }}
                            >
                              Perda
                            </button>
                          </div>
                        )}

                        {col.id === "produzido" && (
                          <button
                            onClick={() => setModalPerda({ loteId: pr.id, motivo: "" })}
                            className="mt-2 w-full text-[11px] font-medium py-1.5 rounded-md"
                            style={{ border: `1px solid ${C.borderStrong}`, color: C.danger }}
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
            style={{ background: showNovaProducao ? C.bg : C.text, color: showNovaProducao ? C.text : "#fff", border: `1px solid ${showNovaProducao ? C.borderStrong : C.text}` }}
          >
            {showNovaProducao ? "Fechar" : "+ Registrar produção"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Detalhamento em porções por prato, com o insumo que vai faltar primeiro. O quadro acima mostra a mesma coisa em lotes.</p>

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
              <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Prato</th>
                <th className="py-2.5 px-3 font-medium text-right">Rende por receita</th>
                <th className="py-2.5 px-3 font-medium text-right">Ainda dá pra fazer</th>
                <th className="py-2.5 px-5 font-medium">Primeiro insumo a faltar</th>
              </tr>
            </thead>
            <tbody>
              {capacidadePratos.map((p) => (
                <tr key={p.receita.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td className="py-2.5 px-5 font-medium">{p.receita.nomePrato}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{p.receita.rendimento} porç{p.receita.rendimento > 1 ? "ões" : "ão"}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={{ ...nums, color: p.porcoesPossiveis !== null && p.porcoesPossiveis < 10 ? C.danger : C.text }}>
                    {p.porcoesPossiveis === null ? <span style={{ color: C.faint, fontWeight: 400 }}>sem estoque rastreado</span> : `${p.porcoesPossiveis} porções`}
                  </td>
                  <td className="py-2.5 px-5" style={{ color: C.sub }}>
                    {p.nomeGargalo ?? "—"}
                    {p.semRastreio > 0 && <span style={{ color: C.faint }}> · {p.semRastreio} insumo{p.semRastreio > 1 ? "s" : ""} fora do cálculo</span>}
                  </td>
                </tr>
              ))}
              {capacidadePratos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-5 text-center" style={{ color: C.faint }}>
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
          <div className="rounded-xl p-5 w-full max-w-sm ftv-panel" style={{ background: C.panel, boxShadow: shadow }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-1">Registrar perda</h3>
            <p className="text-[12px] mb-3" style={{ color: C.sub }}>O que aconteceu com esse lote? O motivo fica registrado pra investigar depois — perda sem motivo não serve pra nada.</p>
            <textarea
              autoFocus
              value={modalPerda.motivo}
              onChange={(e) => setModalPerda({ ...modalPerda, motivo: e.target.value })}
              placeholder="Ex: esqueceu fora da câmara a noite toda, queimou na chapa, validade vencida..."
              className="text-[12.5px] px-2.5 py-2 rounded-md w-full mb-3"
              style={{ border: `1px solid ${C.borderStrong}`, background: C.panel, minHeight: 84 }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalPerda(null)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
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
                style={{ background: C.danger, color: "#fff", opacity: modalPerda.motivo.trim() ? 1 : 0.5 }}
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
