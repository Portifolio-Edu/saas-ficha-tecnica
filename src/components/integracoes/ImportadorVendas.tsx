"use client";

// INTEGRACOES (2026-09-23) -- alternativa quando o PDV não libera integração:
// importar o XML das notas de venda (NFC-e/SAT) ou a planilha exportada do PDV,
// ligar cada produto do PDV a uma ficha (uma vez; fica lembrado) e levar as vendas
// pro fechamento de CMV. Tudo roda no navegador: nenhum arquivo sobe pro servidor.
// O mapeamento produto → ficha fica no localStorage por enquanto; no backend
// (Supabase) vira tabela do cliente.
// Pra tirar: remover o bloco "Sem integração" em IntegracoesClient.tsx.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileSpreadsheet, FileText, RotateCcw } from "lucide-react";
import { consolidarDocumentos, type ResumoVendas } from "@/lib/integracoes/documentoFiscal";
import { consolidarPlanilha, lerCsv, sugerirColunas, type ColunasPlanilha, type Planilha } from "@/lib/integracoes/planilhaVendas";
import { conciliar, sugerirFicha, SEM_FICHA } from "@/lib/integracoes/conciliacao";
import { formatBRL, formatQtd } from "@/components/charts/format";

export const CHAVE_VENDAS_IMPORTADAS = "ficha:vendas-importadas";
const CHAVE_MAPEAMENTO = "ficha:conciliacao-pdv:v1";

export interface VendasImportadas {
  inicio: string | null;
  fim: string | null;
  faturamento: number;
  faturamentoSemFicha: number;
  vendas: { receitaId: string; quantidade: number }[];
  descricao: string;
}

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;
const campo = "text-[14px] px-3 min-h-10 rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function lerMapeamento(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_MAPEAMENTO) ?? "{}");
  } catch {
    return {};
  }
}

