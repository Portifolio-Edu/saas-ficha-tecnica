"use client";

import { Fragment, useState } from "react";
import { CookingPot } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { nums } from "@/components/ficha/tema";
import { InsumoForm } from "@/components/insumos/InsumoForm";
import { PreparoForm } from "@/components/insumos/PreparoForm";
import { CATEGORIAS, type Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { LocalArmazenamento } from "@/lib/dominio/temperatura";
import { construirContexto, paraInsumoCalc, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirInsumo, acaoExcluirPreparo } from "./actions";

export function InsumosClient({
  insumos,
  preparos,
  todasReceitas,
  processamentos,
  locais,
}: {
  insumos: Insumo[];
  preparos: Receita[];
  todasReceitas: Receita[];
  processamentos: Processamento[];
  locais: LocalArmazenamento[];
}) {
  const [showNovoInsumo, setShowNovoInsumo] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState<Insumo | null>(null);
  const [showNovoPreparo, setShowNovoPreparo] = useState(false);
  const [preparoEditando, setPreparoEditando] = useState<Receita | null>(null);
  const { mostrarErro } = useToast();

  const contexto = construirContexto(insumos, todasReceitas, processamentos);
  const lotesProteina = processamentos.map(paraProcessamentoCalc);

  const excluirInsumoComConfirmacao = async (insumo: Insumo) => {
    if (!window.confirm(`Excluir "${insumo.nome}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirInsumo(insumo.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  const excluirPreparoComConfirmacao = async (preparo: Receita) => {
    if (!window.confirm(`Excluir "${preparo.nomePrato}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirPreparo(preparo.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <Card>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <h2 className="text-[13px] font-semibold">Insumos comprados</h2>
          <button
            onClick={() => {
              setInsumoEditando(null);
              setShowNovoInsumo(!showNovoInsumo);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoInsumo ? "var(--bg)" : "var(--accent)", color: showNovoInsumo ? "var(--text)" : "#fff", border: `1px solid ${showNovoInsumo ? "var(--border-strong)" : "var(--accent)"}` }}
          >
            {showNovoInsumo ? "Fechar" : "+ Novo insumo"}
          </button>
        </div>
        {showNovoInsumo && <InsumoForm locais={locais} onCancel={() => setShowNovoInsumo(false)} onSaved={() => setShowNovoInsumo(false)} />}
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ color: "var(--faint)" }} className="text-left text-[11px] uppercase tracking-wide">
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
                <Fragment key={i.id}>
                  <tr style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                    <td className="py-2.5 px-5">{i.nome}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{CATEGORIAS.find((c) => c.id === i.categoria)?.label ?? i.categoria}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{i.unidadeMedida}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{i.tamanhoEmbalagem} {i.unidadeMedida}</td>
                    <td className="py-2.5 px-3 text-right" style={nums}>R$ {i.precoEmbalagem.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={nums}>R$ {i.precoUnitario.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={{ ...nums, color: i.fatorCorrecao > 1 ? "var(--danger)" : "var(--faint)" }}>{i.fatorCorrecao.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right" style={{ ...nums, color: abaixoMinimo ? "var(--danger)" : "var(--text)" }}>
                      {i.estoque ? `${i.estoque.saldoAtual}${i.unidadeMedida}${abaixoMinimo ? " · abaixo do mín." : ""}` : <span style={{ color: "var(--faint)" }}>não rastreado</span>}
                    </td>
                    <td className="py-2.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setShowNovoInsumo(false);
                          setInsumoEditando(editandoEsteAqui ? null : i);
                        }}
                        className="text-[11.5px] font-medium mr-3"
                        style={{ color: "var(--text)" }}
                      >
                        editar
                      </button>
                      <button onClick={() => excluirInsumoComConfirmacao(i)} className="text-[11.5px] font-medium" style={{ color: "var(--danger)" }}>
                        excluir
                      </button>
                    </td>
                  </tr>
                  {editandoEsteAqui && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <InsumoForm insumo={i} locais={locais} onCancel={() => setInsumoEditando(null)} onSaved={() => setInsumoEditando(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {insumos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 px-5 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>
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
            style={{ background: showNovoPreparo ? "var(--bg)" : "var(--accent)", color: showNovoPreparo ? "var(--text)" : "#fff", border: `1px solid ${showNovoPreparo ? "var(--border-strong)" : "var(--accent)"}` }}
            disabled={insumos.length === 0}
            title={insumos.length === 0 ? "Cadastre um insumo primeiro" : undefined}
          >
            {showNovoPreparo ? "Fechar" : "+ Nova receita"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
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
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                  <div className="flex items-center gap-2">
                    <CookingPot size={14} style={{ color: "var(--sub)" }} />
                    <span className="text-[13px] font-semibold">{prep.nomePrato}</span>
                    <Badge>preparo próprio</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[12px]" style={{ ...nums, color: "var(--sub)" }}>
                      rende {prep.rendimento}{prep.unidadeRendimento} · R$ {custoUnitario.toFixed(2)}/{prep.unidadeRendimento}
                    </div>
                    <button
                      onClick={() => {
                        setShowNovoPreparo(false);
                        setPreparoEditando(editandoEsteAqui ? null : prep);
                      }}
                      className="text-[11.5px] font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      editar
                    </button>
                    <button onClick={() => excluirPreparoComConfirmacao(prep)} className="text-[11.5px] font-medium" style={{ color: "var(--danger)" }}>
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
                      const insumoCalc = paraInsumoCalc(insumo);
                      const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
                      const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
                      const custo = pesoConvertido * fc * insumo.precoUnitario;
                      return (
                        <div key={f.id} className="flex justify-between text-[12.5px] py-2" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                          <span>
                            {insumo.nome} <span style={{ color: "var(--faint)" }}>· {f.pesoLiquido}{f.unidade} · FC {fc.toFixed(2)}</span>
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
            <div className="text-[12.5px] py-4" style={{ color: "var(--faint)" }}>
              Nenhum preparo próprio cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
