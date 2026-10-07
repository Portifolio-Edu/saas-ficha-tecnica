"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, ClipboardList, Search } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { nums } from "@/components/ficha/tema";
import { ReceitaForm } from "@/components/receitas/ReceitaForm";
import { FichaProducaoModal } from "@/components/receitas/FichaProducaoModal";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import { construirContexto, linhasCustoDetalhado, paraInsumoCalc, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import { calcularPrecoSugerido } from "@/lib/calculo/precificacao";
import type { LinhaFichaCustosPdf } from "@/lib/pdf/FichaCustosPdf";
import type { LinhaFichaOperacionalPdf } from "@/lib/pdf/FichaOperacionalPdf";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirReceita } from "./actions";
import { formatBRL, formatNumero, formatQtd } from "@/components/charts/format";
import { dataBR } from "@/lib/formato";
import { filtrarReceitas } from "@/components/receitas/filtros";
import { FotoReceitaMiniatura } from "@/components/receitas/FotoReceitaMiniatura";

// POLIMENTO fichas-kanban (2026-10-06): busca, categoria, margem baixa e miniatura.
// A ficha completa expandida e os dois PDFs continuam no mesmo lugar.
// Reversão: docs/melhorias/02-localizacao-receitas.md.
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
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soAbaixoDoAlvo, setSoAbaixoDoAlvo] = useState(false);

  const contexto = useMemo(() => construirContexto(insumos, [...receitas, ...preparos], processamentos), [insumos, receitas, preparos, processamentos]);
  const lotesProteina = processamentos.map(paraProcessamentoCalc);
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));

  const dadosReceitas = useMemo(() => receitas.map((receita) => {
    const cmv = calcularCmvReceita(receita.id, contexto);
    const custoPorPorcao = calcularCustoPorPorcao(receita.id, contexto);
    const cmvPct = receita.precoVenda ? (custoPorPorcao / receita.precoVenda) * 100 : 0;
    const margemPct = receita.precoVenda ? ((receita.precoVenda - custoPorPorcao) / receita.precoVenda) * 100 : 0;
    const margemAlvo = receita.margemAlvo ?? margemAlvoCliente;
    return { receita, cmv, custoPorPorcao, cmvPct, margemPct, margemAlvo, abaixoDoAlvo: margemPct / 100 < margemAlvo, precoSugerido: calcularPrecoSugerido(custoPorPorcao, receita.margemAlvo, margemAlvoCliente) };
  }), [receitas, contexto, margemAlvoCliente]);
  const categorias = [...new Set(receitas.map((p) => p.categoria || "Sem categoria"))].sort();
  const visiveis = filtrarReceitas(dadosReceitas, { busca, categoria, abaixoDoAlvo: soAbaixoDoAlvo, margemAlvoCliente });
  const temFiltros = !!(busca || categoria || soAbaixoDoAlvo);
  const limparFiltros = () => { setBusca(""); setCategoria(""); setSoAbaixoDoAlvo(false); };

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
        geradoEm: dataBR(new Date()),
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
        geradoEm: dataBR(new Date()),
      });
      baixarBlob(blob, `ficha-operacional-${nomeArquivoSeguro(p.nomePrato)}.pdf`);
    } finally {
      setGerandoPdf(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px]" style={{ color: "var(--sub)" }} role="status">{visiveis.length} de {receitas.length} pratos{temFiltros ? " encontrados" : " cadastrados"}.</p>
        <button
          onClick={() => {
            setEditando(null);
            setShowNova(!showNova);
          }}
          className="text-[14px] font-medium px-3.5 min-h-11 rounded-lg"
          style={{ background: showNova ? "var(--bg)" : "var(--accent)", color: showNova ? "var(--text)" : "var(--accent-contrast, #fff)", border: `1px solid ${showNova ? "var(--border-strong)" : "var(--accent)"}` }}
          disabled={insumos.length === 0}
          title={insumos.length === 0 ? "Cadastre um insumo primeiro" : undefined}
        >
          {showNova ? "Fechar" : "+ Novo prato"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end" aria-label="Filtros de receitas">
        <label className="flex-1 min-w-0 flex items-center gap-2 px-3 min-h-11 rounded-lg border" style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}>
          <Search size={17} style={{ color: "var(--sub)" }} aria-hidden />
          <input aria-label="Buscar prato ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} disabled={!!editando} placeholder="Buscar prato ou categoria" className="w-full min-w-0 bg-transparent outline-none text-[14px] disabled:opacity-50" />
        </label>
        <label className="flex flex-col gap-1 text-[12px]" style={{ color: "var(--sub)" }}>Categoria
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={!!editando} className="min-h-11 px-3 rounded-lg border text-[14px] disabled:opacity-50" style={{ background: "var(--panel)", color: "var(--text)", borderColor: "var(--border-strong)" }}>
            <option value="">Todas as categorias</option>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex gap-2 items-center min-h-11 text-[14px] cursor-pointer"><input type="checkbox" checked={soAbaixoDoAlvo} onChange={(e) => setSoAbaixoDoAlvo(e.target.checked)} disabled={!!editando} className="w-4 h-4" />Abaixo da meta</label>
        {temFiltros && <button onClick={limparFiltros} disabled={!!editando} className="min-h-11 px-3 text-[14px] rounded-lg border disabled:opacity-50" style={{ borderColor: "var(--border-strong)" }}>Limpar filtros</button>}
      </div>
      {editando && <p className="text-[13px]" style={{ color: "var(--sub)" }}>Conclua ou cancele a edição para alterar os filtros.</p>}

      {showNova && (
        <Card className="mb-3">
          <ReceitaForm insumos={insumos} preparos={preparos} onCancel={() => setShowNova(false)} onSaved={() => setShowNova(false)} />
        </Card>
      )}

      {visiveis.map(({ receita: p, cmv, custoPorPorcao, cmvPct, margemPct, margemAlvo, abaixoDoAlvo, precoSugerido }) => {
        const aberto = expandido === p.id;
        const editandoEsteAqui = editando?.id === p.id;

        return (
          <Card key={p.id}>
            <button className="w-full flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-1 px-4 md:px-5 py-4 text-left" onClick={() => setExpandido(aberto ? null : p.id)} aria-expanded={aberto}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                {aberto ? <ChevronDown size={15} style={{ color: "var(--faint)" }} /> : <ChevronRight size={15} style={{ color: "var(--faint)" }} />}
                <FotoReceitaMiniatura key={`${p.id}-${p.fotoUrl}`} url={p.fotoUrl} />
                <span className="text-[14px] font-semibold">{p.nomePrato}</span>
                {abaixoDoAlvo && <Badge acao>margem baixa</Badge>}
              </div>
              <div className="flex items-center gap-3 md:gap-5 text-[13px] md:text-[12.5px] pl-7 md:pl-0" style={{ ...nums, color: "var(--sub)" }}>
                <span>CMV {formatNumero(cmvPct, 1)}%</span>
                <span style={{ color: abaixoDoAlvo ? "var(--danger)" : "var(--text)", fontWeight: 600 }}>margem {formatNumero(margemPct, 1)}%</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{formatBRL((p.precoVenda ?? 0))}</span>
              </div>
            </button>

            {aberto && (
              <div className="px-4 md:px-5 pb-5" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                {editandoEsteAqui ? (
                  <ReceitaForm insumos={insumos} preparos={preparos} receita={p} onCancel={() => setEditando(null)} onSaved={() => setEditando(null)} />
                ) : (
                  <>
                    {(() => {
                      const linhasComCusto = linhasCustoDetalhado(p, insumoPorId, preparoPorId, lotesProteina, contexto);

                      return (
                        <>
                          {/* CELULAR (2026-09-26): ficha em lista no celular. */}
                          <ul aria-label={`Ficha de ${p.nomePrato}`} className="md:hidden mt-3 mb-4">
                            {linhasComCusto.map((l) => (
                              <li key={l.id} className="py-2.5 border-t first:border-t-0 flex items-start justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                                <div className="min-w-0">
                                  <div className="text-[15px]">
                                    {l.nome} {l.ehPreparo && <Badge>preparo próprio</Badge>}
                                  </div>
                                  <div className="text-[13px]" style={{ ...nums, color: "var(--sub)" }}>
                                    {formatQtd(l.pesoLiquido)} {l.unidade}
                                    {l.fc !== null ? ` · FC ${formatNumero(l.fc, 3)}` : ""} · {formatBRL(l.precoUnitario)}/unid.
                                  </div>
                                </div>
                                <div className="text-[15px] font-semibold shrink-0" style={nums}>{formatBRL(l.custo)}</div>
                              </li>
                            ))}
                            <li className="pt-2.5 border-t flex justify-between text-[15px] font-semibold" style={{ borderColor: "var(--border-strong)", ...nums }}>
                              <span>CMV total</span>
                              <span>{formatBRL(cmv)}</span>
                            </li>
                          </ul>
                          <table className="hidden md:table w-full text-[12.5px] mt-4 mb-4">
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
                                  <td className="py-2 pr-3 text-right" style={nums}>{formatQtd(l.pesoLiquido)} {l.unidade}</td>
                                  <td className="py-2 pr-3 text-right" style={nums}>{l.fc !== null ? formatNumero(l.fc, 3) : "—"}</td>
                                  <td className="py-2 pr-3 text-right" style={nums}>{formatBRL(l.precoUnitario)}</td>
                                  <td className="py-2 text-right font-medium" style={nums}>{formatBRL(l.custo)}</td>
                                </tr>
                              ))}
                              <tr style={{ borderTop: `1.5px solid ${"var(--border-strong)"}` }}>
                                <td className="py-2.5 pr-3 font-semibold" colSpan={4}>CMV total</td>
                                <td className="py-2.5 text-right font-semibold" style={nums}>{formatBRL(cmv)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      );
                    })()}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        ["CMV do prato", `${formatBRL(custoPorPorcao)}`, `${formatNumero(cmvPct, 1)}%`, false],
                        ["Preço atual", `${formatBRL((p.precoVenda ?? 0))}`, null, false],
                        [`Preço sugerido (margem ${formatNumero((margemAlvo * 100), 0)}%)`, `${formatBRL(precoSugerido)}`, null, false],
                        ["Margem no preço atual", `${formatNumero(margemPct, 1)}%`, null, abaixoDoAlvo],
                      ].map(([label, value, extra, alerta], idx) => (
                        <div key={idx} className="rounded-lg p-3" style={{ background: "var(--bg)" }}>
                          <div className="text-[11px]" style={{ color: "var(--sub)" }}>{label}</div>
                          <div className="text-[14px] font-semibold mt-0.5" style={{ ...nums, color: alerta ? "var(--danger)" : "var(--text)" }}>
                            {value} {extra && <span className="text-[11px] font-normal" style={{ color: "var(--faint)" }}>({extra})</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SISTEMA premium: ações numa barra só, botões de 40px com o mesmo idioma
                        (primário = ficha de produção; PDFs e editar secundários; excluir afastado à
                        direita). Antes: três linhas de botões de tamanhos diferentes e o "PDF · Ficha de
                        Custos" com o ícone empilhado sobre o texto. */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setFichaProducao(p)}
                        className="flex items-center gap-2 text-[13px] font-medium px-3.5 min-h-10 rounded-lg"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                      >
                        <ClipboardList size={15} /> Ver ficha de produção
                      </button>
                      <button
                        onClick={() => gerarPdfCustos(p)}
                        disabled={gerandoPdf === `${p.id}-custos`}
                        className="flex items-center gap-2 text-[13px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
                        style={{ borderColor: "var(--linha-forte)", opacity: gerandoPdf === `${p.id}-custos` ? 0.6 : 1 }}
                      >
                        <Download size={15} /> {gerandoPdf === `${p.id}-custos` ? "Gerando..." : "PDF de custos"}
                      </button>
                      <button
                        onClick={() => gerarPdfOperacional(p)}
                        disabled={gerandoPdf === `${p.id}-operacional`}
                        className="flex items-center gap-2 text-[13px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
                        style={{ borderColor: "var(--linha-forte)", opacity: gerandoPdf === `${p.id}-operacional` ? 0.6 : 1 }}
                      >
                        <Download size={15} /> {gerandoPdf === `${p.id}-operacional` ? "Gerando..." : "PDF operacional"}
                      </button>
                      <button onClick={() => setEditando(p)} className="text-[13px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]" style={{ borderColor: "var(--linha-forte)" }}>
                        Editar
                      </button>
                      <button onClick={() => excluirComConfirmacao(p)} className="sm:ml-auto text-[13px] font-medium px-3.5 min-h-10 rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--danger)" }}>
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

      {receitas.length > 0 && visiveis.length === 0 && <div className="py-8 text-center text-[14px]" style={{ color: "var(--sub)" }}><p>Nenhum prato corresponde aos filtros.</p><button onClick={limparFiltros} className="mt-3 min-h-11 px-4 rounded-lg border" style={{ borderColor: "var(--border-strong)" }}>Mostrar todos os pratos</button></div>}

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
