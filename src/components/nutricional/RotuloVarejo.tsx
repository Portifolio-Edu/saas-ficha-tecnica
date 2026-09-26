"use client";

// RÓTULO PARA VAREJO (2026-09-26): prévia do rótulo de supermercado (fundo
// branco e letra preta, como a norma exige na tabela) e, ao lado, a revisão
// antes de mandar pra gráfica: o que bloqueia (vermelho), o que merece atenção
// (âmbar) e o que já está ok. O PDF sai com a mesma montagem
// (src/lib/pdf/RotuloVarejoPdf.tsx). Regras: src/lib/dominio/rotuloVarejo.ts.

import { AlertTriangle, CheckCircle2, Download, OctagonAlert, PencilLine } from "lucide-react";
import type { LinhaTabelaVarejo, Pendencia } from "@/lib/dominio/rotuloVarejo";

export interface ConteudoRotuloVarejo {
  nomeProduto: string;
  pesoLiquido: string | null;
  unidadeBase: "g" | "mL";
  pesoPorcao: number | null;
  medidaCaseira: string | null;
  porcoesPorEmbalagem: number | null;
  ingredientes: string | null;
  alergicos: string | null;
  gluten: string | null;
  lactose: string | null;
  linhas: LinhaTabelaVarejo[];
  altoEm: string[];
  conservacao: string | null;
  modoPreparo: string | null;
  fabricante: string | null;
  endereco: string | null;
}

const PRETO = "#000";
const cabecalho = { color: PRETO, fontWeight: 700, fontSize: 11 } as const;

