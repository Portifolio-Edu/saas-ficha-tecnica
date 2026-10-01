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
import { ContagensCegas } from "@/components/estoque/ContagensCegas";
import { CATEGORIAS, type Insumo } from "@/lib/dominio/insumo";
import type { ContagemCega, EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirFornecedor, acaoResolverRequisicoes } from "./actions";
import { abrirAgenteIaComFoco } from "@/components/ia/BotaoAgenteIa";
import { formatBRL, formatQtd } from "@/components/charts/format";
import { ItemMovel, ListaMovel } from "@/components/ficha/ListaMovel";
import { CATEGORIAS_PEDIDO, diasDeEntregaTexto } from "@/lib/dominio/requisicao";
import { PedidosDaCozinha } from "@/components/estoque/PedidosDaCozinha";
import type { Requisicao, StatusRequisicao } from "@/lib/dominio/requisicao";

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function EstoqueClient({
  insumos,
  estoque,
  movimentacoes,
  fornecedores,
  contagens = [],
  requisicoes = [],
  nomeRestaurante = "",
  resolverPedidos = acaoResolverRequisicoes,
}: {
  insumos: Insumo[];
  estoque: EstoqueLinha[];
  movimentacoes: Movimentacao[];
  fornecedores: Fornecedor[];
  /** EQUIPE (2026-09-25): contagens cegas; a página só manda pra dono e gestor. */
  contagens?: ContagemCega[];
  /** PEDIDOS DA COZINHA (2026-09-26): pedidos de compra da cozinha. */
  requisicoes?: Requisicao[];
  nomeRestaurante?: string;
  /** Na demo, grava no "banco" do navegador. */
  resolverPedidos?: (ids: string[], status: StatusRequisicao) => Promise<{ ok: true } | { ok: false; erro: string }>;
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

  // CELULAR (2026-09-26): "o que preciso repor?" é a pergunta de quem abre o
  // estoque fora do restaurante; o filtro responde num toque (vale no computador também).
  const [soRepor, setSoRepor] = useState(false);
  const aRepor = listaEstoque.filter((e) => e.saldoAtual < e.estoqueMinimo);
  const valorParado = listaEstoque.reduce((t, e) => t + e.saldoAtual * e.precoUnitario, 0);
  const estoqueFiltrado = listaEstoque.filter(
    (e) => (!soRepor || e.saldoAtual < e.estoqueMinimo) && (!buscaInsumo.trim() || e.nome.toLowerCase().includes(buscaInsumo.trim().toLowerCase())),
  );

  const excluirFornecedorComConfirmacao = async (fornecedor: Fornecedor) => {
    if (!window.confirm(`Excluir "${fornecedor.empresa}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirFornecedor(fornecedor.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <PedidosDaCozinha requisicoes={requisicoes} fornecedores={fornecedores} nomeRestaurante={nomeRestaurante} resolver={resolverPedidos} />
      <ContagensCegas contagens={contagens} />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Saldo em armazenamento</h2>
          <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="search"
            aria-label="Buscar insumo pelo nome"
            placeholder="Buscar insumo pelo nome..."
            value={buscaInsumo}
            onChange={(e) => setBuscaInsumo(e.target.value)}
            className="text-[15px] md:text-[14px] px-3 min-h-[var(--alvo-toque)] rounded-lg w-full md:max-w-xs"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setSoRepor(!soRepor)}
            aria-pressed={soRepor}
            className="text-[13px] font-medium px-3 min-h-10 rounded-lg border"
            style={{
              borderColor: soRepor ? "var(--danger)" : "var(--linha-forte)",
              background: soRepor ? "color-mix(in srgb, var(--danger) 10%, transparent)" : "var(--panel)",
              color: aRepor.length ? "var(--danger)" : "var(--tinta-sub)",
            }}
          >
            {aRepor.length ? `Repor agora (${aRepor.length})` : "Nada abaixo do mínimo"}
          </button>
          <span className="text-[13px] text-[var(--tinta-sub)] ml-auto" style={nums}>
            Valor parado: <strong className="text-[var(--tinta)]">{formatBRL(valorParado)}</strong>
          </span>
        </div>

        <Card>
          <ListaMovel rotulo="Saldo por insumo">
            {estoqueFiltrado.map((e) => {
              const abaixo = e.saldoAtual < e.estoqueMinimo;
              const aberto = editandoInsumoId === e.insumoId;
              return (
                <ItemMovel
                  key={e.insumoId}
                  titulo={e.nome}
                  subtitulo={CATEGORIAS.find((c) => c.id === e.categoria)?.label ?? e.categoria}
                  valor={`${e.saldoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${e.unidadeMedida}`}
                  corValor={abaixo ? "var(--danger)" : undefined}
                  detalhe={abaixo ? `repor · mín. ${e.estoqueMinimo.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${e.unidadeMedida}` : `${formatBRL(e.saldoAtual * e.precoUnitario)} parado`}
                  aberto={aberto}
                  aoTocar={() => setEditandoInsumoId(aberto ? null : e.insumoId)}
                >
                  <EditarEstoqueForm bloco linha={e} onCancel={() => setEditandoInsumoId(null)} onSaved={() => setEditandoInsumoId(null)} />
                </ItemMovel>
              );
            })}
            {estoqueFiltrado.length === 0 && (
              <li className="py-6 px-4 text-center text-[14px]" style={{ color: "var(--faint)" }}>
                {soRepor ? "Nada abaixo do mínimo." : "Nenhum insumo rastreado ainda."}
              </li>
            )}
          </ListaMovel>
          <table className="hidden md:table w-full text-[12.5px]">
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Entradas e saídas</h2>
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="px-4 md:px-5 py-1">
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
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 text-[14px] py-3" style={{ borderTop: idx ? `1px solid ${"var(--border)"}` : "none" }}>
                  <div>
                    <span className="font-medium text-[var(--tinta)]">{m.nomeInsumo}</span>
                    {m.origem && <span className="text-[var(--tinta-sub)] text-[13px]"> · {m.origem}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
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
            const prazo = f.pedidoAte
              ? `até ${f.pedidoAte.replace(":00", "h")}${f.pedidoAntecedencia === 0 ? " do dia" : f.pedidoAntecedencia === 1 ? " do dia anterior" : `, ${f.pedidoAntecedencia} dias antes`}`
              : f.pedidoAntecedencia === 0 ? "no próprio dia" : `${f.pedidoAntecedencia} dia${f.pedidoAntecedencia > 1 ? "s" : ""} antes`;
            return (
              <Card key={f.id} className="p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="text-[15px] md:text-[13.5px] font-semibold">{f.empresa}</div>
                    <div className="text-[13px] md:text-[12px]" style={{ color: "var(--sub)" }}>{[f.fornece, f.contato].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`} className="text-[14px] md:text-[13px] font-medium px-2 min-h-10 inline-flex items-center rounded-lg hover:bg-[var(--panel-hover)]" style={nums}>
                      {f.telefone}
                    </a>
                    <button
                      onClick={() => {
                        setShowNovoFornecedor(false);
                        setFornecedorEditando(editandoEsteAqui ? null : f);
                      }}
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
                {editandoEsteAqui ? (
                  <NovoFornecedorForm fornecedor={f} onCancel={() => setFornecedorEditando(null)} onSaved={() => setFornecedorEditando(null)} />
                ) : (
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px] md:text-[12px]" style={{ borderTop: `1px solid ${"var(--border)"}`, paddingTop: 12 }}>
                    <div>
                      <dt style={{ color: "var(--faint)" }}>Entrega</dt>
                      <dd className="mt-0.5">
                        {f.entregaDias.length ? diasDeEntregaTexto(f.entregaDias) : "—"}
                        {f.horarioEntrega ? ` · ${f.horarioEntrega}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--faint)" }}>Pedido</dt>
                      <dd className="mt-0.5">{f.entregaDias.length ? prazo : "—"}</dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--faint)" }}>Atende a cozinha em</dt>
                      <dd className="mt-0.5">
                        {f.categoriasPedido.length ? f.categoriasPedido.map((c) => CATEGORIAS_PEDIDO.find((x) => x.id === c)?.rotulo).join(", ") : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--faint)" }}>Urgência</dt>
                      <dd className="mt-0.5">{f.prazoUrgencia || "—"}</dd>
                    </div>
                  </dl>
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
