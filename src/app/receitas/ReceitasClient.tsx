"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Download, ClipboardList } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { nums } from "@/components/ficha/tema";
import { ReceitaForm } from "@/components/receitas/ReceitaForm";
import { FichaProducaoModal } from "@/components/receitas/FichaProducaoModal";
import { Donut, type FatiaDonut } from "@/components/charts/Donut";
import { CHART_MIN_HEIGHT } from "@/components/charts/theme";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import { construirContexto, paraInsumoCalc, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import { calcularPrecoSugerido } from "@/lib/calculo/precificacao";
import type { LinhaFichaCustosPdf } from "@/lib/pdf/FichaCustosPdf";
import type { LinhaFichaOperacionalPdf } from "@/lib/pdf/FichaOperacionalPdf";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirReceita } from "./actions";

export function ReceitasClient({
  receitas,
  insumos,
  preparos,
  margemAlvoCliente,
  processamentos,
  nomeRestaurante,
}: {
  receitas: Receita[];
  insumos: Insumo[];
  preparos: Receita[];
  margemAlvoCliente: number;
  processamentos: Processamento[];
  nomeRestaurante: string;
}) {
  const [expandido, setExpandido] = useState<string | null>(receitas[0]?.id ?? null);
  const [showNova, setShowNova] = useState(false);
  const [editando, setEditando] = useState<Receita | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null);
  const [fichaProducao, setFichaProducao] = useState<Receita | null>(null);
  const { mostrarErro } = useToast();

  const contexto = construirContexto(insumos, [...receitas, ...preparos], processamentos);
  const lotesProteina = processamentos.map(paraProcessamentoCalc);
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));

  const excluirComConfirmacao = async (receita: Receita) => {
    if (!window.confirm(`Excluir "${receita.nomePrato}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirReceita(receita.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  // Import dinâmico do @react-pdf/renderer (biblioteca pesada) só quando o
  // botão é clicado, pra não engordar o bundle de quem só quer ver a lista.
  const gerarPdfCustos = async (p: Receita) => {
    setGerandoPdf(`${p.id}-custos`);
    try {
      const linhas: LinhaFichaCustosPdf[] = p.ficha
        .map((f): LinhaFichaCustosPdf | null => {
          if (f.insumoId) {
            const insumo = insumoPorId.get(f.insumoId);
            if (!insumo) return null;
            const insumoCalc = paraInsumoCalc(insumo);
            const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
            const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
            const custo = pesoConvertido * fc * insumo.precoUnitario;
            return { nome: insumo.nome, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc, precoUnitario: insumo.precoUnitario, custo, ehPreparo: false };
          }
          const preparo = preparoPorId.get(f.subReceitaId!);
          if (!preparo) return null;
          const custoUnitarioPreparo = calcularCustoPorPorcao(preparo.id, contexto);
          const custo = f.pesoLiquido * custoUnitarioPreparo;
          return { nome: preparo.nomePrato, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc: null, precoUnitario: custoUnitarioPreparo, custo, ehPreparo: true };
        })
        .filter((l): l is LinhaFichaCustosPdf => l !== null);

      const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
      const margemAlvo = p.margemAlvo ?? margemAlvoCliente;
      const margemPct = p.precoVenda ? ((p.precoVenda - custoPorPorcao) / p.precoVenda) * 100 : 0;

      const [{ gerarFichaCustosPdfBlob }, { baixarBlob, nomeArquivoSeguro }] = await Promise.all([import("@/lib/pdf/FichaCustosPdf"), import("@/lib/pdf/baixar")]);
      const blob = await gerarFichaCustosPdfBlob({
        nomeRestaurante,
        nomePrato: p.nomePrato,
        rendimento: p.rendimento,
        unidadeRendimento: p.unidadeRendimento,
        linhas,
        cmvTotal: calcularCmvReceita(p.id, contexto),
        precoVenda: p.precoVenda ?? 0,
        margemPct,
        margemAlvoPct: margemAlvo * 100,
        precoSugerido: calcularPrecoSugerido(custoPorPorcao, p.margemAlvo, margemAlvoCliente),
        geradoEm: new Date().toLocaleDateString("pt-BR"),
      });
      baixarBlob(blob, `ficha-de-custos-${nomeArquivoSeguro(p.nomePrato)}.pdf`);
    } finally {
      setGerandoPdf(null);
    }
  };

  const gerarPdfOperacional = async (p: Receita) => {
    setGerandoPdf(`${p.id}-operacional`);
    try {
      const linhas: LinhaFichaOperacionalPdf[] = p.ficha
        .map((f): LinhaFichaOperacionalPdf | null => {
          if (f.insumoId) {
            const insumo = insumoPorId.get(f.insumoId);
            if (!insumo) return null;
            return { nome: insumo.nome, pesoLiquido: f.pesoLiquido, unidade: f.unidade, ehPreparo: false };
          }
          const preparo = preparoPorId.get(f.subReceitaId!);
          if (!preparo) return null;
          return { nome: preparo.nomePrato, pesoLiquido: f.pesoLiquido, unidade: f.unidade, ehPreparo: true };
        })
        .filter((l): l is LinhaFichaOperacionalPdf => l !== null);

      const [{ gerarFichaOperacionalPdfBlob }, { baixarBlob, nomeArquivoSeguro }] = await Promise.all([import("@/lib/pdf/FichaOperacionalPdf"), import("@/lib/pdf/baixar")]);
      const blob = await gerarFichaOperacionalPdfBlob({
        nomeRestaurante,
        nomePrato: p.nomePrato,
        rendimento: p.rendimento,
        unidadeRendimento: p.unidadeRendimento,
        pesoPorcaoG: p.pesoPorcaoG,
        linhas,
        modoPreparo: p.modoPreparo,
        geradoEm: new Date().toLocaleDateString("pt-BR"),
      });
      baixarBlob(blob, `ficha-operacional-${nomeArquivoSeguro(p.nomePrato)}.pdf`);
    } finally {
      setGerandoPdf(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12.5px]" style={{ color: "var(--sub)" }}>{receitas.length} prato{receitas.length !== 1 ? "s" : ""} cadastrado{receitas.length !== 1 ? "s" : ""}.</p>
        <button
          onClick={() => {
            setEditando(null);
            setShowNova(!showNova);
          }}
          className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: showNova ? "var(--bg)" : "var(--accent)", color: showNova ? "var(--text)" : "#fff", border: `1px solid ${showNova ? "var(--border-strong)" : "var(--accent)"}` }}
          disabled={insumos.length === 0}
          title={insumos.length === 0 ? "Cadastre um insumo primeiro" : undefined}
        >
          {showNova ? "Fechar" : "+ Novo prato"}
        </button>
      </div>

      {showNova && (
        <Card className="mb-3">
          <ReceitaForm insumos={insumos} preparos={preparos} onCancel={() => setShowNova(false)} onSaved={() => setShowNova(false)} />
        </Card>
      )}

      {receitas.map((p) => {
        const aberto = expandido === p.id;
        const editandoEsteAqui = editando?.id === p.id;
        const cmv = calcularCmvReceita(p.id, contexto);
        const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
        const cmvPct = p.precoVenda ? (custoPorPorcao / p.precoVenda) * 100 : 0;
        const margemPct = p.precoVenda ? ((p.precoVenda - custoPorPorcao) / p.precoVenda) * 100 : 0;
        const margemAlvo = p.margemAlvo ?? margemAlvoCliente;
        const abaixoDoAlvo = margemPct / 100 < margemAlvo;
        const precoSugerido = calcularPrecoSugerido(custoPorPorcao, p.margemAlvo, margemAlvoCliente);

        return (
          <Card key={p.id}>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setExpandido(aberto ? null : p.id)}>
              <div className="flex items-center gap-3">
                {aberto ? <ChevronDown size={15} style={{ color: "var(--faint)" }} /> : <ChevronRight size={15} style={{ color: "var(--faint)" }} />}
                <span className="text-[14px] font-semibold">{p.nomePrato}</span>
                {abaixoDoAlvo && <Badge acao>margem baixa</Badge>}
              </div>
              <div className="flex items-center gap-5 text-[12.5px]" style={{ ...nums, color: "var(--sub)" }}>
                <span>CMV {cmvPct.toFixed(1)}%</span>
                <span style={{ color: abaixoDoAlvo ? "var(--danger)" : "var(--text)", fontWeight: 600 }}>margem {margemPct.toFixed(1)}%</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>R$ {(p.precoVenda ?? 0).toFixed(2)}</span>
              </div>
            </button>

            {aberto && (
              <div className="px-5 pb-5" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                {editandoEsteAqui ? (
                  <ReceitaForm insumos={insumos} preparos={preparos} receita={p} onCancel={() => setEditando(null)} onSaved={() => setEditando(null)} />
                ) : (
                  <>
                    {(() => {
                      const linhasComCusto = p.ficha
                        .map((f) => {
                          if (f.insumoId) {
                            const insumo = insumoPorId.get(f.insumoId);
                            if (!insumo) return null;
                            const insumoCalc = paraInsumoCalc(insumo);
                            const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
                            const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
                            const custo = pesoConvertido * fc * insumo.precoUnitario;
                            return { id: f.id, nome: insumo.nome, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc: fc as number | null, precoUnitario: insumo.precoUnitario, custo, ehPreparo: false };
                          }
                          const preparo = preparoPorId.get(f.subReceitaId!);
                          if (!preparo) return null;
                          const custoUnitarioPreparo = calcularCustoPorPorcao(preparo.id, contexto);
                          const custo = f.pesoLiquido * custoUnitarioPreparo;
                          return { id: f.id, nome: preparo.nomePrato, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc: null as number | null, precoUnitario: custoUnitarioPreparo, custo, ehPreparo: true };
                        })
                        .filter((l): l is NonNullable<typeof l> => l !== null);

                      const ordenadoPorCusto = [...linhasComCusto].filter((l) => l.custo > 0).sort((a, b) => b.custo - a.custo);
                      const TOP_DONUT = 5;
                      const restante = ordenadoPorCusto.slice(TOP_DONUT).reduce((s, l) => s + l.custo, 0);
                      const donutDados: FatiaDonut[] = [
                        ...ordenadoPorCusto.slice(0, TOP_DONUT).map((l) => ({ nome: l.nome, valor: l.custo })),
                        ...(restante > 0 ? [{ nome: "Outros", valor: restante, outros: true }] : []),
                      ];

                      return (
                        <>
                          <table className="w-full text-[12.5px] mt-4 mb-4">
                            <thead>
                              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                                <th className="py-2 pr-3 font-medium">Insumo</th>
                                <th className="py-2 pr-3 font-medium text-right">Peso líq.</th>
                                <th className="py-2 pr-3 font-medium text-right">FC</th>
                                <th className="py-2 pr-3 font-medium text-right">Preço/unid.</th>
                                <th className="py-2 font-medium text-right">Custo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {linhasComCusto.map((l) => (
                                <tr key={l.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                                  <td className="py-2 pr-3">
                                    {l.nome} {l.ehPreparo && <Badge>preparo próprio</Badge>}
                                  </td>
                                  <td className="py-2 pr-3 text-right" style={nums}>{l.pesoLiquido} {l.unidade}</td>
                                  <td className="py-2 pr-3 text-right" style={nums}>{l.fc !== null ? l.fc.toFixed(3) : "—"}</td>
                                  <td className="py-2 pr-3 text-right" style={nums}>R$ {l.precoUnitario.toFixed(2)}</td>
                                  <td className="py-2 text-right font-medium" style={nums}>R$ {l.custo.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr style={{ borderTop: `1.5px solid ${"var(--border-strong)"}` }}>
                                <td className="py-2.5 pr-3 font-semibold" colSpan={4}>CMV total</td>
                                <td className="py-2.5 text-right font-semibold" style={nums}>R$ {cmv.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold mb-1">Custo por ingrediente</h4>
                            <p className="text-[11.5px] mb-2" style={{ color: "var(--sub)" }}>
                              {ordenadoPorCusto.length > TOP_DONUT ? `Os ${TOP_DONUT} maiores custos, resto agrupado em "Outros".` : "Participação de cada item no custo total do prato."}
                            </p>
                            <Donut
                              dados={donutDados}
                              altura={CHART_MIN_HEIGHT}
                              tituloVazio="Nenhum custo calculado ainda."
                              dicaVazio="Adicione insumos ou preparos na ficha desse prato pra ver a composição do custo aqui."
                            />
                          </div>
                        </>
                      );
                    })()}

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        ["CMV do prato", `R$ ${custoPorPorcao.toFixed(2)}`, `${cmvPct.toFixed(1)}%`, false],
                        ["Preço atual", `R$ ${(p.precoVenda ?? 0).toFixed(2)}`, null, false],
                        [`Preço sugerido (margem ${(margemAlvo * 100).toFixed(0)}%)`, `R$ ${precoSugerido.toFixed(2)}`, null, false],
                        ["Margem no preço atual", `${margemPct.toFixed(1)}%`, null, abaixoDoAlvo],
                      ].map(([label, value, extra, alerta], idx) => (
                        <div key={idx} className="rounded-lg p-3" style={{ background: "var(--bg)" }}>
                          <div className="text-[11px]" style={{ color: "var(--sub)" }}>{label}</div>
                          <div className="text-[14px] font-semibold mt-0.5" style={{ ...nums, color: alerta ? "var(--danger)" : "var(--text)" }}>
                            {value} {extra && <span className="text-[11px] font-normal" style={{ color: "var(--faint)" }}>({extra})</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3">
                      <button
                        onClick={() => setFichaProducao(p)}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
                        style={{ border: `1px solid ${"var(--border-strong)"}` }}
                      >
                        <ClipboardList size={13} /> Ver ficha de produção
                      </button>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => gerarPdfCustos(p)}
                        disabled={gerandoPdf === `${p.id}-custos`}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
                        style={{ background: "var(--accent)", color: "#fff", opacity: gerandoPdf === `${p.id}-custos` ? 0.6 : 1 }}
                      >
                        <Download size={13} /> {gerandoPdf === `${p.id}-custos` ? "Gerando..." : "PDF · Ficha de Custos"}
                      </button>
                      <button
                        onClick={() => gerarPdfOperacional(p)}
                        disabled={gerandoPdf === `${p.id}-operacional`}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
                        style={{ border: `1px solid ${"var(--border-strong)"}`, opacity: gerandoPdf === `${p.id}-operacional` ? 0.6 : 1 }}
                      >
                        <Download size={13} /> {gerandoPdf === `${p.id}-operacional` ? "Gerando..." : "PDF · Ficha Operacional"}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditando(p)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
                        Editar
                      </button>
                      <button onClick={() => excluirComConfirmacao(p)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ color: "var(--danger)", border: `1px solid ${"var(--border-strong)"}` }}>
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {receitas.length === 0 && !showNova && (
        <div className="text-[12.5px] py-6 text-center" style={{ color: "var(--faint)" }}>
          Nenhum prato cadastrado ainda.
        </div>
      )}

      {fichaProducao && (
        <FichaProducaoModal
          receita={fichaProducao}
          insumos={insumos}
          todasReceitas={[...receitas, ...preparos]}
          onClose={() => setFichaProducao(null)}
        />
      )}
    </div>
  );
}