export function PreviaRotuloVarejo({ c }: { c: ConteudoRotuloVarejo }) {
  const faltando = <span style={{ color: "#B42318", fontWeight: 600 }}>[faltando]</span>;
  const porcao = c.pesoPorcao ? `${c.pesoPorcao} ${c.unidadeBase}` : "—";
  return (
    <div
      aria-label="Prévia do rótulo para varejo"
      className="rounded-xl p-5 text-[12.5px] leading-snug space-y-3"
      style={{ background: "#fff", color: PRETO, fontFamily: "Helvetica, Arial, sans-serif", border: "1px solid var(--linha)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[17px] font-bold uppercase tracking-tight">{c.nomeProduto}</div>
        <div className="text-[12px] text-right shrink-0">
          PESO LÍQUIDO<br />
          <b className="text-[14px]">{c.pesoLiquido || faltando}</b>
        </div>
      </div>

      {c.altoEm.length > 0 && (
        <div className="inline-flex flex-col border-2 px-3 py-1.5" style={{ borderColor: PRETO }}>
          <span className="text-[10px] font-bold">🔍 ALTO EM</span>
          {c.altoEm.map((n) => (
            <span key={n} className="text-[13px] font-extrabold uppercase leading-tight">{n}</span>
          ))}
          <span className="text-[9px] mt-0.5">(aplicar a arte oficial da IN 75, Anexo XVII)</span>
        </div>
      )}

      <p>{c.ingredientes ?? <>INGREDIENTES: {faltando}</>}</p>
      <p className="font-bold uppercase">{c.alergicos ?? "ALÉRGICOS: "}{!c.alergicos && faltando}</p>
      <p className="font-bold uppercase">
        {c.gluten ?? faltando}
        {c.lactose ? <> · {c.lactose}</> : null}
      </p>

      <div className="border-2 p-2.5" style={{ borderColor: PRETO, maxWidth: 380 }}>
        <div className="text-[13px] font-extrabold border-b-2 pb-1" style={{ borderColor: PRETO }}>INFORMAÇÃO NUTRICIONAL</div>
        <div className="text-[11px] py-1 border-b" style={{ borderColor: PRETO }}>
          Porções por embalagem: {c.porcoesPorEmbalagem ?? "—"}
          <br />
          Porção: {porcao} ({c.medidaCaseira || "medida caseira"})
        </div>
        <table className="w-full text-[11px]" style={{ ...{ fontVariantNumeric: "tabular-nums" } }}>
          <thead>
            <tr className="border-b-2" style={{ borderColor: PRETO }}>
              {/* Estilo inline: o thead th global do sistema (cinza, 500) não vale no rótulo, que é sempre preto no branco. */}
              <td className="py-0.5"></td>
              <th scope="col" className="text-right py-0.5 px-1" style={cabecalho}>100 {c.unidadeBase}</th>
              <th scope="col" className="text-right py-0.5 px-1" style={cabecalho}>{porcao}</th>
              <th scope="col" className="text-right py-0.5 pl-1" style={cabecalho}>%VD*</th>
            </tr>
          </thead>
          <tbody>
            {c.linhas.map((l) => (
              <tr key={l.rotulo} className="border-b" style={{ borderColor: "#666" }}>
                <td className={`py-0.5 ${l.nivel ? "pl-3" : "font-semibold"}`}>{l.rotulo}</td>
                <td className="text-right py-0.5 px-1">{l.por100}</td>
                <td className="text-right py-0.5 px-1">{l.porPorcao}</td>
                <td className="text-right py-0.5 pl-1">{l.vd}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[9.5px] pt-1">*Percentual de valores diários fornecidos pela porção.</div>
      </div>

      <p><b>CONSERVAÇÃO:</b> {c.conservacao || faltando}</p>
      {c.modoPreparo && <p><b>MODO DE PREPARO:</b> {c.modoPreparo}</p>}
      <p className="text-[11px]">
        <b>Fabricado por:</b> {c.fabricante || faltando} · {c.endereco || faltando}
        <br />
        Lote e validade: impressos na embalagem.
      </p>
    </div>
  );
}

export function RevisaoRotulo({
  pendencias,
  onEditar,
  onPdf,
  gerando,
}: {
  pendencias: Pendencia[];
  onEditar: () => void;
  onPdf: () => void;
  gerando: boolean;
}) {
  const bloqueia = pendencias.filter((p) => p.nivel === "bloqueia");
  const atencao = pendencias.filter((p) => p.nivel === "atencao");
  const pronto = bloqueia.length === 0;
  return (
    <section aria-label="Revisão antes da gráfica" className="rounded-xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
      <div className="flex items-start gap-3">
        {pronto ? <CheckCircle2 size={22} style={{ color: "var(--sucesso)" }} className="shrink-0" /> : <OctagonAlert size={22} style={{ color: "var(--danger)" }} className="shrink-0" />}
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--tinta)]">{pronto ? "Pronto pra gráfica" : `${bloqueia.length} ${bloqueia.length === 1 ? "item impede" : "itens impedem"} a impressão`}</h3>
          <p className="text-[12.5px] text-[var(--tinta-sub)] mt-0.5">
            {pronto ? "Nada obrigatório faltando. Revise a prévia com o responsável técnico antes de aprovar a arte." : "Resolva os itens em vermelho. O PDF sai com a marca RASCUNHO enquanto faltar algo."}
          </p>
        </div>
      </div>

      {pendencias.length > 0 && (
        <ul className="mt-4 space-y-2">
          {[...bloqueia, ...atencao].map((p) => (
            <li key={p.id} className="flex gap-2.5 rounded-lg px-3 py-2.5" style={{ background: p.nivel === "bloqueia" ? "var(--danger-soft)" : "color-mix(in srgb, var(--aviso) 10%, transparent)" }}>
              {p.nivel === "bloqueia" ? <OctagonAlert size={16} className="shrink-0 mt-0.5" style={{ color: "var(--danger)" }} /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--aviso)" }} />}
              <div>
                <div className="text-[13px] font-semibold text-[var(--tinta)]">{p.titulo}</div>
                <div className="text-[12.5px] text-[var(--tinta-sub)]">{p.detalhe}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onEditar} className="min-h-11 px-4 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
          <PencilLine size={15} /> Editar dados do rótulo
        </button>
        <button onClick={onPdf} disabled={gerando} className="min-h-11 px-4 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          <Download size={15} /> {gerando ? "Gerando…" : pronto ? "PDF · Rótulo para varejo" : "PDF (rascunho)"}
        </button>
      </div>
    </section>
  );
}
