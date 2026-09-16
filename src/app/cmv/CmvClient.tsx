"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { Kpi } from "@/components/ficha/Kpi";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { FechamentoCmv, NovoFechamentoInput } from "@/lib/dominio/fechamentoCmv";
import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";
import { acaoCriarFechamento } from "./actions";

const GAP_ALERTA_PP = 3;

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatarPeriodo(inicio: string, fim: string): string {
  const f = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  return `${f(inicio)} – ${f(fim)}`;
}

export function CmvClient({
  pratos,
  preparos,
  insumos,
  processamentos,
  fechamentos,
}: {
  pratos: Receita[];
  preparos: Receita[];
  insumos: Insumo[];
  processamentos: Processamento[];
  fechamentos: FechamentoCmv[];
}) {
  const [periodoInicio, setPeriodoInicio] = useState(primeiroDiaDoMes());
  const [periodoFim, setPeriodoFim] = useState(hoje());
  const [textoImportacao, setTextoImportacao] = useState("");
  const [vendasImportadas, setVendasImportadas] = useState<Map<string, number> | null>(null);
  const [erroImportacao, setErroImportacao] = useState("");
  const [estoqueInicial, setEstoqueInicial] = useState("");
  const [compras, setCompras] = useState("");
  const [estoqueFinal, setEstoqueFinal] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const contexto = useMemo(() => construirContexto(insumos, [...pratos, ...preparos], processamentos), [insumos, pratos, preparos, processamentos]);
  const pratoPorId = useMemo(() => new Map(pratos.map((p) => [p.id, p])), [pratos]);

  const importarVendas = () => {
    const linhas = textoImportacao.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) {
      setErroImportacao("Cole os dados antes de importar.");
      return;
    }
    const mapa = new Map<string, number>();
    const naoEncontrados: string[] = [];
    linhas.forEach((linha) => {
      const partes = linha.split(/[,;\t]/).map((p) => p.trim());
      if (partes.length < 2) return;
      const nome = partes[0];
      const qtd = parseInt(partes[partes.length - 1].replace(/\D/g, ""), 10);
      if (!nome || isNaN(qtd)) return;
      const match = pratos.find((p) => p.nomePrato.toLowerCase() === nome.toLowerCase());
      if (match) mapa.set(match.id, qtd);
      else naoEncontrados.push(nome);
    });
    if (mapa.size === 0) {
      setErroImportacao("Nenhum prato reconhecido. O nome precisa bater com o cadastrado no sistema.");
      return;
    }
    setVendasImportadas(mapa);
    setErroImportacao(naoEncontrados.length ? `Importado, mas ${naoEncontrados.length} item não bateu com prato cadastrado: ${naoEncontrados.join(", ")}` : "");
    setTextoImportacao("");
  };

  const linhasCmv = useMemo(
    () =>
      pratos
        .map((p) => {
          const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
          const qtdVendida = vendasImportadas?.get(p.id) ?? p.vendasMes ?? 0;
          const precoVenda = p.precoVenda ?? 0;
          return {
            receita: p,
            custoPorPorcao,
            qtdVendida,
            faturamentoPrato: qtdVendida * precoVenda,
            custoTeoricoPrato: qtdVendida * custoPorPorcao,
            lucroPrato: qtdVendida * (precoVenda - custoPorPorcao),
          };
        })
        .sort((a, b) => b.faturamentoPrato - a.faturamentoPrato),
    [pratos, contexto, vendasImportadas],
  );

  const faturamentoPeriodo = linhasCmv.reduce((s, l) => s + l.faturamentoPrato, 0);
  const custoTeoricoPeriodo = linhasCmv.reduce((s, l) => s + l.custoTeoricoPrato, 0);

  const numEstoqueInicial = parseFloat(estoqueInicial) || 0;
  const numCompras = parseFloat(compras) || 0;
  const numEstoqueFinal = parseFloat(estoqueFinal) || 0;

  const resultado =
    faturamentoPeriodo > 0
      ? calcularFechamentoCmv(
          linhasCmv.map((l) => ({ quantidadeVendida: l.qtdVendida, cmvReceita: l.custoPorPorcao })),
          faturamentoPeriodo,
          numEstoqueInicial,
          numCompras,
          numEstoqueFinal,
        )
      : null;

  const cmvTeoricoPct = resultado ? resultado.cmvTeoricoPercentual * 100 : 0;
  const cmvRealPct = resultado ? resultado.cmvRealPercentual * 100 : 0;
  const gapPct = resultado ? resultado.gapPercentual * 100 : 0;
  const gapReais = resultado?.gapReais ?? 0;
  const consumoReal = resultado?.consumoReal ?? 0;

  const salvarFechamento = async () => {
    if (!resultado || periodoFim < periodoInicio) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucesso(false);
    const input: NovoFechamentoInput = {
      periodoInicio,
      periodoFim,
      estoqueInicial: numEstoqueInicial,
      compras: numCompras,
      estoqueFinal: numEstoqueFinal,
      faturamento: faturamentoPeriodo,
      vendas: linhasCmv.filter((l) => l.qtdVendida > 0).map((l) => ({ receitaId: l.receita.id, quantidade: l.qtdVendida })),
    };
    const resposta = await acaoCriarFechamento(input);
    setSalvando(false);
    if (!resposta.ok) {
      setErroSalvar(resposta.erro);
      return;
    }
    setSucesso(true);
  };

  const historico = useMemo(
    () =>
      fechamentos.map((f) => {
        const vendas = f.vendas.map((v) => {
          const p = pratoPorId.get(v.receitaId);
          return { quantidadeVendida: v.quantidade, cmvReceita: p ? calcularCustoPorPorcao(p.id, contexto) : 0 };
        });
        const resultadoHist = calcularFechamentoCmv(vendas, f.faturamento, f.estoqueInicial, f.compras, f.estoqueFinal);
        return {
          fechamento: f,
          cmvRealPctHist: resultadoHist.cmvRealPercentual * 100,
          cmvTeoricoPctHist: resultadoHist.cmvTeoricoPercentual * 100,
          gapPctHist: resultadoHist.gapPercentual * 100,
        };
      }),
    [fechamentos, pratoPorId, contexto],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-[14px] font-semibold mb-1">Importar vendas do período</h2>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>
          Cole o relatório de vendas do iFood ou do seu PDV, um prato por linha, no formato <span style={nums}>nome do prato, quantidade</span>. Enquanto não importar, o sistema usa o número de vendas/mês cadastrado manualmente em cada receita.
        </p>
        <Card className="p-5">
          <textarea
            value={textoImportacao}
            onChange={(e) => {
              setTextoImportacao(e.target.value);
              setErroImportacao("");
            }}
            placeholder={"Pizza Muçarela, 192\nParmegiana de Frango, 141\nLasanha Bolonhesa, 218"}
            className="text-[12.5px] px-3 py-2.5 rounded-lg w-full font-mono"
            style={{ ...inputStyle, minHeight: 110, ...nums }}
          />
          {erroImportacao && <div className="text-[11.5px] mt-2" style={{ color: C.danger }}>{erroImportacao}</div>}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={importarVendas} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff" }}>
              Importar vendas
            </button>
            {vendasImportadas && (
              <>
                <Badge>usando vendas importadas</Badge>
                <button
                  onClick={() => {
                    setVendasImportadas(null);
                    setErroImportacao("");
                  }}
                  className="text-[11.5px]"
                  style={{ color: C.sub }}
                >
                  voltar ao manual
                </button>
              </>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-1">CMV teórico contra CMV real</h2>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>
          Teórico é o que as fichas dizem que devia ter sido gasto pra essas vendas. Real é o padrão do setor: estoque inicial + compras − estoque final, dividido pelo faturamento. A diferença é o que saiu da cozinha sem virar prato vendido. Um gap de 1 a 3 pontos é ruído normal de operação; acima disso vale investigar.
        </p>
        <div className="rounded-lg p-3 mb-3 text-[11.5px]" style={{ background: C.bg, color: C.sub }}>
          A comparação só fecha quando <b>todo o cardápio</b> está cadastrado com ficha técnica. Se metade dos pratos não tem ficha, o CMV teórico sai menor que a realidade e o gap aparece inflado sem que exista problema nenhum na cozinha.
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11.5px]" style={{ color: C.faint }}>Período</span>
          <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          <span className="text-[11.5px]" style={{ color: C.faint }}>até</span>
          <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          {periodoFim < periodoInicio && <span className="text-[11.5px]" style={{ color: C.danger }}>Fim não pode ser antes do início.</span>}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-3">
          <Kpi label="Faturamento do período" value={`R$ ${faturamentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub={`${linhasCmv.reduce((s, l) => s + l.qtdVendida, 0)} pratos vendidos`} />
          <Kpi label="CMV teórico (fichas)" value={`${cmvTeoricoPct.toFixed(1)}%`} sub={`R$ ${custoTeoricoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
          <Kpi label="CMV real (estoque)" value={`${cmvRealPct.toFixed(1)}%`} alerta={gapPct > GAP_ALERTA_PP} sub={`R$ ${consumoReal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
          <Kpi
            label="Gap não explicado"
            value={`${gapPct > 0 ? "+" : ""}${gapPct.toFixed(1)} p.p.`}
            alerta={gapPct > GAP_ALERTA_PP}
            sub={`R$ ${Math.abs(gapReais).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${gapReais > 0 ? "a mais que o previsto" : "abaixo do previsto"}`}
          />
        </div>

        <Card className="p-5">
          <h3 className="text-[13px] font-semibold mb-1">Base do cálculo real</h3>
          <p className="text-[11.5px] mb-3" style={{ color: C.sub }}>Valores do inventário do período (contagem física de estoque + notas de compra).</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["Estoque inicial", estoqueInicial, setEstoqueInicial],
              ["Compras do período", compras, setCompras],
              ["Estoque final", estoqueFinal, setEstoqueFinal],
            ] as const).map(([label, valor, setValor]) => (
              <div key={label}>
                <div className="text-[11px] mb-1" style={{ color: C.faint }}>{label}</div>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0"
                  className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full text-right"
                  style={{ ...inputStyle, ...nums }}
                />
              </div>
            ))}
          </div>
          <div className="text-[11.5px] mt-3 pt-3" style={{ color: C.sub, borderTop: `1px solid ${C.border}` }}>
            Consumo real = {numEstoqueInicial.toLocaleString("pt-BR")} + {numCompras.toLocaleString("pt-BR")} − {numEstoqueFinal.toLocaleString("pt-BR")} = <b style={{ color: C.text }}>R$ {consumoReal.toLocaleString("pt-BR")}</b>
          </div>
        </Card>

        {gapPct > GAP_ALERTA_PP && (
          <div className="rounded-lg p-4 mt-3 text-[12.5px]" style={{ background: C.dangerSoft, color: C.danger }}>
            <b>Gap de {gapPct.toFixed(1)} pontos percentuais.</b> Saiu R$ {gapReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a mais de insumo do que as fichas previam. As causas prováveis, em ordem: porção maior que a ficha manda, perda não registrada, rendimento de proteína pior que o cadastrado, ou desvio. As telas de Manipulação de Proteínas e Produções ajudam a isolar qual é.
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={salvarFechamento}
            disabled={salvando || !resultado || periodoFim < periodoInicio}
            className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg"
            style={{ background: C.text, color: "#fff", opacity: salvando || !resultado || periodoFim < periodoInicio ? 0.6 : 1 }}
          >
            {salvando ? "Salvando..." : "Salvar fechamento do período"}
          </button>
          {!resultado && <span className="text-[11.5px]" style={{ color: C.faint }}>Sem faturamento no período (importe vendas ou cadastre vendas/mês nas receitas).</span>}
          {sucesso && <Badge>fechamento salvo</Badge>}
        </div>
        {erroSalvar && (
          <div className="text-[12px] mt-2 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
            {erroSalvar}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-1">CMV por prato</h2>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Ordenado por faturamento. O que vende muito com margem baixa costuma pesar mais que o que vende pouco com margem ruim.</p>
        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Prato</th>
                <th className="py-2.5 px-3 font-medium text-right">Vendidos</th>
                <th className="py-2.5 px-3 font-medium text-right">Preço</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV unit.</th>
                <th className="py-2.5 px-3 font-medium text-right">Faturamento</th>
                <th className="py-2.5 px-3 font-medium text-right">Custo total</th>
                <th className="py-2.5 px-5 font-medium text-right">Lucro bruto</th>
              </tr>
            </thead>
            <tbody>
              {linhasCmv.map((l) => (
                <tr key={l.receita.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td className="py-2.5 px-5">
                    <span className="font-medium">{l.receita.nomePrato}</span>
                    {l.qtdVendida === 0 && (
                      <span className="ml-2"><Badge acao>sem vendas cadastradas</Badge></span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{l.qtdVendida}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>R$ {(l.receita.precoVenda ?? 0).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: C.sub }}>R$ {l.custoPorPorcao.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>R$ {l.faturamentoPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: C.sub }}>R$ {l.custoTeoricoPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-5 text-right font-medium" style={nums}>R$ {l.lucroPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              {linhasCmv.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 px-5 text-center" style={{ color: C.faint }}>Nenhum prato final cadastrado ainda.</td>
                </tr>
              )}
              {linhasCmv.length > 0 && (
                <tr style={{ borderTop: `1.5px solid ${C.borderStrong}` }}>
                  <td className="py-2.5 px-5 font-semibold" colSpan={4}>Total do período</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {faturamentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {custoTeoricoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-5 text-right font-semibold" style={nums}>R$ {(faturamentoPeriodo - custoTeoricoPeriodo).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-1">Histórico de fechamentos</h2>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>
          CMV real de um período fechado nunca muda (vem do estoque contado na época). O teórico aqui é recalculado com a ficha técnica atual, então pode se afastar um pouco do teórico do dia do fechamento se preço de insumo ou ficha mudaram desde então.
        </p>
        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Período</th>
                <th className="py-2.5 px-3 font-medium text-right">Faturamento</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV teórico</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV real</th>
                <th className="py-2.5 px-5 font-medium text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(({ fechamento, cmvRealPctHist, cmvTeoricoPctHist, gapPctHist }) => (
                <tr key={fechamento.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td className="py-2.5 px-5 font-medium">{formatarPeriodo(fechamento.periodoInicio, fechamento.periodoFim)}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>R$ {fechamento.faturamento.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: C.sub }}>{cmvTeoricoPctHist.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{cmvRealPctHist.toFixed(1)}%</td>
                  <td className="py-2.5 px-5 text-right font-medium" style={{ ...nums, color: gapPctHist > GAP_ALERTA_PP ? C.danger : C.text }}>
                    {gapPctHist > 0 ? "+" : ""}{gapPctHist.toFixed(1)} p.p.
                  </td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: C.faint }}>Nenhum fechamento salvo ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
