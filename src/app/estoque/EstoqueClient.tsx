"use client";

import { useState } from "react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import { NovoEstoqueForm } from "@/components/estoque/NovoEstoqueForm";
import { EditarEstoqueForm } from "@/components/estoque/EditarEstoqueForm";
import { NovaMovimentacaoForm } from "@/components/estoque/NovaMovimentacaoForm";
import { NovoFornecedorForm } from "@/components/estoque/NovoFornecedorForm";
import { CATEGORIAS, type Insumo } from "@/lib/dominio/insumo";
import type { EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import { acaoExcluirFornecedor } from "./actions";

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
  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [showNovoEstoque, setShowNovoEstoque] = useState(false);
  const [editandoInsumoId, setEditandoInsumoId] = useState<string | null>(null);
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);

  const insumosRastreados = new Set(estoque.map((e) => e.insumoId));
  const insumosDisponiveis = insumos.filter((i) => !insumosRastreados.has(i.id));

  const estoqueFiltrado = estoque.filter((e) => !buscaInsumo.trim() || e.nome.toLowerCase().includes(buscaInsumo.trim().toLowerCase()));

  const excluirFornecedorComConfirmacao = async (fornecedor: Fornecedor) => {
    if (!window.confirm(`Excluir "${fornecedor.empresa}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirFornecedor(fornecedor.id);
    if (!resultado.ok) window.alert(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Saldo em armazenamento</h2>
          <button
            onClick={() => setShowNovoEstoque(!showNovoEstoque)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoEstoque ? C.bg : C.text, color: showNovoEstoque ? C.text : "#fff", border: `1px solid ${showNovoEstoque ? C.borderStrong : C.text}` }}
          >
            {showNovoEstoque ? "Fechar" : "+ Rastrear insumo"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Só aparece quem tem movimentação lançada. Insumo sem rastreio não vira zero, fica de fora do cálculo.</p>

        {showNovoEstoque && (
          <Card className="mb-3">
            <NovoEstoqueForm insumosDisponiveis={insumosDisponiveis} onCancel={() => setShowNovoEstoque(false)} onSaved={() => setShowNovoEstoque(false)} />
          </Card>
        )}

        <input
          placeholder="Buscar insumo pelo nome..."
          value={buscaInsumo}
          onChange={(e) => setBuscaInsumo(e.target.value)}
          className="text-[12.5px] px-3 py-2 rounded-lg mb-3 w-full max-w-xs"
          style={inputStyle}
        />

        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
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
                  <>
                    <tr
                      key={e.insumoId}
                      style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }}
                      onClick={() => setEditandoInsumoId(editandoEsteAqui ? null : e.insumoId)}
                    >
                      <td className="py-2.5 px-5 font-medium">{e.nome}</td>
                      <td className="py-2.5 px-3" style={{ color: C.sub }}>{CATEGORIAS.find((c) => c.id === e.categoria)?.label ?? e.categoria}</td>
                      <td className="py-2.5 px-3 text-right font-semibold" style={{ ...nums, color: abaixo ? C.danger : C.text }}>
                        {e.saldoAtual}{e.unidadeMedida}{abaixo && " · repor"}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ ...nums, color: C.sub }}>{e.estoqueMinimo}{e.unidadeMedida}</td>
                      <td className="py-2.5 px-5 text-right" style={nums}>R$ {(e.saldoAtual * e.precoUnitario).toFixed(2)}</td>
                    </tr>
                    {editandoEsteAqui && (
                      <EditarEstoqueForm linha={e} onCancel={() => setEditandoInsumoId(null)} onSaved={() => setEditandoInsumoId(null)} />
                    )}
                  </>
                );
              })}
              {estoqueFiltrado.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: C.faint }}>
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
          <h2 className="text-[14px] font-semibold">Entradas e saídas</h2>
          <button
            onClick={() => setShowNovaMovimentacao(!showNovaMovimentacao)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovaMovimentacao ? C.bg : C.text, color: showNovaMovimentacao ? C.text : "#fff", border: `1px solid ${showNovaMovimentacao ? C.borderStrong : C.text}` }}
          >
            {showNovaMovimentacao ? "Fechar" : "+ Registrar movimentação"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Compra entra, venda e perda saem. Ajuste manual serve pra corrigir contagem ou registrar desperdício.</p>

        {showNovaMovimentacao && (
          <Card className="mb-3">
            <NovaMovimentacaoForm estoque={estoque} onCancel={() => setShowNovaMovimentacao(false)} onSaved={() => setShowNovaMovimentacao(false)} />
          </Card>
        )}

        <Card>
          <div className="px-5 py-1">
            {movimentacoes.map((m, idx) => {
              const label = { entrada: "Entrada", saida_venda: "Saída (venda)", ajuste: "Ajuste" }[m.tipo];
              const cor = m.tipo === "entrada" ? C.text : m.tipo === "ajuste" ? C.danger : C.sub;
              return (
                <div key={m.id} className="flex items-center justify-between text-[12.5px] py-2.5" style={{ borderTop: idx ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <span className="font-medium">{m.nomeInsumo}</span>
                    {m.origem && <span style={{ color: C.faint }}> · {m.origem}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.faint }}>{formatarData(m.criadoEm)}</span>
                    <span style={{ ...nums, color: cor }}>{m.tipo === "entrada" ? "+" : "-"}{m.quantidade}{m.unidadeMedida}</span>
                    <Badge acao={m.tipo === "ajuste"}>{label}</Badge>
                  </div>
                </div>
              );
            })}
            {movimentacoes.length === 0 && (
              <div className="py-6 text-center text-[12.5px]" style={{ color: C.faint }}>
                Nenhuma movimentação registrada ainda.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Fornecedores</h2>
          <button
            onClick={() => {
              setFornecedorEditando(null);
              setShowNovoFornecedor(!showNovoFornecedor);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoFornecedor ? C.bg : C.text, color: showNovoFornecedor ? C.text : "#fff", border: `1px solid ${showNovoFornecedor ? C.borderStrong : C.text}` }}
          >
            {showNovoFornecedor ? "Fechar" : "+ Novo fornecedor"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Contato fica no sistema, não na cabeça de quem faz compra. Se o responsável sai, quem entra assume sem perder telefone, janela de entrega nem prazo de urgência.</p>

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
                    <div className="text-[12px]" style={{ color: C.sub }}>{f.fornece}</div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <div className="text-[13px] font-medium" style={nums}>{f.telefone}</div>
                      <div className="text-[11.5px]" style={{ color: C.sub }}>{f.contato}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pt-0.5">
                      <button
                        onClick={() => {
                          setShowNovoFornecedor(false);
                          setFornecedorEditando(editandoEsteAqui ? null : f);
                        }}
                        className="text-[11.5px] font-medium"
                        style={{ color: C.text }}
                      >
                        editar
                      </button>
                      <button onClick={() => excluirFornecedorComConfirmacao(f)} className="text-[11.5px] font-medium" style={{ color: C.danger }}>
                        excluir
                      </button>
                    </div>
                  </div>
                </div>
                {editandoEsteAqui ? (
                  <NovoFornecedorForm fornecedor={f} onCancel={() => setFornecedorEditando(null)} onSaved={() => setFornecedorEditando(null)} />
                ) : (
                  <div className="grid grid-cols-4 gap-3 text-[11.5px]" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div>
                      <div style={{ color: C.faint }}>E-mail</div>
                      <div className="mt-0.5">{f.email || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: C.faint }}>Dias de entrega</div>
                      <div className="mt-0.5">{f.diasEntrega || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: C.faint }}>Horário</div>
                      <div className="mt-0.5">{f.horarioEntrega || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: C.faint }}>Pedido de urgência</div>
                      <div className="mt-0.5">{f.prazoUrgencia || "—"}</div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {fornecedores.length === 0 && (
            <div className="text-[12.5px] py-4" style={{ color: C.faint }}>
              Nenhum fornecedor cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
