"use client";

// DESEMPENHO (2026-10-02): mede, no navegador de quem usa o sistema de
// verdade, os toques que demoram mais de 200 ms pra tela responder, e conta
// pro servidor qual script segurou (src/lib/desempenho/toqueLento.ts). Fica
// no layout raiz, então vale pra toda tela (app, demo e cozinha).
// Custo: dois observadores do próprio navegador; nada roda enquanto os toques
// são rápidos. Manda no máximo o pior toque por tela, ao trocar de tela ou
// sair. Só em produção e só nos navegadores que medem (Chrome/Edge).
// Reverter: tirar <MedidorToque /> de src/app/layout.tsx.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LIMITE_MS, descreverAlvo, origemDoScript, type RelatoToque, type ScriptCulpado } from "@/lib/desempenho/toqueLento";

type Evento = PerformanceEntry & { interactionId?: number; processingStart: number; processingEnd: number; target?: Element | null };
type Quadro = PerformanceEntry & {
  scripts?: { duration: number; invoker?: string; invokerType?: string; sourceURL?: string }[];
};

// Um toque gera várias entradas (pointerdown, pointerup, click) com o mesmo
// interactionId; junta todas, como o Chrome faz no INP. Os scripts culpados
// vêm dos quadros longos, que o navegador entrega DEPOIS do evento: por isso
// são cruzados só na hora de enviar.
interface Toque {
  id: number;
  rota: string;
  evento: string;
  alvo: string;
  inicio: number;
  inicioCodigo: number;
  fimCodigo: number;
  fim: number;
  maiorCodigo: number;
  /** Quadros longos que caíram dentro do toque. */
  quadros: Quadro[];
}
let pior: Toque | null = null;
/** Últimos quadros longos (podem chegar antes ou depois do evento). */
const recentes: Quadro[] = [];
const dentro = (q: Quadro, t: Toque) => q.startTime < t.fim && q.startTime + q.duration > t.inicio;

function guardarQuadro(q: Quadro) {
  if (pior && dentro(q, pior)) pior.quadros.push(q);
  recentes.push(q);
  if (recentes.length > 10) recentes.shift();
}

function registrar(e: Evento) {
  if (!e.interactionId) return;
  const codigo = e.processingEnd - e.processingStart;
  const alvo = () => descreverAlvo(e.target?.tagName, typeof e.target?.className === "string" ? e.target.className : undefined);
  if (pior?.id === e.interactionId) {
    pior.inicio = Math.min(pior.inicio, e.startTime);
    pior.inicioCodigo = Math.min(pior.inicioCodigo, e.processingStart);
    pior.fimCodigo = Math.max(pior.fimCodigo, e.processingEnd);
    pior.fim = Math.max(pior.fim, e.startTime + e.duration);
    if (codigo > pior.maiorCodigo) Object.assign(pior, { evento: e.name, alvo: alvo(), maiorCodigo: codigo });
    return;
  }
  if (e.duration < LIMITE_MS || (pior && pior.fim - pior.inicio >= e.duration)) return;
  pior = {
    id: e.interactionId,
    rota: location.pathname,
    evento: e.name,
    alvo: alvo(),
    inicio: e.startTime,
    inicioCodigo: e.processingStart,
    fimCodigo: e.processingEnd,
    fim: e.startTime + e.duration,
    maiorCodigo: codigo,
    quadros: [],
  };
}

function enviar() {
  if (!pior) return;
  const t = pior;
  pior = null;
  const scripts: ScriptCulpado[] = [...new Set([...t.quadros, ...recentes.filter((q) => dentro(q, t))])]
    .flatMap((q) => q.scripts ?? [])
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map((s) => ({ ...origemDoScript(s.sourceURL ?? "", location.origin), chamada: s.invoker || s.invokerType || "", ms: Math.round(s.duration) }));
  const relato: RelatoToque = {
    rota: t.rota,
    evento: t.evento,
    alvo: t.alvo,
    atrasoMs: Math.round(t.inicioCodigo - t.inicio),
    processamentoMs: Math.round(t.fimCodigo - t.inicioCodigo),
    apresentacaoMs: Math.round(t.fim - t.fimCodigo),
    totalMs: Math.round(t.fim - t.inicio),
    segundosDesdeAbertura: Math.round(t.inicio / 1000),
    scripts,
  };
  const corpo = JSON.stringify(relato);
  try {
    if (!navigator.sendBeacon?.("/api/desempenho", new Blob([corpo], { type: "application/json" }))) {
      void fetch("/api/desempenho", { method: "POST", body: corpo, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {}
}

export function MedidorToque() {
  const rota = usePathname();

  // Trocou de tela: manda o pior toque da tela anterior.
  useEffect(() => enviar, [rota]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || typeof PerformanceObserver === "undefined") return;
    const tipos = PerformanceObserver.supportedEntryTypes ?? [];
    if (!tipos.includes("event")) return;

    const obsQuadros = tipos.includes("long-animation-frame")
      ? new PerformanceObserver((l) => {
          for (const q of l.getEntries() as Quadro[]) guardarQuadro(q);
        })
      : null;
    obsQuadros?.observe({ type: "long-animation-frame", buffered: true });

    const obsEventos = new PerformanceObserver((l) => {
      for (const e of l.getEntries() as Evento[]) registrar(e);
    });
    obsEventos.observe({ type: "event", durationThreshold: 104, buffered: true } as PerformanceObserverInit);

    const aoEsconder = () => document.visibilityState === "hidden" && enviar();
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", enviar);
    return () => {
      obsEventos.disconnect();
      obsQuadros?.disconnect();
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", enviar);
    };
  }, []);

  return null;
}