export function ImportadorVendas({
  fichas,
  basePath,
  notasExemplo,
}: {
  fichas: { id: string; nome: string }[];
  basePath: string;
  /** Só na demo: lote de XML de exemplo pra testar sem os arquivos do PDV. */
  notasExemplo?: () => { nome: string; conteudo: string }[];
}) {
  const router = useRouter();
  const xmlRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [resumo, setResumo] = useState<ResumoVendas | null>(null);
  const [origemTexto, setOrigemTexto] = useState("");
  const [planilha, setPlanilha] = useState<{ nome: string; dados: Planilha; colunas: ColunasPlanilha } | null>(null);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [sugeridos, setSugeridos] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  useEffect(() => setMapeamento(lerMapeamento()), []);

  const abrirResumo = (r: ResumoVendas, origem: string) => {
    if (r.produtos.length === 0) {
      setErro(r.ignorados.length ? `Nenhuma venda encontrada. ${r.ignorados[0].motivo}` : "Nenhuma venda encontrada nos arquivos.");
      return;
    }
    // Sugere ficha pros produtos que ainda não têm decisão lembrada.
    const lembrado = lerMapeamento();
    const novo = { ...lembrado };
    const marcados = new Set<string>();
    for (const p of r.produtos) {
      if (novo[p.chave]) continue;
      const s = sugerirFicha(p, fichas);
      if (s) {
        novo[p.chave] = s;
        marcados.add(p.chave);
      }
    }
    setMapeamento(novo);
    setSugeridos(marcados);
    setResumo(r);
    setOrigemTexto(origem);
    setErro(null);
  };

  const lerXmls = async (arquivos: { nome: string; conteudo: string }[]) => {
    const zips = arquivos.filter((a) => a.nome.toLowerCase().endsWith(".zip"));
    if (zips.length) {
      setErro("Arquivo .zip ainda não é aceito: descompacte e escolha os XMLs (dá pra selecionar todos de uma vez).");
      return;
    }
    const r = consolidarDocumentos(arquivos);
    abrirResumo(r, `${r.documentos} ${r.documentos === 1 ? "nota fiscal" : "notas fiscais"} (XML)`);
  };

  const escolherXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const lista = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!lista.length) return;
    setLendo(true);
    try {
      await lerXmls(await Promise.all(lista.map(async (f) => ({ nome: f.name, conteudo: f.name.toLowerCase().endsWith(".zip") ? "" : await f.text() }))));
    } finally {
      setLendo(false);
    }
  };

  const escolherCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (/\.xlsx?$/i.test(arquivo.name)) {
      setErro("Planilha do Excel ainda não é lida direto: no Excel, use Arquivo > Salvar como > CSV e escolha o arquivo .csv.");
      return;
    }
    const dados = lerCsv(await arquivo.text());
    if (!dados.cabecalho.length || !dados.linhas.length) {
      setErro("A planilha está vazia ou sem cabeçalho.");
      return;
    }
    setErro(null);
    setPlanilha({ nome: arquivo.name, dados, colunas: sugerirColunas(dados.cabecalho) });
  };

  const confirmarColunas = () => {
    if (!planilha) return;
    if (planilha.colunas.produto < 0 || planilha.colunas.quantidade < 0) {
      setErro("Escolha pelo menos as colunas de produto e de quantidade.");
      return;
    }
    const r = consolidarPlanilha(planilha.dados, planilha.colunas);
    abrirResumo(r, `planilha ${planilha.nome}`);
    setPlanilha(null);
  };

  const escolherFicha = (chave: string, receitaId: string) => {
    const novo = { ...mapeamento };
    if (receitaId) novo[chave] = receitaId;
    else delete novo[chave];
    setMapeamento(novo);
    setSugeridos((s) => {
      const n = new Set(s);
      n.delete(chave);
      return n;
    });
  };

  const conciliado = useMemo(() => (resumo ? conciliar(resumo, mapeamento) : null), [resumo, mapeamento]);

  const levarProCmv = () => {
    if (!resumo || !conciliado) return;
    try {
      // Lembra as decisões pras próximas importações.
      localStorage.setItem(CHAVE_MAPEAMENTO, JSON.stringify(mapeamento));
    } catch {}
    const pacote: VendasImportadas = {
      inicio: resumo.inicio,
      fim: resumo.fim,
      // Planilha sem coluna de valor: o fechamento calcula pelo preço das fichas.
      faturamento: resumo.faturamento,
      faturamentoSemFicha: conciliado.faturamentoSemFicha,
      vendas: conciliado.vendas.map((v) => ({ receitaId: v.receitaId, quantidade: v.quantidade })),
      descricao: origemTexto,
    };
    try {
      sessionStorage.setItem(CHAVE_VENDAS_IMPORTADAS, JSON.stringify(pacote));
    } catch {}
    router.push(`${basePath}/cmv`);
  };

  const recomecar = () => {
    setResumo(null);
    setPlanilha(null);
    setErro(null);
  };

  // ---------- Escolha do arquivo ----------
  if (!resumo && !planilha) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-5 flex flex-col" style={painel}>
            <div className="flex items-center gap-2.5">
              <FileText size={18} style={{ color: "var(--tinta-sub)" }} />
              <h4 className="text-[16px] font-semibold text-[var(--tinta)]">XML das notas de venda</h4>
            </div>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-1.5 flex-1">
              NFC-e ou SAT. Todo PDV emite; peça o lote do período ao PDV ou ao contador. Dá pra escolher todos os arquivos de uma vez. Notas canceladas e
              repetidas ficam de fora sozinhas.
            </p>
            <input ref={xmlRef} type="file" aria-label="Arquivos XML das notas" accept=".xml,text/xml,application/xml,.zip" multiple className="hidden" onChange={escolherXml} />
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => xmlRef.current?.click()}
                disabled={lendo}
                className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)", opacity: lendo ? 0.6 : 1 }}
              >
                {lendo ? "Lendo..." : "Escolher arquivos XML"}
              </button>
              {notasExemplo && (
                <button
                  onClick={() => lerXmls(notasExemplo())}
                  className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border hover:bg-[var(--panel-hover)]"
                  style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
                >
                  Testar com notas de exemplo
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-5 flex flex-col" style={painel}>
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet size={18} style={{ color: "var(--tinta-sub)" }} />
              <h4 className="text-[16px] font-semibold text-[var(--tinta)]">Planilha de vendas do PDV</h4>
            </div>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-1.5 flex-1">
              O relatório de vendas por produto que o PDV exporta, em CSV. Você confirma quais colunas são produto, quantidade e valor.
            </p>
            <input ref={csvRef} type="file" aria-label="Planilha de vendas" accept=".csv,text/csv,.txt,.xls,.xlsx" className="hidden" onChange={escolherCsv} />
            <div className="mt-4">
              <button
                onClick={() => csvRef.current?.click()}
                className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border hover:bg-[var(--panel-hover)]"
                style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
              >
                Escolher planilha
              </button>
            </div>
          </div>
        </div>
        {erro && (
          <div role="alert" className="text-[14px] rounded-lg px-4 py-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {erro}
          </div>
        )}
        <p className="text-[13px] text-[var(--tinta-faint)]">Os arquivos são lidos aqui no navegador e não são enviados pra lugar nenhum.</p>
      </div>
    );
  }

  // ---------- Colunas da planilha ----------
  if (planilha) {
    const nomes: { chave: keyof ColunasPlanilha; rotulo: string; obrigatoria: boolean }[] = [
      { chave: "produto", rotulo: "Produto", obrigatoria: true },
      { chave: "quantidade", rotulo: "Quantidade", obrigatoria: true },
      { chave: "valor", rotulo: "Valor total", obrigatoria: false },
      { chave: "codigo", rotulo: "Código", obrigatoria: false },
      { chave: "data", rotulo: "Data", obrigatoria: false },
    ];
    return (
      <div className="rounded-xl border overflow-hidden" style={painel}>
        <div className="px-5 pt-4 pb-3">
          <h4 className="text-[16px] font-semibold text-[var(--tinta)]">Quais colunas são o quê</h4>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            {planilha.nome}: {planilha.dados.linhas.length} linhas. Sugerimos pelo nome do cabeçalho; confira.
          </p>
        </div>
        <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {nomes.map((n) => (
            <label key={n.chave} className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--tinta-faint)]">
                {n.rotulo}
                {n.obrigatoria ? "" : " (opcional)"}
              </span>
              <select
                value={planilha.colunas[n.chave]}
                onChange={(e) => setPlanilha({ ...planilha, colunas: { ...planilha.colunas, [n.chave]: Number(e.target.value) } })}
                className={campo}
                style={{ borderColor: "var(--linha-forte)" }}
              >
                <option value={-1}>{n.obrigatoria ? "Escolha" : "Não tem"}</option>
                {planilha.dados.cabecalho.map((c, i) => (
                  <option key={i} value={i}>
                    {c || `Coluna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div tabIndex={0} role="region" aria-label="Vendas importadas" className="overflow-x-auto border-t" style={{ borderColor: "var(--linha)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left">
                {planilha.dados.cabecalho.map((c, i) => (
                  <th key={i} className="py-2 px-3 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planilha.dados.linhas.slice(0, 3).map((l, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "var(--linha)" }}>
                  {planilha.dados.cabecalho.map((_, j) => (
                    <td key={j} className="py-2 px-3 whitespace-nowrap text-[var(--tinta-sub)]">
                      {l[j]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {erro && (
          <div role="alert" className="mx-5 mt-4 text-[14px] rounded-lg px-4 py-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {erro}
          </div>
        )}
        <div className="p-4 flex gap-2 border-t" style={{ borderColor: "var(--linha)" }}>
          <button onClick={confirmarColunas} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            Continuar
          </button>
          <button onClick={recomecar} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ---------- Conciliação ----------
  const r = resumo as ResumoVendas;
  const c = conciliado!;
  const semValor = r.faturamento === 0;
  return (
    <div className="rounded-xl border overflow-hidden" style={painel}>
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-[16px] font-semibold text-[var(--tinta)]">Ligue cada produto do PDV à ficha</h4>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            {origemTexto}
            {r.inicio ? `, de ${dataCurta(r.inicio)} a ${dataCurta(r.fim)}` : ""}
            {r.cancelados ? ` · ${r.cancelados} cancelada${r.cancelados > 1 ? "s" : ""} fora` : ""}
            {r.repetidos ? ` · ${r.repetidos} repetida${r.repetidos > 1 ? "s" : ""} fora` : ""}
            {r.ignorados.length ? ` · ${r.ignorados.length} arquivo${r.ignorados.length > 1 ? "s" : ""} ignorado${r.ignorados.length > 1 ? "s" : ""}` : ""}. Fica
            lembrado pras próximas importações.
          </p>
        </div>
        <button
          onClick={recomecar}
          className="flex items-center gap-2 text-[14px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
          style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
        >
          <RotateCcw size={14} />
          Outro arquivo
        </button>
      </div>

      {r.ignorados.length > 0 && (
        <details className="mx-5 mb-3 text-[13px] text-[var(--tinta-sub)]">
          <summary className="cursor-pointer min-h-10 flex items-center">Ver arquivos ignorados e por quê</summary>
          <ul className="mt-1 space-y-1">
            {r.ignorados.slice(0, 20).map((i, k) => (
              <li key={k}>
                <span className="text-[var(--tinta)]">{i.arquivo}</span>: {i.motivo}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div tabIndex={0} role="region" aria-label="Produtos do PDV e fichas" className="overflow-x-auto">
        <table className="w-full text-[14px] min-w-[680px]">
          <thead>
            <tr className="text-left">
              <th className="py-2.5 px-5">Produto no PDV</th>
              <th className="py-2.5 px-3 text-right">Vendidos</th>
              {!semValor && <th className="py-2.5 px-3 text-right">Valor</th>}
              <th className="py-2.5 px-5 w-[300px]">Ficha técnica</th>
            </tr>
          </thead>
          <tbody>
            {r.produtos.map((p) => {
              const escolha = mapeamento[p.chave] ?? "";
              return (
                <tr key={p.chave} className="border-t" style={{ borderColor: "var(--linha)" }}>
                  <td className="py-2.5 px-5">
                    <div className="font-medium text-[var(--tinta)]">{p.descricao}</div>
                    {p.codigo && <div className="text-[12px] text-[var(--tinta-faint)]">código {p.codigo}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[var(--tinta-sub)] whitespace-nowrap">{formatQtd(p.quantidade)}</td>
                  {!semValor && <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatBRL(p.valor)}</td>}
                  <td className="py-2.5 px-5">
                    <select
                      value={escolha}
                      onChange={(e) => escolherFicha(p.chave, e.target.value)}
                      className={`${campo} w-full min-h-[var(--alvo-toque)]`}
                      style={{ borderColor: escolha ? "var(--linha-forte)" : "var(--aviso)" }}
                      aria-label={`Ficha de ${p.descricao}`}
                    >
                      <option value="">Escolha a ficha</option>
                      {fichas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                      <option value={SEM_FICHA}>Não tem ficha (bebida, sobremesa comprada, taxa)</option>
                    </select>
                    {sugeridos.has(p.chave) && <div className="text-[12px] text-[var(--tinta-faint)] mt-1">sugerida pelo nome, confira</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--linha)" }}>
        <div className="text-[13px] text-[var(--tinta-sub)]">
          {c.pendentes > 0 ? (
            <span style={{ color: "var(--aviso)" }}>
              {c.pendentes} {c.pendentes === 1 ? "produto sem decisão" : "produtos sem decisão"} (contam como sem ficha).{" "}
            </span>
          ) : null}
          {!semValor && (
            <>
              Faturamento <span className="font-medium text-[var(--tinta)]">{formatBRL(c.faturamento)}</span>, dos quais {formatBRL(c.faturamentoSemFicha)} em itens sem ficha.
            </>
          )}
          {semValor && "Planilha sem valor: o faturamento vai ser calculado pelo preço de cada ficha."}
        </div>
        <button
          onClick={levarProCmv}
          disabled={c.vendas.length === 0}
          className="flex items-center gap-2 text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)", opacity: c.vendas.length === 0 ? 0.5 : 1 }}
        >
          Levar pro fechamento de CMV
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
