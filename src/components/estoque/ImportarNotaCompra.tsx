"use client";

// NF-e DE COMPRA (2026-10-03): Estoque > Importar NF-e de compra. A pessoa
// escolhe o XML da nota do fornecedor, confere item a item (insumo, conversão
// de caixa/pacote, preço novo) e confirma. Daí saem, de uma vez: entrada no
// estoque, preço novo do insumo (custo das fichas e CMV teórico) e a ligação
// lembrada pra próxima nota do mesmo fornecedor. A conta da tela é só pra
// mostrar: o servidor refaz tudo antes de gravar (app/estoque/nota-compra/actions.ts).
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, FileText, RotateCcw } from "lucide-react";
import type { Insumo } from "@/lib/dominio/insumo";
import type { NotaDeCompra } from "@/lib/integracoes/documentoFiscal";
import { calcularConferencia, podeConfirmar, type DecisaoItem, type LinhaConferencia } from "@/lib/integracoes/conferenciaNota";
import { acaoImportarNotaCompra, acaoLerNotaCompra } from "@/app/estoque/nota-compra/actions";
import { formatBRL, formatQtd } from "@/components/charts/format";

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;
const campo = "text-[14px] px-3 min-h-10 rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";
const IGNORAR = "__ignorar__";

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function pct(v: number): string {
  return `${v > 0 ? "+" : ""}${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function ImportarNotaCompra({ insumos }: { insumos: Insumo[] }) {
  const router = useRouter();
  const xmlRef = useRef<HTMLInputElement>(null);
  const [xml, setXml] = useState("");
  const [nota, setNota] = useState<NotaDeCompra | null>(null);
  const [linhas, setLinhas] = useState<LinhaConferencia[]>([]);
  const [jaImportadaEm, setJaImportadaEm] = useState<string | null>(null);
  const [decisoes, setDecisoes] = useState<Record<number, DecisaoItem>>({});
  const [fatores, setFatores] = useState<Record<number, string>>({});
  const [atualizarPrecos, setAtualizarPrecos] = useState(true);
  const [incluirExtras, setIncluirExtras] = useState(true);
  const [lendo, setLendo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ entradas: number; precos: number; ignorados: number } | null>(null);

  const insumosOrdenados = useMemo(() => [...insumos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [insumos]);
  const listaDecisoes = useMemo(() => Object.values(decisoes), [decisoes]);
  const resultado = useMemo(() => (nota ? calcularConferencia(nota, listaDecisoes, insumos, incluirExtras) : []), [nota, listaDecisoes, insumos, incluirExtras]);
  const pode = podeConfirmar(resultado);
  const temExtras = !!nota?.itens.some((i) => i.custosExtras > 0);
  const suspeitos = resultado.filter((r) => r.suspeito).length;

  const escolherXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    setFeito(null);
    const conteudo = await arquivo.text();
    const r = await acaoLerNotaCompra(conteudo);
    setLendo(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    const iniciais: Record<number, DecisaoItem> = {};
    const fatoresIniciais: Record<number, string> = {};
    for (const l of r.linhas) {
      if (l.insumoSugeridoId) iniciais[l.ordem] = { ordem: l.ordem, insumoId: l.insumoSugeridoId, ignorar: false, fator: l.fatorSugerido };
      if (l.fatorSugerido !== null) fatoresIniciais[l.ordem] = String(l.fatorSugerido).replace(".", ",");
    }
    setXml(conteudo);
    setNota(r.nota);
    setLinhas(r.linhas);
    setJaImportadaEm(r.jaImportadaEm);
    setDecisoes(iniciais);
    setFatores(fatoresIniciais);
  };

  const escolherInsumo = (ordem: number, valor: string) => {
    setDecisoes((d) => {
      const novo = { ...d };
      if (!valor) delete novo[ordem];
      else if (valor === IGNORAR) novo[ordem] = { ordem, insumoId: null, ignorar: true, fator: null };
      else novo[ordem] = { ordem, insumoId: valor, ignorar: false, fator: d[ordem]?.insumoId === valor ? d[ordem].fator : null };
      return novo;
    });
    // Trocou o insumo: a conversão da escolha anterior não vale mais.
    setFatores((f) => {
      if (decisoes[ordem]?.insumoId === valor) return f;
      const novo = { ...f };
      delete novo[ordem];
      return novo;
    });
  };

  const mudarFator = (ordem: number, texto: string) => {
    setFatores((f) => ({ ...f, [ordem]: texto }));
    // "1.000,5" (com vírgula, ponto é milhar) ou "0.9" (só ponto, é decimal).
    const limpo = texto.trim();
    const n = limpo ? Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo) : null;
    setDecisoes((d) => (d[ordem] ? { ...d, [ordem]: { ...d[ordem], fator: n === null || Number.isNaN(n) ? (texto.trim() ? 0 : null) : n } } : d));
  };

  const confirmar = async () => {
    if (!nota || !pode.ok) return;
    setGravando(true);
    setErro(null);
    const r = await acaoImportarNotaCompra(xml, listaDecisoes, { atualizarPrecos, incluirExtras });
    setGravando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setFeito({ entradas: r.entradas, precos: r.precosAtualizados, ignorados: r.ignorados });
    setNota(null);
    setXml("");
    router.refresh();
  };

  const recomecar = () => {
    setNota(null);
    setXml("");
    setErro(null);
    setFeito(null);
  };

  const alerta = erro && (
    <div role="alert" className="text-[14px] rounded-lg px-4 py-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
      {erro}
    </div>
  );

  // ---------- Escolha do arquivo ----------
  if (!nota) {
    return (
      <div className="space-y-3">
        {feito && (
          <div role="status" className="rounded-lg border px-4 py-3 text-[14px] flex items-start gap-2" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
            <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--sucesso)" }} aria-hidden />
            <span>
              Nota lançada: {feito.entradas} {feito.entradas === 1 ? "item entrou" : "itens entraram"} no estoque
              {feito.precos > 0 ? `, ${feito.precos} ${feito.precos === 1 ? "preço atualizado" : "preços atualizados"} (o custo das fichas já mudou)` : ""}
              {feito.ignorados > 0 ? `, ${feito.ignorados} ${feito.ignorados === 1 ? "item ignorado" : "itens ignorados"}` : ""}.
            </span>
          </div>
        )}
        <div className="rounded-xl border p-5 flex flex-col max-w-2xl" style={painel}>
          <div className="flex items-center gap-2.5">
            <FileText size={18} style={{ color: "var(--tinta-sub)" }} />
            <h2 className="text-[16px] font-semibold text-[var(--tinta)]">XML da nota do fornecedor</h2>
          </div>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-1.5">
            NF-e de compra (modelo 55). O fornecedor manda o XML por e-mail junto com o boleto; o contador também tem. Você confere cada item antes de entrar
            no estoque, e a mesma nota nunca entra duas vezes.
          </p>
          <input ref={xmlRef} type="file" aria-label="Arquivo XML da nota de compra" accept=".xml,text/xml,application/xml" className="hidden" onChange={escolherXml} />
          <div className="mt-4">
            <button
              onClick={() => xmlRef.current?.click()}
              disabled={lendo}
              className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)", opacity: lendo ? 0.6 : 1 }}
            >
              {lendo ? "Lendo..." : "Escolher arquivo XML"}
            </button>
          </div>
        </div>
        {alerta}
      </div>
    );
  }

  // ---------- Conferência ----------
  return (
    <section aria-labelledby="titulo-conferencia" className="rounded-xl border overflow-hidden" style={painel}>
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-conferencia" className="text-[16px] font-semibold text-[var(--tinta)]">
            NF-e {nota.numero}
            {nota.serie ? ` série ${nota.serie}` : ""} · {nota.fornecedor || "fornecedor sem nome"}
          </h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            {nota.emitidaEm ? `Emitida em ${dataBR(nota.emitidaEm)}` : "Sem data de emissão"} · {nota.itens.length} {nota.itens.length === 1 ? "item" : "itens"}
            {nota.valorTotal > 0 ? ` · total ${formatBRL(nota.valorTotal)}` : ""}
          </p>
        </div>
        <button
          onClick={recomecar}
          className="flex items-center gap-2 text-[14px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
          style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
        >
          <RotateCcw size={14} />
          Outra nota
        </button>
      </div>

      {jaImportadaEm && (
        <div role="alert" className="mx-5 mb-3 text-[14px] rounded-lg px-4 py-3 flex items-start gap-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Essa nota já foi importada em {new Date(jaImportadaEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Lançar de novo dobraria o estoque, então o sistema não deixa.
        </div>
      )}

      <div tabIndex={0} role="region" aria-label="Itens da nota e insumos" className="overflow-x-auto">
        <table className="w-full text-[14px] min-w-[860px]">
          <thead>
            <tr className="text-left">
              <th className="py-2.5 px-5">Item na nota</th>
              <th className="py-2.5 px-3 text-right">Quantidade</th>
              <th className="py-2.5 px-3 text-right">Valor</th>
              <th className="py-2.5 px-3 w-[280px]">Insumo</th>
              <th className="py-2.5 px-5 w-[220px]">Entra no estoque</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const d = decisoes[l.ordem];
              const r = resultado[l.ordem - 1];
              const escolha = d?.ignorar ? IGNORAR : (d?.insumoId ?? "");
              const insumoAtual = d?.insumoId ? insumos.find((i) => i.id === d.insumoId) : undefined;
              const mostrarFator = !!insumoAtual && (r?.status === "precisa_fator" || fatores[l.ordem] !== undefined);
              return (
                <tr key={l.ordem} className="border-t align-top" style={{ borderColor: "var(--linha)" }}>
                  <td className="py-2.5 px-5">
                    <div className="font-medium text-[var(--tinta)]">{l.descricao}</div>
                    {l.codigo && <div className="text-[12px] text-[var(--tinta-faint)]">código {l.codigo}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[var(--tinta-sub)] whitespace-nowrap">
                    {formatQtd(l.quantidade)} {l.unidade}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {formatBRL(l.valor)}
                    {l.custosExtras > 0 && <div className="text-[12px] text-[var(--tinta-faint)]">+ {formatBRL(l.custosExtras)} frete/impostos</div>}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={escolha}
                      onChange={(e) => escolherInsumo(l.ordem, e.target.value)}
                      className={`${campo} w-full min-h-[var(--alvo-toque)]`}
                      style={{ borderColor: escolha ? "var(--linha-forte)" : "var(--aviso)" }}
                      aria-label={`Insumo de ${l.descricao}`}
                    >
                      <option value="">Escolha o insumo</option>
                      {l.alternativas.length > 0 && (
                        <optgroup label="Parecidos">
                          {l.alternativas.map((a) => (
                            <option key={`s-${a.id}`} value={a.id}>
                              {a.nome}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Todos os insumos">
                        {insumosOrdenados.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nome} ({i.unidadeMedida})
                          </option>
                        ))}
                      </optgroup>
                      <option value={IGNORAR}>Não é insumo (limpeza, descartável): ignorar</option>
                    </select>
                    {d && !d.ignorar && d.insumoId === l.insumoSugeridoId && l.origemSugestao && (
                      <div className="text-[12px] text-[var(--tinta-faint)] mt-1">{l.origemSugestao === "lembrado" ? "ligado na nota anterior deste fornecedor" : "sugerido pelo nome, confira"}</div>
                    )}
                    {mostrarFator && insumoAtual && (
                      <label className="flex items-center gap-2 mt-2 text-[13px] text-[var(--tinta-sub)]">
                        <span className="whitespace-nowrap">1 {l.unidade || "un"} =</span>
                        <input
                          value={fatores[l.ordem] ?? ""}
                          onChange={(e) => mudarFator(l.ordem, e.target.value)}
                          inputMode="decimal"
                          placeholder="?"
                          aria-label={`Quanto de ${insumoAtual.nome} vem em cada ${l.unidade || "unidade"}`}
                          className={`${campo} w-24 text-right`}
                          style={{ borderColor: r?.status === "precisa_fator" ? "var(--aviso)" : "var(--linha-forte)" }}
                        />
                        <span>{insumoAtual.unidadeMedida}</span>
                      </label>
                    )}
                  </td>
                  <td className="py-2.5 px-5 text-[13px]">
                    {r?.status === "pronto" && (
                      <div>
                        <div className="text-[var(--tinta)]">
                          + {formatQtd(r.quantidadeInsumo ?? 0)} {r.unidadeInsumo}
                        </div>
                        {r.precoUnitarioNovo != null ? (
                          <div className="text-[var(--tinta-sub)]">
                            {formatBRL(r.precoUnitarioAtual ?? 0)} → {formatBRL(r.precoUnitarioNovo)}/{r.unidadeInsumo}
                            {r.variacao != null && <span style={{ color: r.suspeito ? "var(--danger)" : undefined }}> ({pct(r.variacao)})</span>}
                          </div>
                        ) : (
                          <div className="text-[var(--tinta-faint)]">nota sem valor: preço fica</div>
                        )}
                        {r.suspeito && <div style={{ color: "var(--danger)" }}>Preço mudou demais: confira a unidade.</div>}
                      </div>
                    )}
                    {r?.status === "ignorado" && <span className="text-[var(--tinta-faint)]">fica de fora</span>}
                    {(r?.status === "sem_insumo" || r?.status === "precisa_fator" || r?.status === "invalido") && <span style={{ color: "var(--aviso)" }}>{r.motivo}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t space-y-2" style={{ borderColor: "var(--linha)" }}>
        <label className="flex items-start gap-2 text-[14px] text-[var(--tinta)] min-h-10">
          <input type="checkbox" checked={atualizarPrecos} onChange={(e) => setAtualizarPrecos(e.target.checked)} className="mt-1" />
          <span>
            Atualizar o preço dos insumos pelo da nota
            <span className="block text-[12px] text-[var(--tinta-sub)]">Muda o custo das fichas e o CMV teórico a partir de agora. Fica no histórico de preço.</span>
          </span>
        </label>
        {temExtras && (
          <label className="flex items-start gap-2 text-[14px] text-[var(--tinta)] min-h-10">
            <input type="checkbox" checked={incluirExtras} onChange={(e) => setIncluirExtras(e.target.checked)} className="mt-1" />
            <span>
              Somar frete, seguro, IPI e ICMS-ST no custo
              <span className="block text-[12px] text-[var(--tinta-sub)]">É o custo real de pôr o insumo na cozinha. Desmarque se o frete já é lançado à parte.</span>
            </span>
          </label>
        )}
      </div>

      {erro && <div className="mx-5 mb-3">{alerta}</div>}

      <div className="p-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--linha)" }}>
        <div className="text-[13px]" style={{ color: pode.ok ? "var(--tinta-sub)" : "var(--aviso)" }}>
          {pode.ok ? (suspeitos > 0 ? `${suspeitos} ${suspeitos === 1 ? "preço mudou" : "preços mudaram"} mais de 50%: confira antes de lançar.` : "Tudo conferido.") : pode.motivo}
        </div>
        <button
          onClick={confirmar}
          disabled={!pode.ok || gravando || !!jaImportadaEm}
          className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)", opacity: !pode.ok || gravando || jaImportadaEm ? 0.5 : 1 }}
        >
          {gravando ? "Lançando..." : "Lançar no estoque"}
        </button>
      </div>
    </section>
  );
}
