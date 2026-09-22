"use client";

// SISTEMA premium (2026-09-22): botões do agente (demo) neutros, selos de movimentação em
// retângulo com cores de token, títulos de seção 16px, linhas de 14px. Versão anterior:
// `git show 4f29ec6:src/app/estoque/EstoqueClient.tsx`.

import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Camera, Mic } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { inputStyle, nums } from "@/components/ficha/tema";
import { NovoEstoqueForm } from "@/components/estoque/NovoEstoqueForm";
import { EditarEstoqueForm } from "@/components/estoque/EditarEstoqueForm";
import { NovaMovimentacaoForm } from "@/components/estoque/NovaMovimentacaoForm";
import { NovoFornecedorForm } from "@/components/estoque/NovoFornecedorForm";
import { CATEGORIAS, type Insumo } from "@/lib/dominio/insumo";
import type { EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirFornecedor } from "./actions";
import { abrirAgenteIaComFoco } from "@/components/ia/BotaoAgenteIa";
import { formatBRL, formatQtd } from "@/components/charts/format";

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function EstoqueClient({
  insumos,
  estoque,
  movimentacoes,
  fornecedores,
}: {
  insumos: Insumo[];
  estoque: EstoqueLinha[];
  movimentacoes: Movimentacao[];
  fornecedores: Fornecedor[];
}) {
  const pathname = usePathname();
  const emModoDemo = pathname?.startsWith("/preview");

  // Estado local só alimenta a demo (/preview, sem banco). Fora dela as listas
  // vêm das props, que o servidor atualiza quando a server action revalida a rota.
  const [estoqueDemo, setListaEstoque] = useState<EstoqueLinha[]>(estoque);
  const [movimentacoesDemo, setListaMovimentacoes] = useState<Movimentacao[]>(movimentacoes);
  const listaEstoque = emModoDemo ? estoqueDemo : estoque;
  const listaMovimentacoes = emModoDemo ? movimentacoesDemo : movimentacoes;

  useEffect(() => {
    if (!emModoDemo) return;

    const carregarDadosDemo = () => {
      try {
        const salvoMov = localStorage.getItem("demo_movimentacoes");
        if (salvoMov) {
          const parsed = JSON.parse(salvoMov);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListaMovimentacoes(parsed);
          }
        } else {
          localStorage.setItem("demo_movimentacoes", JSON.stringify(movimentacoes));
        }

        const salvoEst = localStorage.getItem("demo_estoque");
        if (salvoEst) {
          const parsed = JSON.parse(salvoEst);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListaEstoque(parsed);
          }
        } else {
          localStorage.setItem("demo_estoque", JSON.stringify(estoque));
        }
      } catch {}
    };

    carregarDadosDemo();

    // Sincroniza em tempo real caso uma produção ou agente IA lance dados
    const escutarStorage = (e: Event) => {
      const se = e as StorageEvent;
      if (!se.key || se.key === "demo_movimentacoes" || se.key === "demo_estoque") {
        carregarDadosDemo();
      }
    };
    window.addEventListener("storage", escutarStorage);
    return () => window.removeEventListener("storage", escutarStorage);
  }, [emModoDemo, estoque, movimentacoes]);

  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [showNovoEstoque, setShowNovoEstoque] = useState(false);
  const [editandoInsumoId, setEditandoInsumoId] = useState<string | null>(null);
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const { mostrarErro } = useToast();

  const insumosRastreados = new Set(listaEstoque.map((e) => e.insumoId));
  const insumosDisponiveis = insumos.filter((i) => !insumosRastreados.has(i.id));

  const estoqueFiltrado = listaEstoque.filter((e) => !buscaInsumo.trim() || e.nome.toLowerCase().includes(buscaInsumo.trim().toLowerCase()));

  const excluirFornecedorComConfirmacao = async (fornecedor: Fornecedor) => {
    if (!window.confirm(`Excluir "${fornecedor.empresa}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirFornecedor(fornecedor.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Saldo em armazenamento</h2>
          <div className="flex items-center gap-2">
            {emModoDemo && (
            <button
              onClick={() => abrirAgenteIaComFoco()}
              type="button"
              className="flex items-center gap-2 text-[13px] font-medium px-3 min-h-10 rounded-lg border transition-colors hover:bg-[var(--panel-hover)]"
              // SISTEMA premium: botão neutro do agente (demo), igual ao da barra. Antes: degradê colorido.
              style={{ background: "var(--panel)", borderColor: "var(--linha)", color: "var(--tinta)" }}
              title="Ler foto de nota fiscal ou rótulo de fornecedor com IA"
            >
              <Camera size={15} style={{ color: "var(--marca)" }} />
              <span>Ler nota ou rótulo com IA</span>
            </button>
            )}
            <button
              onClick={() => setShowNovoEstoque(!showNovoEstoque)}
              className="text-[13px] font-medium px-3.5 min-h-10 rounded-lg"
              style={{ background: showNovoEstoque ? "var(--bg)" : "var(--accent)", color: showNovoEstoque ? "var(--text)" : "#fff", border: `1px solid ${showNovoEstoque ? "var(--border-strong)" : "var(--accent)"}` }}
            >
              {showNovoEstoque ? "Fechar" : "+ Rastrear insumo"}
            </button>
          </div>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Só aparece quem tem movimentação lançada. Insumo sem rastreio não vira zero, fica de fora do cálculo.</p>

        {showNovoEstoque && (
          <Card className="mb-3">
            <NovoEstoqueForm insumosDisponiveis={insumosDisponiveis} onCancel={() => setShowNovoEstoque(false)} onSaved={() => setShowNovoEstoque(false)} />
          </Card>
        )}

        <input
          placeholder="Buscar insumo pelo nome..."
          value={buscaInsumo}
          onChange={(e) => setBuscaInsumo(e.target.value)}
          className="text-[14px] px-3 min-h-[var(--alvo-toque)] rounded-lg mb-3 w-full max-w-xs"
          style={inputStyle}
        />

        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Insumo</th>
                <th className="py-2.5 px-3 font-medium">Categoria</th>
                <th className="py-2.5 px-3 font-medium text-right">Saldo atual</th>
                <th className="py-2.5 px-3 font-medium text-right">Estoque mínimo</th>
                <th className="py-2.5 px-5 font-medium text-right">Valor parado</th>
              </tr>
            </thead>
            <tbody>
              {estoqueFiltrado.map((e) => {
                const abaixo = e.saldoAtual < e.estoqueMinimo;
                const editandoEsteAqui = editandoInsumoId === e.insumoId;
                return (
                  <Fragment key={e.insumoId}>
                    <tr
                      style={{ borderTop: `1px solid ${"var(--border)"}`, cursor: "pointer" }}
                      onClick={() => setEditandoInsumoId(editandoEsteAqui ? null : e.insumoId)}
                    >
                      <td className="py-2.5 px-5 font-medium">{e.nome}</td>
                      <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{CATEGORIAS.find((c) => c.id === e.categoria)?.label ?? e.categoria}</td>
                      <td className="py-2.5 px-3 text-right font-semibold" style={{ ...nums, color: abaixo ? "var(--danger)" : "var(--text)" }}>
                        {e.saldoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{e.unidadeMedida}{abaixo && " · repor"}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ ...nums, color: "var(--sub)" }}>{e.estoqueMinimo.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{e.unidadeMedida}</td>
                      <td className="py-2.5 px-5 text-right" style={nums}>{formatBRL(e.saldoAtual * e.precoUnitario)}</td>
                    </tr>
                    {editandoEsteAqui && (
                      <EditarEstoqueForm linha={e} onCancel={() => setEditandoInsumoId(null)} onSaved={() => setEditandoInsumoId(null)} />
                    )}
                  </Fragment>
                );
              })}
              {estoqueFiltrado.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>
                    Nenhum insumo rastreado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Entradas e saídas</h2>
          <div className="flex items-center gap-2">
            {emModoDemo && (
            <button
              onClick={() => abrirAgenteIaComFoco()}
              type="button"
              className="flex items-center gap-2 text-[13px] font-medium px-3 min-h-10 rounded-lg border transition-colors hover:bg-[var(--panel-hover)]"
              // SISTEMA premium: botão neutro do agente (demo), igual ao da barra. Antes: degradê colorido.
              style={{ background: "var(--panel)", borderColor: "var(--linha)", color: "var(--tinta)" }}
              title="Lançar movimentação por comando de voz ou WhatsApp"
            >
              <Mic size={15} style={{ color: "var(--marca)" }} />
              <span>Lançar por áudio</span>
            </button>
            )}
            <button
              onClick={() => setShowNovaMovimentacao(!showNovaMovimentacao)}
              className="text-[13px] font-medium px-3.5 min-h-10 rounded-lg"
              style={{ background: showNovaMovimentacao ? "var(--bg)" : "var(--accent)", color: showNovaMovimentacao ? "var(--text)" : "#fff", border: `1px solid ${showNovaMovimentacao ? "var(--border-strong)" : "var(--accent)"}` }}
            >
              {showNovaMovimentacao ? "Fechar" : "+ Registrar movimentação"}
            </button>
          </div>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Compra entra, venda e perda saem. Ajuste manual serve pra corrigir contagem ou registrar desperdício.</p>

        {showNovaMovimentacao && (
          <Card className="mb-3">
            <NovaMovimentacaoForm
              estoque={listaEstoque}
              onCancel={() => setShowNovaMovimentacao(false)}
              onSaved={() => setShowNovaMovimentacao(false)}
              onSalvarDemo={
                emModoDemo
                  ? (dados) => {
                      const agora = new Date();
                      const insumoAlvo = insumos.find((i) => i.id === dados.insumoId);
                      const novaMov: Movimentacao = {
                        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        insumoId: dados.insumoId,
                        nomeInsumo: insumoAlvo?.nome ?? "Insumo",
                        unidadeMedida: insumoAlvo?.unidadeMedida ?? "kg",
                        tipo: dados.tipo,
                        quantidade: dados.quantidade,
                        origem: dados.origem,
                        criadoEm: agora.toISOString(),
                      };
                      const atualizadas = [novaMov, ...listaMovimentacoes];
                      setListaMovimentacoes(atualizadas);
                      try {
                        localStorage.setItem("demo_movimentacoes", JSON.stringify(atualizadas));
                      } catch {}

                      // Atualizar saldo do estoque
                      const delta = dados.tipo === "entrada" ? dados.quantidade : -dados.quantidade;
                      const novoEstoque = listaEstoque.map((e) =>
                        e.insumoId === dados.insumoId
                          ? { ...e, saldoAtual: Math.max(0, Number((e.saldoAtual + delta).toFixed(3))) }
                          : e
                      );
                      setListaEstoque(novoEstoque);
                      try {
                        localStorage.setItem("demo_estoque", JSON.stringify(novoEstoque));
                      } catch {}
                      setShowNovaMovimentacao(false);
                    }
                  : undefined
              }
            />
          </Card>
        )}

        <Card>
          <div className="px-5 py-1">
            {listaMovimentacoes.map((m, idx) => {
              const isSaidaProducao = m.tipo === "saida_producao" || (!!m.origem && m.origem.toLowerCase().includes("produção"));
              const label = isSaidaProducao
                ? "Saída (produção)"
                : { entrada: "Entrada", saida_venda: "Saída (venda)", ajuste: "Ajuste", saida_producao: "Saída (produção)" }[m.tipo] || "Saída";
              const cor = m.tipo === "entrada"
                ? "var(--sucesso)"
                : isSaidaProducao
                ? "var(--etapa-producao-texto)"
                : m.tipo === "ajuste"
                ? "var(--danger)"
                : "var(--sub)";
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 text-[14px] py-3" style={{ borderTop: idx ? `1px solid ${"var(--border)"}` : "none" }}>
                  <div>
                    <span className="font-medium text-[var(--tinta)]">{m.nomeInsumo}</span>
                    {m.origem && <span className="text-[var(--tinta-sub)] text-[13px]"> · {m.origem}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--tinta-faint)" }}>{formatarData(m.criadoEm)}</span>
                    <span className="whitespace-nowrap" style={{ ...nums, color: cor, fontWeight: 600 }}>
                      {m.tipo === "entrada" ? "+" : "-"}{formatQtd(Math.abs(m.quantidade))}{m.unidadeMedida}
                    </span>
                    {/* SISTEMA premium: selo em retângulo, cor do tipo via tokens (saída de produção usa a
                        cor da etapa "em produção"). Antes: pílula com rgba fixos e #F59E0B solto. */}
                    <span
                      className="text-[12px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
                      style={{ backgroundColor: `color-mix(in srgb, ${cor} 11%, transparent)`, color: cor }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
            {listaMovimentacoes.length === 0 && (
              <div className="py-6 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>
                Nenhuma movimentação registrada ainda.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Fornecedores</h2>
          <button
            onClick={() => {
              setFornecedorEditando(null);
              setShowNovoFornecedor(!showNovoFornecedor);
            }}
            className="text-[13px] font-medium px-3.5 min-h-10 rounded-lg"
            style={{ background: showNovoFornecedor ? "var(--bg)" : "var(--accent)", color: showNovoFornecedor ? "var(--text)" : "#fff", border: `1px solid ${showNovoFornecedor ? "var(--border-strong)" : "var(--accent)"}` }}
          >
            {showNovoFornecedor ? "Fechar" : "+ Novo fornecedor"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Contato fica no sistema, não na cabeça de quem faz compra. Se o responsável sai, quem entra assume sem perder telefone, janela de entrega nem prazo de urgência.</p>

        {showNovoFornecedor && (
          <Card className="mb-3">
            <NovoFornecedorForm onCancel={() => setShowNovoFornecedor(false)} onSaved={() => setShowNovoFornecedor(false)} />
          </Card>
        )}

        <div className="space-y-3">
          {fornecedores.map((f) => {
            const editandoEsteAqui = fornecedorEditando?.id === f.id;
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[13.5px] font-semibold">{f.empresa}</div>
                    <div className="text-[12px]" style={{ color: "var(--sub)" }}>{f.fornece}</div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <div className="text-[13px] font-medium" style={nums}>{f.telefone}</div>
                      <div className="text-[11.5px]" style={{ color: "var(--sub)" }}>{f.contato}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pt-0.5">
                      <button
                        onClick={() => {
                          setShowNovoFornecedor(false);
                          setFornecedorEditando(editandoEsteAqui ? null : f);
                        }}
                        // SISTEMA premium: ações com 40px de alvo (antes texto de 11,5px sem área de toque).
                        className="text-[13px] font-medium px-3 min-h-10 rounded-lg hover:bg-[var(--panel-hover)]"
                        style={{ color: "var(--text)" }}
                      >
                        Editar
                      </button>
                      <button onClick={() => excluirFornecedorComConfirmacao(f)} className="text-[13px] font-medium px-3 min-h-10 rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--danger)" }}>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
                {editandoEsteAqui ? (
                  <NovoFornecedorForm fornecedor={f} onCancel={() => setFornecedorEditando(null)} onSaved={() => setFornecedorEditando(null)} />
                ) : (
                  <div className="grid grid-cols-4 gap-3 text-[11.5px]" style={{ borderTop: `1px solid ${"var(--border)"}`, paddingTop: 12 }}>
                    <div>
                      <div style={{ color: "var(--faint)" }}>E-mail</div>
                      <div className="mt-0.5">{f.email || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--faint)" }}>Dias de entrega</div>
                      <div className="mt-0.5">{f.diasEntrega || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--faint)" }}>Horário</div>
                      <div className="mt-0.5">{f.horarioEntrega || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--faint)" }}>Pedido de urgência</div>
                      <div className="mt-0.5">{f.prazoUrgencia || "—"}</div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {fornecedores.length === 0 && (
            <div className="text-[12.5px] py-4" style={{ color: "var(--faint)" }}>
              Nenhum fornecedor cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
