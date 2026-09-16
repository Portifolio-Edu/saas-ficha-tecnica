"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import { UNIDADES, type Insumo } from "@/lib/dominio/insumo";
import type { DestinoVenda, FormaFisica, LinhaFichaInput, Receita, ReceitaInput } from "@/lib/dominio/receita";
import { construirContexto, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import type { Processamento } from "@/lib/dominio/processamento";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import { calcularPrecoSugerido } from "@/lib/calculo/precificacao";
import type { UnidadeMedida } from "@/lib/calculo/types";
import type { LinhaFichaCustosPdf } from "@/lib/pdf/FichaCustosPdf";
import type { LinhaFichaOperacionalPdf } from "@/lib/pdf/FichaOperacionalPdf";
import { acaoCriarReceita, acaoAtualizarReceita, acaoExcluirReceita } from "./actions";

function ReceitaForm({
  insumos,
  preparos,
  receita,
  onCancel,
  onSaved,
}: {
  insumos: Insumo[];
  preparos: Receita[];
  receita?: Receita;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(receita?.nomePrato ?? "");
  const [categoria, setCategoria] = useState(receita?.categoria ?? "");
  const [precoVenda, setPrecoVenda] = useState(receita?.precoVenda != null ? String(receita.precoVenda) : "");
  const [vendasMes, setVendasMes] = useState(receita?.vendasMes != null ? String(receita.vendasMes) : "");
  const [rendimento, setRendimento] = useState(receita ? String(receita.rendimento) : "1");
  const [pesoPorcaoG, setPesoPorcaoG] = useState(receita?.pesoPorcaoG != null ? String(receita.pesoPorcaoG) : "");
  const [formaFisica, setFormaFisica] = useState<FormaFisica>(receita?.formaFisica ?? "solido");
  const [destinoVenda, setDestinoVenda] = useState<DestinoVenda>(receita?.destinoVenda ?? "proprio");
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo ?? "");
  const [ficha, setFicha] = useState<LinhaFichaInput[]>(receita?.ficha.map((f) => ({ ...f })) ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [tipoLinha, setTipoLinha] = useState<"insumo" | "sub_receita">("insumo");
  const [linhaRefId, setLinhaRefId] = useState(insumos[0]?.id ?? "");
  const [linhaPeso, setLinhaPeso] = useState("");
  const [linhaUnidade, setLinhaUnidade] = useState<UnidadeMedida>(insumos[0]?.unidadeMedida ?? "kg");

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));
  const opcoesLinha = tipoLinha === "insumo" ? insumos.map((i) => ({ id: i.id, nome: i.nome })) : preparos.map((p) => ({ id: p.id, nome: p.nomePrato }));

  const trocarTipoLinha = (t: "insumo" | "sub_receita") => {
    setTipoLinha(t);
    setLinhaRefId(t === "insumo" ? insumos[0]?.id ?? "" : preparos[0]?.id ?? "");
  };

  const addLinha = () => {
    if (!linhaRefId || !linhaPeso) return;
    setFicha([
      ...ficha,
      tipoLinha === "insumo"
        ? { insumoId: linhaRefId, subReceitaId: null, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade }
        : { insumoId: null, subReceitaId: linhaRefId, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade },
    ]);
    setLinhaPeso("");
  };
  const removerLinha = (idx: number) => setFicha(ficha.filter((_, i) => i !== idx));

  const salvar = async () => {
    if (!nome.trim() || !precoVenda || !rendimento || ficha.length === 0) return;
    setSalvando(true);
    setErro(null);
    const input: ReceitaInput = {
      nomePrato: nome.trim(),
      tipo: "prato_final",
      categoria: categoria.trim() || null,
      precoVenda: parseFloat(precoVenda),
      vendasMes: vendasMes ? parseInt(vendasMes, 10) : null,
      rendimento: parseFloat(rendimento),
      unidadeRendimento: "porção",
      pesoPorcaoG: pesoPorcaoG ? parseFloat(pesoPorcaoG) : null,
      formaFisica,
      destinoVenda,
      margemAlvo: null,
      modoPreparo: modoPreparo.trim() || null,
      ficha,
    };
    const resultado = receita ? await acaoAtualizarReceita(receita.id, input) : await acaoCriarReceita(input);
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
        <input placeholder="Nome do prato" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Categoria (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Preço de venda (R$)" type="number" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Rende (porções)" type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="grid grid-cols-8 gap-2 mb-3">
        <input placeholder="Peso da porção (g, opcional)" type="number" value={pesoPorcaoG} onChange={(e) => setPesoPorcaoG(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Vendas/mês (manual, opcional)" type="number" value={vendasMes} onChange={(e) => setVendasMes(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <select value={formaFisica} onChange={(e) => setFormaFisica(e.target.value as FormaFisica)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          <option value="solido">Sólido</option>
          <option value="liquido">Líquido</option>
        </select>
        <select value={destinoVenda} onChange={(e) => setDestinoVenda(e.target.value as DestinoVenda)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          <option value="proprio">Próprio estabelecimento</option>
          <option value="varejo_terceiro">Varejo/mercado de terceiro</option>
        </select>
      </div>

      {ficha.length > 0 && (
        <div className="mb-3 space-y-1">
          {ficha.map((f, idx) => {
            const label = f.insumoId ? insumoPorId.get(f.insumoId)?.nome : preparoPorId.get(f.subReceitaId!)?.nomePrato;
            return (
              <div key={idx} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-md" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <span>
                  {label} · {f.pesoLiquido}{f.unidade}
                  {f.subReceitaId && <span style={{ color: C.faint }}> · preparo próprio</span>}
                </span>
                <button onClick={() => removerLinha(idx)} style={{ color: C.danger }}>
                  remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        {(["insumo", "sub_receita"] as const).map((t) => (
          <button
            key={t}
            onClick={() => trocarTipoLinha(t)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: tipoLinha === t ? C.text : C.panel, color: tipoLinha === t ? "#fff" : C.text, border: `1px solid ${tipoLinha === t ? C.text : C.borderStrong}` }}
          >
            {t === "insumo" ? "Insumo" : "Preparo próprio"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <select
          value={linhaRefId}
          onChange={(e) => {
            setLinhaRefId(e.target.value);
            if (tipoLinha === "insumo") setLinhaUnidade(insumoPorId.get(e.target.value)?.unidadeMedida ?? "kg");
          }}
          className="text-[12.5px] px-2.5 py-1.5 rounded-md flex-1"
          style={inputStyle}
        >
          {opcoesLinha.length === 0 && <option value="">Nada cadastrado</option>}
          {opcoesLinha.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
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

      <textarea
        placeholder="Modo de preparo (opcional -- vai pra ficha operacional da cozinha, não pra ficha de custos)"
        value={modoPreparo}
        onChange={(e) => setModoPreparo(e.target.value)}
        className="text-[12.5px] px-2.5 py-2 rounded-md w-full mb-3"
        style={{ ...inputStyle, minHeight: 80 }}
      />

      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : receita ? "Salvar alterações" : "Salvar prato"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

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

  const contexto = construirContexto(insumos, [...receitas, ...preparos], processamentos);
  const lotesProteina = processamentos.map(paraProcessamentoCalc);
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));

  const excluirComConfirmacao = async (receita: Receita) => {
    if (!window.confirm(`Excluir "${receita.nomePrato}"? Isso não pode ser desfeito.`)) return;
    const resultado = await acaoExcluirReceita(receita.id);
    if (!resultado.ok) window.alert(resultado.erro);
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
            const insumoCalc = { id: insumo.id, unidadeMedida: insumo.unidadeMedida, precoUnitario: insumo.precoUnitario, fatorCorrecao: insumo.fatorCorrecao, pesoPorUnidade: insumo.pesoPorUnidade ?? undefined };
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
        <p className="text-[12.5px]" style={{ color: C.sub }}>{receitas.length} prato{receitas.length !== 1 ? "s" : ""} cadastrado{receitas.length !== 1 ? "s" : ""}.</p>
        <button
          onClick={() => {
            setEditando(null);
            setShowNova(!showNova);
          }}
          className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: showNova ? C.bg : C.text, color: showNova ? C.text : "#fff", border: `1px solid ${showNova ? C.borderStrong : C.text}` }}
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
                {aberto ? <ChevronDown size={15} style={{ color: C.faint }} /> : <ChevronRight size={15} style={{ color: C.faint }} />}
                <span className="text-[14px] font-semibold">{p.nomePrato}</span>
                {abaixoDoAlvo && <Badge acao>margem baixa</Badge>}
              </div>
              <div className="flex items-center gap-5 text-[12.5px]" style={{ ...nums, color: C.sub }}>
                <span>CMV {cmvPct.toFixed(1)}%</span>
                <span style={{ color: abaixoDoAlvo ? C.danger : C.text, fontWeight: 600 }}>margem {margemPct.toFixed(1)}%</span>
                <span className="font-semibold" style={{ color: C.text }}>R$ {(p.precoVenda ?? 0).toFixed(2)}</span>
              </div>
            </button>

            {aberto && (
              <div className="px-5 pb-5" style={{ borderTop: `1px solid ${C.border}` }}>
                {editandoEsteAqui ? (
                  <ReceitaForm insumos={insumos} preparos={preparos} receita={p} onCancel={() => setEditando(null)} onSaved={() => setEditando(null)} />
                ) : (
                  <>
                    <table className="w-full text-[12.5px] mt-4 mb-4">
                      <thead>
                        <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
                          <th className="py-2 pr-3 font-medium">Insumo</th>
                          <th className="py-2 pr-3 font-medium text-right">Peso líq.</th>
                          <th className="py-2 pr-3 font-medium text-right">FC</th>
                          <th className="py-2 pr-3 font-medium text-right">Preço/unid.</th>
                          <th className="py-2 font-medium text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.ficha.map((f) => {
                          if (f.insumoId) {
                            const insumo = insumoPorId.get(f.insumoId);
                            if (!insumo) return null;
                            const insumoCalc = { id: insumo.id, unidadeMedida: insumo.unidadeMedida, precoUnitario: insumo.precoUnitario, fatorCorrecao: insumo.fatorCorrecao, pesoPorUnidade: insumo.pesoPorUnidade ?? undefined };
                            const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
                            const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
                            const custo = pesoConvertido * fc * insumo.precoUnitario;
                            return (
                              <tr key={f.id} style={{ borderTop: `1px solid ${C.border}` }}>
                                <td className="py-2 pr-3">{insumo.nome}</td>
                                <td className="py-2 pr-3 text-right" style={nums}>{f.pesoLiquido} {f.unidade}</td>
                                <td className="py-2 pr-3 text-right" style={nums}>{fc.toFixed(3)}</td>
                                <td className="py-2 pr-3 text-right" style={nums}>R$ {insumo.precoUnitario.toFixed(2)}</td>
                                <td className="py-2 text-right font-medium" style={nums}>R$ {custo.toFixed(2)}</td>
                              </tr>
                            );
                          }
                          const preparo = preparoPorId.get(f.subReceitaId!);
                          if (!preparo) return null;
                          const custoUnitarioPreparo = calcularCustoPorPorcao(preparo.id, contexto);
                          const custo = f.pesoLiquido * custoUnitarioPreparo;
                          return (
                            <tr key={f.id} style={{ borderTop: `1px solid ${C.border}` }}>
                              <td className="py-2 pr-3">
                                {preparo.nomePrato} <Badge>preparo próprio</Badge>
                              </td>
                              <td className="py-2 pr-3 text-right" style={nums}>{f.pesoLiquido} {f.unidade}</td>
                              <td className="py-2 pr-3 text-right" style={nums}>—</td>
                              <td className="py-2 pr-3 text-right" style={nums}>R$ {custoUnitarioPreparo.toFixed(2)}</td>
                              <td className="py-2 text-right font-medium" style={nums}>R$ {custo.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: `1.5px solid ${C.borderStrong}` }}>
                          <td className="py-2.5 pr-3 font-semibold" colSpan={4}>CMV total</td>
                          <td className="py-2.5 text-right font-semibold" style={nums}>R$ {cmv.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        ["CMV do prato", `R$ ${custoPorPorcao.toFixed(2)}`, `${cmvPct.toFixed(1)}%`, false],
                        ["Preço atual", `R$ ${(p.precoVenda ?? 0).toFixed(2)}`, null, false],
                        [`Preço sugerido (margem ${(margemAlvo * 100).toFixed(0)}%)`, `R$ ${precoSugerido.toFixed(2)}`, null, false],
                        ["Margem no preço atual", `${margemPct.toFixed(1)}%`, null, abaixoDoAlvo],
                      ].map(([label, value, extra, alerta], idx) => (
                        <div key={idx} className="rounded-lg p-3" style={{ background: C.bg }}>
                          <div className="text-[11px]" style={{ color: C.sub }}>{label}</div>
                          <div className="text-[14px] font-semibold mt-0.5" style={{ ...nums, color: alerta ? C.danger : C.text }}>
                            {value} {extra && <span className="text-[11px] font-normal" style={{ color: C.faint }}>({extra})</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => gerarPdfCustos(p)}
                        disabled={gerandoPdf === `${p.id}-custos`}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
                        style={{ background: C.text, color: "#fff", opacity: gerandoPdf === `${p.id}-custos` ? 0.6 : 1 }}
                      >
                        <Download size={13} /> {gerandoPdf === `${p.id}-custos` ? "Gerando..." : "PDF · Ficha de Custos"}
                      </button>
                      <button
                        onClick={() => gerarPdfOperacional(p)}
                        disabled={gerandoPdf === `${p.id}-operacional`}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
                        style={{ border: `1px solid ${C.borderStrong}`, opacity: gerandoPdf === `${p.id}-operacional` ? 0.6 : 1 }}
                      >
                        <Download size={13} /> {gerandoPdf === `${p.id}-operacional` ? "Gerando..." : "PDF · Ficha Operacional"}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditando(p)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
                        Editar
                      </button>
                      <button onClick={() => excluirComConfirmacao(p)} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ color: C.danger, border: `1px solid ${C.borderStrong}` }}>
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
        <div className="text-[12.5px] py-6 text-center" style={{ color: C.faint }}>
          Nenhum prato cadastrado ainda.
        </div>
      )}
    </div>
  );
}
