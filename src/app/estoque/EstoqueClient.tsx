"use client";

import { useState } from "react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import { CATEGORIAS, type Insumo } from "@/lib/dominio/insumo";
import type { EstoqueLinha, Movimentacao, TipoMovimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";
import {
  acaoRastrearInsumo,
  acaoAtualizarEstoque,
  acaoPararDeRastrear,
  acaoRegistrarMovimentacao,
  acaoCriarFornecedor,
  acaoAtualizarFornecedor,
  acaoExcluirFornecedor,
} from "./actions";

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function NovoEstoqueForm({ insumosDisponiveis, onCancel, onSaved }: { insumosDisponiveis: Insumo[]; onCancel: () => void; onSaved: () => void }) {
  const [insumoId, setInsumoId] = useState(insumosDisponiveis[0]?.id ?? "");
  const [atual, setAtual] = useState("");
  const [minimo, setMinimo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (insumosDisponiveis.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="text-[12.5px] mb-3" style={{ color: C.sub }}>Todos os insumos cadastrados já têm estoque rastreado. Cadastre um insumo novo na aba Insumos primeiro.</p>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>Fechar</button>
      </div>
    );
  }

  const unidade = insumosDisponiveis.find((i) => i.id === insumoId)?.unidadeMedida ?? "";

  const salvar = async () => {
    if (!insumoId || atual === "" || minimo === "") return;
    setSalvando(true);
    setErro(null);
    const resultado = await acaoRastrearInsumo(insumoId, parseFloat(atual), parseFloat(minimo));
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {insumosDisponiveis.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <input placeholder={`Saldo atual (${unidade})`} type="number" value={atual} onChange={(e) => setAtual(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder={`Estoque mínimo (${unidade})`} type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Adicionar ao estoque"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EditarEstoqueForm({ linha, onCancel, onSaved }: { linha: EstoqueLinha; onCancel: () => void; onSaved: () => void }) {
  const [atual, setAtual] = useState(String(linha.saldoAtual));
  const [minimo, setMinimo] = useState(String(linha.estoqueMinimo));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (atual === "" || minimo === "") return;
    setSalvando(true);
    setErro(null);
    const resultado = await acaoAtualizarEstoque(linha.insumoId, parseFloat(atual), parseFloat(minimo));
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  const pararDeRastrear = async () => {
    if (!window.confirm(`Parar de rastrear "${linha.nome}"? O histórico de movimentações não é apagado.`)) return;
    setSalvando(true);
    const resultado = await acaoPararDeRastrear(linha.insumoId);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <tr>
      <td colSpan={5} className="p-0" style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div className="px-5 py-3 grid grid-cols-4 gap-2 items-start">
          <input placeholder={`Saldo atual (${linha.unidadeMedida})`} type="number" value={atual} onChange={(e) => setAtual(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
          <input placeholder={`Estoque mínimo (${linha.unidadeMedida})`} type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
          <div className="col-span-2 flex gap-2">
            <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
              Salvar
            </button>
            <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
              Cancelar
            </button>
            <button onClick={pararDeRastrear} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg ml-auto" style={{ color: C.danger }}>
              Parar de rastrear
            </button>
          </div>
        </div>
        {erro && (
          <div className="text-[12px] mx-5 mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
            {erro}
          </div>
        )}
      </td>
    </tr>
  );
}

function NovaMovimentacaoForm({ estoque, onCancel, onSaved }: { estoque: EstoqueLinha[]; onCancel: () => void; onSaved: () => void }) {
  const [insumoId, setInsumoId] = useState(estoque[0]?.insumoId ?? "");
  const [tipo, setTipo] = useState<Extract<TipoMovimentacao, "entrada" | "ajuste">>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [origem, setOrigem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (estoque.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="text-[12.5px] mb-3" style={{ color: C.sub }}>Rastreie um insumo primeiro pra poder lançar entrada ou ajuste de estoque.</p>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>Fechar</button>
      </div>
    );
  }

  const unidade = estoque.find((e) => e.insumoId === insumoId)?.unidadeMedida ?? "";

  const salvar = async () => {
    if (!insumoId || !quantidade || !origem.trim()) return;
    setSalvando(true);
    setErro(null);
    const resultado = await acaoRegistrarMovimentacao(insumoId, tipo, parseFloat(quantidade), origem.trim());
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4">
      <div className="flex gap-2 mb-2">
        {([["entrada", "Entrada"], ["ajuste", "Ajuste"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: tipo === id ? C.text : C.panel, color: tipo === id ? "#fff" : C.text, border: `1px solid ${tipo === id ? C.text : C.borderStrong}` }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {estoque.map((e) => (
            <option key={e.insumoId} value={e.insumoId}>{e.nome}</option>
          ))}
        </select>
        <input placeholder={`Quantidade (${unidade})`} type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Origem (ex: compra fornecedor)" value={origem} onChange={(e) => setOrigem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      {tipo === "ajuste" && (
        <p className="text-[11.5px] mb-3" style={{ color: C.faint }}>Ajuste subtrai do saldo atual — serve pra registrar perda ou corrigir contagem pra baixo.</p>
      )}
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Registrar movimentação"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function NovoFornecedorForm({ fornecedor, onCancel, onSaved }: { fornecedor?: Fornecedor; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FornecedorInput>({
    empresa: fornecedor?.empresa ?? "",
    contato: fornecedor?.contato ?? "",
    telefone: fornecedor?.telefone ?? "",
    email: fornecedor?.email ?? "",
    fornece: fornecedor?.fornece ?? "",
    diasEntrega: fornecedor?.diasEntrega ?? "",
    horarioEntrega: fornecedor?.horarioEntrega ?? "",
    prazoUrgencia: fornecedor?.prazoUrgencia ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof FornecedorInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const salvar = async () => {
    if (!f.empresa.trim() || !f.telefone.trim()) return;
    setSalvando(true);
    setErro(null);
    const resultado = fornecedor ? await acaoAtualizarFornecedor(fornecedor.id, f) : await acaoCriarFornecedor(f);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <input placeholder="Empresa" value={f.empresa} onChange={set("empresa")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Nome do contato" value={f.contato} onChange={set("contato")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Telefone" value={f.telefone} onChange={set("telefone")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input placeholder="E-mail" value={f.email} onChange={set("email")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="O que fornece" value={f.fornece} onChange={set("fornece")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <input placeholder="Dias de entrega (ex: Seg, Qua)" value={f.diasEntrega} onChange={set("diasEntrega")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Horário de entrega" value={f.horarioEntrega} onChange={set("horarioEntrega")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Prazo pra pedido de urgência" value={f.prazoUrgencia} onChange={set("prazoUrgencia")} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : fornecedor ? "Salvar alterações" : "Salvar fornecedor"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
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
