"use client";

// ESCALAS (2026-09-26): regras do restaurante. As inegociáveis aparecem
// travadas (não têm botão); o que é configurável: a cada quantas semanas cada
// pessoa folga um domingo e o mínimo de pessoas por equipe em cada dia.

import { useState } from "react";
import { Lock, Minus, Plus, Scale } from "lucide-react";
import type { RegrasEscala } from "@/lib/escalas/tipos";
import { rotuloEquipe, tint } from "./visual";

type Resultado = { ok: true } | { ok: false; erro: string };

const TRAVADAS = [
  "Cozinha, salão e bar nunca folgam sexta nem sábado.",
  "Folga regular só de segunda a quinta; domingo de folga só pelo rodízio.",
  "No máximo 6 dias seguidos de trabalho (o 7º é descanso).",
  "Cozinha, salão e bar só em 5x2 ou 6x1 (12x36 e 24x48 fariam a folga cair na sexta ou no sábado).",
];

export function RegrasView({ regras, equipes, aoSalvar }: { regras: RegrasEscala; equipes: string[]; aoSalvar: (r: RegrasEscala) => Promise<Resultado> }) {
  const [intervalo, setIntervalo] = useState(regras.intervaloDomingoSemanas);
  const [cobertura, setCobertura] = useState<Record<string, number>>(regras.coberturaMinima);
  const [estado, setEstado] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    const r = await aoSalvar({ intervaloDomingoSemanas: intervalo, coberturaMinima: cobertura });
    setSalvando(false);
    setEstado(r.ok ? { tipo: "ok", texto: "Regras salvas. A escala já foi recalculada." } : { tipo: "erro", texto: r.erro });
  };
  const mudar = (equipe: string, delta: number) => {
    setEstado(null);
    setCobertura((c) => ({ ...c, [equipe]: Math.max(0, Math.min(50, (c[equipe] ?? 0) + delta)) }));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start max-w-5xl">
      <section className="rounded-xl border p-5" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
        <h2 className="text-[16px] font-semibold mb-1">Regras fixas</h2>
        <p className="text-[13px] text-[var(--tinta-sub)] mb-4">Valem pra todo mundo e não dá pra desligar.</p>
        <ul className="space-y-2.5">
          {TRAVADAS.map((t) => (
            <li key={t} className="flex gap-2.5 text-[14px]">
              <Lock size={15} className="shrink-0 mt-0.5 text-[var(--tinta-faint)]" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-5 space-y-6" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
        <div>
          <h2 className="text-[16px] font-semibold mb-1">Domingo de folga (rodízio)</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mb-3">Cada pessoa folga 1 domingo a cada:</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rodízio de domingo">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={intervalo === n}
                onClick={() => {
                  setIntervalo(n);
                  setEstado(null);
                }}
                className="min-h-11 px-4 rounded-lg border text-[14px] font-medium"
                style={intervalo === n ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
              >
                {n} semanas
              </button>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[12px] mt-2" style={{ color: intervalo > 3 ? "var(--etapa-producao-texto)" : "var(--tinta-faint)" }}>
            <Scale size={14} className="shrink-0 mt-px" />
            {intervalo > 3
              ? "Acima de 3 semanas: pra comércio em geral a lei pede pelo menos 1 domingo a cada 3 (Lei 10.101/2000, art. 6º). Só use se a convenção coletiva do seu sindicato permitir."
              : "Comércio em geral: pelo menos 1 domingo a cada 3 semanas (Lei 10.101/2000, art. 6º). Confirme a convenção do seu sindicato."}
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-semibold mb-1">Mínimo por dia em cada equipe</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mb-3">Abaixo disso a escala avisa (em sexta e sábado, como crítico).</p>
          {equipes.length === 0 ? (
            <p className="text-[13px] text-[var(--tinta-faint)]">Cadastre a equipe primeiro.</p>
          ) : (
            <ul className="divide-y rounded-lg border" style={{ borderColor: "var(--linha)" }}>
              {equipes.map((e) => (
                <li key={e} className="flex items-center gap-3 px-3 py-2" style={{ borderColor: "var(--linha)" }}>
                  <span className="flex-1 text-[14px]">{rotuloEquipe(e)}</span>
                  <button onClick={() => mudar(e, -1)} aria-label={`Menos em ${rotuloEquipe(e)}`} className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--linha-forte)" }}>
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">{cobertura[e] ?? 0}</span>
                  <button onClick={() => mudar(e, 1)} aria-label={`Mais em ${rotuloEquipe(e)}`} className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--linha-forte)" }}>
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {estado && (
          <p role={estado.tipo === "erro" ? "alert" : "status"} className="text-[14px] rounded-lg px-3 py-2" style={{ background: tint(estado.tipo === "erro" ? "var(--etapa-perda)" : "var(--etapa-produzido)", 10), color: estado.tipo === "erro" ? "var(--etapa-perda-texto)" : "var(--etapa-produzido-texto)" }}>
            {estado.texto}
          </p>
        )}
        <button onClick={salvar} disabled={salvando} className="w-full min-h-11 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          {salvando ? "Salvando..." : "Salvar regras"}
        </button>
      </section>
    </div>
  );
}
