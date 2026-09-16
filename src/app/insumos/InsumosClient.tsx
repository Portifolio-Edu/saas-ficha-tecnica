"use client";

import { useState } from "react";
import { CookingPot } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import { CATEGORIAS, UNIDADES, type Categoria, type Insumo, type InsumoInput } from "@/lib/dominio/insumo";
import type { LinhaFichaInput, Receita, ReceitaInput } from "@/lib/dominio/receita";
import { construirContexto, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import type { UnidadeMedida } from "@/lib/calculo/types";
import {
  acaoCriarInsumo,
  acaoAtualizarInsumo,
  acaoExcluirInsumo,
  acaoCriarPreparo,
  acaoAtualizarPreparo,
  acaoExcluirPreparo,
} from "./actions";

function InsumoForm({
  insumo,
  onCancel,
  onSaved,
}: {
  insumo?: Insumo;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(insumo?.nome ?? "");
  const [categoria, setCategoria] = useState<Categoria>(insumo?.categoria ?? "outro");
  const [unidade, setUnidade] = useState<UnidadeMedida>(insumo?.unidadeMedida ?? "kg");
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState(insumo ? String(insumo.tamanhoEmbalagem) : "");
  const [precoEmbalagem, setPrecoEmbalagem] = useState(insumo ? String(insumo.precoEmbalagem) : "");
  const [fc, setFc] = useState(insumo ? String(insumo.fatorCorrecao) : "1");
  const [pesoPorUnidade, setPesoPorUnidade] = useState(insumo?.pesoPorUnidade != null ? String(insumo.pesoPorUnidade) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim() || !tamanhoEmbalagem || !precoEmbalagem) return;
    setSalvando(true);
    setErro(null);
    const input: InsumoInput = {
      nome: nome.trim(),
      categoria,
      unidadeMedida: unidade,
      tamanhoEmbalagem: parseFloat(tamanhoEmbalagem),
      precoEmbalagem: parseFloat(precoEmbalagem),
      fatorCorrecao: parseFloat(fc) || 1,
      pesoPorUnidade: unidade === "un" && pesoPorUnidade ? parseFloat(pesoPorUnidade) : null,
    };
    const resultado = insumo ? await acaoAtualizarInsumo(insumo.id, input) : await acaoCriarInsumo(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4" style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
      <div className="grid grid-cols-6 gap-2 mb-2">
        <input placeholder="Nome do insumo" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeMedida)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <input placeholder="FC" type="number" step="0.01" value={fc} onChange={(e) => setFc(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <input placeholder="Tamanho embalagem" type="number" value={tamanhoEmbalagem} onChange={(e) => setTamanhoEmbalagem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Preço pago (R$)" type="number" value={precoEmbalagem} onChange={(e) => setPrecoEmbalagem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        {unidade === "un" && (
          <input placeholder="Peso por unidade (kg)" type="number" value={pesoPorUnidade} onChange={(e) => setPesoPorUnidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        )}
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : insumo ? "Salvar alterações" : "Salvar insumo"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PreparoForm({
  insumos,
  preparo,
  onCancel,
  onSaved,
}: {
  insumos: Insumo[];
  preparo?: Receita;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(preparo?.nomePrato ?? "");
  const [rendimento, setRendimento] = useState(preparo ? String(preparo.rendimento) : "");
  const [unidadeRendimento, setUnidadeRendimento] = useState(preparo?.unidadeRendimento ?? "kg");
  const [ficha, setFicha] = useState<LinhaFichaInput[]>(
    preparo?.ficha.map((f) => ({ insumoId: f.insumoId, subReceitaId: null, pesoLiquido: f.pesoLiquido, unidade: f.unidade })) ?? [],
  );
  const [linhaInsumoId, setLinhaInsumoId] = useState(insumos[0]?.id ?? "");
  const [linhaPeso, setLinhaPeso] = useState("");
  const [linhaUnidade, setLinhaUnidade] = useState<UnidadeMedida>(insumos[0]?.unidadeMedida ?? "kg");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

  const addLinha = () => {
    if (!linhaInsumoId || !linhaPeso) return;
    setFicha([...ficha, { insumoId: linhaInsumoId, subReceitaId: null, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade }]);
    setLinhaPeso("");
  };
  const removerLinha = (idx: number) => setFicha(ficha.filter((_, i) => i !== idx));

  const salvar = async () => {
    if (!nome.trim() || !rendimento || ficha.length === 0) return;
    setSalvando(true);
    setErro(null);
    const input: ReceitaInput = {
      nomePrato: nome.trim(),
      tipo: "preparo_base",
      categoria: null,
      precoVenda: null,
      vendasMes: null,
      rendimento: parseFloat(rendimento),
      unidadeRendimento,
      pesoPorcaoG: null,
      formaFisica: "solido",
      destinoVenda: "proprio",
      margemAlvo: null,
      modoPreparo: preparo?.modoPreparo ?? null,
      ficha,
    };
    const resultado = preparo ? await acaoAtualizarPreparo(preparo.id, input) : await acaoCriarPreparo(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4" style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <input placeholder="Nome da receita" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-3" style={inputStyle} />
        <input placeholder="Rende" type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <select value={unidadeRendimento} onChange={(e) => setUnidadeRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {ficha.length > 0 && (
        <div className="mb-3 space-y-1">
          {ficha.map((f, idx) => {
            const insumo = insumoPorId.get(f.insumoId!);
            return (
              <div key={idx} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <span>
                  {insumo?.nome} · {f.pesoLiquido}
                  {f.unidade}
                </span>
                <button onClick={() => removerLinha(idx)} style={{ color: C.danger }}>
                  remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <select
          value={linhaInsumoId}
          onChange={(e) => {
            setLinhaInsumoId(e.target.value);
            setLinhaUnidade(insumoPorId.get(e.target.value)?.unidadeMedida ?? "kg");
          }}
          className="text-[12.5px] px-2.5 py-1.5 rounded-md flex-1"
          style={inputStyle}
        >
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <input placeholder="Peso líquido" type="number" value={linhaPeso} onChange={(e) => setLinhaPeso(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md w-28" style={inputStyle} />
        <select value={linhaUnidade} onChange={(e) => setLinhaUnidade(e.target.value as UnidadeMedida)} className="text-[12.5px] px-2.5 py-1.5 rounded-md w-20" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button onClick={addLinha} className="text-[12.5px] font-medium px-3 py-1.5 rounded-md" style={{ border: `1px solid ${C.borderStrong}` }}>
          + ingrediente
        </button>
      </div>

      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : preparo ? "Salvar alterações" : "Salvar receita"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function InsumosClient({
  insumos,
  preparos,
  todasReceitas,
  processamentos,
}: {
  insumos: Insumo[];
  preparos: Receita[];
  todasReceitas: Receita[];
  processamentos: Processamento[];
}) {
  const [showNovoInsumo, setShowNovoInsumo] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState<Insumo | null>(null);
  const [showNovoPreparo, setShowNovoPreparo] = useState(false);
  const [preparoEditando, setPreparoEditando] = useState<Receita | null>(null);

  const contexto = construirContexto(insumos, todasReceitas, processamentos);
  const lotesProteina = processamentos.map(paraProcessamentoCalc);

  const excluirInsumoComConfirmacao = async (insumo: Insumo) => {
    if (!window.confirm(`Excluir "${insumo.nome}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirInsumo(insumo.id);
    if (!resultado.ok) window.alert(resultado.erro);
  };

  const excluirPreparoComConfirmacao = async (preparo: Receita) => {
    if (!window.confirm(`Excluir "${preparo.nomePrato}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirPreparo(preparo.id);
    if (!resultado.ok) window.alert(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <Card>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-[13px] font-semibold">Insumos comprados</h2>
          <button
            onClick={() => {
              setInsumoEditando(null);
              setShowNovoInsumo(!showNovoInsumo);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoInsumo ? C.bg : C.text, color: showNovoInsumo ? C.text : "#fff", border: `1px solid ${showNovoInsumo ? C.borderStrong : C.text}` }}
          >
            {showNovoInsumo ? "Fechar" : "+ Novo insumo"}
          </button>
        </div>
        {showNovoInsumo && <InsumoForm onCancel={() => setShowNovoInsumo(false)} onSaved={() => setShowNovoInsumo(false)} />}
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ color: C.faint }} className="text-left text-[11px] uppercase tracking-wide">
              <th className="py-2.5 px-5 font-medium">Insumo</th>
              <th className="py-2.5 px-3 font-medium">Categoria</th>
              <th className="py-2.5 px-3 font-medium">Unidade</th>
              <th className="py-2.5 px-3 font-medium">Embalagem</th>
              <th className="py-2.5 px-3 font-medium text-right">Preço pago</th>
              <th className="py-2.5 px-3 font-medium text-right">Preço/unid.</th>
              <th className="py-2.5 px-3 font-medium text-right">FC</th>
              <th className="py-2.5 px-3 font-medium text-right">Estoque</th>
              <th className="py-2.5 px-5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => {
              const abaixoMinimo = i.estoque && i.estoque.saldoAtual < i.estoque.estoqueMinimo;
              const editandoEsteAqui = insumoEditando?.id === i.id;
              return (
                <>
                  <tr key={i.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="py-2.5 px-5">{i.nome}</td>
                    <td className="py-2.5 px-3" style={{ color: C.sub }}>{CATEGORIAS.find((c) => c.id === i.categoria)?.label ?? i.categoria}</td>
                    <td className="py-2.5 px-3" style={{ color: C.sub }}>{i.unidadeMedida}</td>
                    <td className="py-2.5 px-3" style={{ color: C.sub }}>{i.tamanhoEmbalagem} {i.unidadeMedida}</td>
                    <td className="py-2.5 px-3 text-right" style={nums}>R$ {i.precoEmbalagem.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={nums}>R$ {i.precoUnitario.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={{ ...nums, color: i.fatorCorrecao > 1 ? C.danger : C.faint }}>{i.fatorCorrecao.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={{ ...nums, color: abaixoMinimo ? C.danger : C.text }}>
                      {i.estoque ? `${i.estoque.saldoAtual}${i.unidadeMedida}${abaixoMinimo ? " · abaixo do mín." : ""}` : <span style={{ color: C.faint }}>não rastreado</span>}
                    </td>
                    <td className="py-2.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setShowNovoInsumo(false);
                          setInsumoEditando(editandoEsteAqui ? null : i);
                        }}
                        className="text-[11.5px] font-medium mr-3"
                        style={{ color: C.text }}
                      >
                        editar
                      </button>
                      <button onClick={() => excluirInsumoComConfirmacao(i)} className="text-[11.5px] font-medium" style={{ color: C.danger }}>
                        excluir
                      </button>
                    </td>
                  </tr>
                  {editandoEsteAqui && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <InsumoForm insumo={i} onCancel={() => setInsumoEditando(null)} onSaved={() => setInsumoEditando(null)} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {insumos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 px-5 text-center text-[12.5px]" style={{ color: C.faint }}>
                  Nenhum insumo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-semibold">Preparos próprios</h2>
          <button
            onClick={() => {
              setPreparoEditando(null);
              setShowNovoPreparo(!showNovoPreparo);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoPreparo ? C.bg : C.text, color: showNovoPreparo ? C.text : "#fff", border: `1px solid ${showNovoPreparo ? C.borderStrong : C.text}` }}
            disabled={insumos.length === 0}
            title={insumos.length === 0 ? "Cadastre um insumo primeiro" : undefined}
          >
            {showNovoPreparo ? "Fechar" : "+ Nova receita"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>
          Receitas feitas na casa que viram componente de outros pratos.
        </p>
        {showNovoPreparo && (
          <Card className="mb-3">
            <PreparoForm insumos={insumos} onCancel={() => setShowNovoPreparo(false)} onSaved={() => setShowNovoPreparo(false)} />
          </Card>
        )}
        <div className="space-y-3">
          {preparos.map((prep) => {
            const editandoEsteAqui = preparoEditando?.id === prep.id;
            const custoUnitario = calcularCustoPorPorcao(prep.id, contexto);
            return (
              <Card key={prep.id}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2">
                    <CookingPot size={14} style={{ color: C.sub }} />
                    <span className="text-[13px] font-semibold">{prep.nomePrato}</span>
                    <Badge>preparo próprio</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[12px]" style={{ ...nums, color: C.sub }}>
                      rende {prep.rendimento}{prep.unidadeRendimento} · R$ {custoUnitario.toFixed(2)}/{prep.unidadeRendimento}
                    </div>
                    <button
                      onClick={() => {
                        setShowNovoPreparo(false);
                        setPreparoEditando(editandoEsteAqui ? null : prep);
                      }}
                      className="text-[11.5px] font-medium"
                      style={{ color: C.text }}
                    >
                      editar
                    </button>
                    <button onClick={() => excluirPreparoComConfirmacao(prep)} className="text-[11.5px] font-medium" style={{ color: C.danger }}>
                      excluir
                    </button>
                  </div>
                </div>
                {editandoEsteAqui ? (
                  <PreparoForm insumos={insumos} preparo={prep} onCancel={() => setPreparoEditando(null)} onSaved={() => setPreparoEditando(null)} />
                ) : (
                  <div className="px-5 py-1">
                    {prep.ficha.map((f) => {
                      const insumo = insumos.find((i) => i.id === f.insumoId);
                      if (!insumo) return null;
                      const insumoCalc = { id: insumo.id, unidadeMedida: insumo.unidadeMedida, precoUnitario: insumo.precoUnitario, fatorCorrecao: insumo.fatorCorrecao, pesoPorUnidade: insumo.pesoPorUnidade ?? undefined };
                      const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
                      const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
                      const custo = pesoConvertido * fc * insumo.precoUnitario;
                      return (
                        <div key={f.id} className="flex justify-between text-[12.5px] py-2" style={{ borderTop: `1px solid ${C.border}` }}>
                          <span>
                            {insumo.nome} <span style={{ color: C.faint }}>· {f.pesoLiquido}{f.unidade} · FC {fc.toFixed(2)}</span>
                          </span>
                          <span style={nums}>R$ {custo.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          {preparos.length === 0 && (
            <div className="text-[12.5px] py-4" style={{ color: C.faint }}>
              Nenhum preparo próprio cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
