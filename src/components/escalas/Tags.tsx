"use client";

// PERFIL (2026-09-27): tags do prontuário de competências. Três tons, cada um
// com um sentido só, pra leitura rápida:
//  - praça (laranja): o que a pessoa domina — é o que o matchmaking cruza;
//  - forte (azul): pontos fortes;
//  - limite (vermelho suave): gargalos e limitações.
// SeletorTags: sugestões tocáveis + "outra" digitada (Enter adiciona).

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { LIMITES, chaveTag, limparTag } from "@/lib/escalas/perfil";
import { tint } from "./visual";

export type TomTag = "praca" | "forte" | "limite" | "neutro";

const COR: Record<TomTag, { cor: string; texto: string }> = {
  praca: { cor: "var(--etapa-producao)", texto: "var(--etapa-producao-texto)" },
  forte: { cor: "var(--etapa-estoque)", texto: "var(--etapa-estoque-texto)" },
  limite: { cor: "var(--etapa-perda)", texto: "var(--etapa-perda-texto)" },
  neutro: { cor: "var(--tinta)", texto: "var(--tinta-sub)" },
};

export function estiloTag(tom: TomTag) {
  const c = COR[tom];
  return { background: tint(c.cor, tom === "neutro" ? 7 : 15), color: c.texto, borderColor: tint(c.cor, tom === "neutro" ? 14 : 32) };
}

export function Tag({ children, tom, onRemover }: { children: React.ReactNode; tom: TomTag; onRemover?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 min-h-6 px-2 rounded-md border text-[12px] font-medium leading-tight" style={estiloTag(tom)}>
      {children}
      {onRemover && (
        <button type="button" onClick={onRemover} aria-label={`Tirar ${children}`} className="-mr-1 w-5 h-5 rounded flex items-center justify-center opacity-70 hover:opacity-100">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/** Lista curta pra cartões: mostra até `max` e "+N". */
export function ListaTags({ tags, tom, max = 4, vazio }: { tags: string[]; tom: TomTag; max?: number; vazio?: string }) {
  if (tags.length === 0) return vazio ? <span className="text-[12px] text-[var(--tinta-faint)]">{vazio}</span> : null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => (
        <Tag key={t} tom={tom}>
          {t}
        </Tag>
      ))}
      {tags.length > max && (
        <span className="inline-flex items-center min-h-6 px-1.5 text-[12px] font-medium text-[var(--tinta-faint)]" title={tags.slice(max).join(", ")}>
          +{tags.length - max}
        </span>
      )}
    </span>
  );
}

export function SeletorTags({
  rotulo,
  sugestoes,
  valor,
  onChange,
  tom,
  placeholder = "Outra…",
}: {
  rotulo: string;
  sugestoes: string[];
  valor: string[];
  onChange: (v: string[]) => void;
  tom: TomTag;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const marcadas = new Set(valor.map(chaveTag));
  const extras = valor.filter((v) => !sugestoes.some((s) => chaveTag(s) === chaveTag(v)));
  const cheio = valor.length >= LIMITES.tags;

  const alternar = (t: string) => {
    setAviso(null);
    if (marcadas.has(chaveTag(t))) return onChange(valor.filter((v) => chaveTag(v) !== chaveTag(t)));
    if (cheio) return setAviso(`No máximo ${LIMITES.tags}.`);
    onChange([...valor, t]);
  };
  const adicionar = () => {
    const t = limparTag(texto);
    if (!t) return;
    if (marcadas.has(chaveTag(t))) {
      setTexto("");
      return setAviso(`"${t}" já está marcado.`);
    }
    if (cheio) return setAviso(`No máximo ${LIMITES.tags}.`);
    onChange([...valor, t]);
    setTexto("");
    setAviso(null);
  };

  return (
    <div role="group" aria-label={rotulo}>
      <div className="flex flex-wrap gap-1.5">
        {[...sugestoes, ...extras].map((t) => {
          const ativo = marcadas.has(chaveTag(t));
          return (
            <button
              key={t}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(t)}
              className="min-h-9 px-2.5 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
              style={ativo ? estiloTag(tom) : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
            >
              {ativo ? <Check size={13} strokeWidth={3} /> : <Plus size={13} className="opacity-60" />}
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, LIMITES.tag))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder}
          aria-label={`${rotulo}: adicionar outra`}
          className="flex-1 min-w-0 min-h-9 px-3 rounded-lg border bg-[var(--panel)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]"
          style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
        />
        <button type="button" onClick={adicionar} disabled={!texto.trim()} className="min-h-9 px-3 rounded-lg border text-[13px] font-medium disabled:opacity-40" style={{ borderColor: "var(--linha-forte)" }}>
          Adicionar
        </button>
      </div>
      {aviso && <p className="text-[12px] mt-1.5" style={{ color: "var(--etapa-producao-texto)" }}>{aviso}</p>}
    </div>
  );
}
