// DESEMPENHO (2026-10-02): relato de "toque lento" vindo do navegador de
// quem usa o sistema de verdade. Antes a gente só sabia de uma travada quando
// alguém tirava print da barra da Vercel, e aí não dava pra saber se o
// culpado era o nosso código, uma extensão do navegador ou a própria barra.
// Agora todo toque acima de LIMITE_MS vira uma linha no log do servidor
// (Vercel → Logs, procure "toque-lento"), com o script que segurou o toque.
// Puro (sem navegador/servidor) pra dar pra testar. Ver docs/DESEMPENHO.md.

/** "Bom" no Core Web Vitals (INP) é até 200 ms. */
export const LIMITE_MS = 200;

export type OrigemScript = "app" | "extensao" | "barra-vercel" | "pagina" | "outro";

export interface ScriptCulpado {
  origem: OrigemScript;
  /** Arquivo (só o nome) ou host, nunca a URL inteira. */
  arquivo: string;
  /** O que chamou o script: "click", "MessagePort.onmessage", "classic-script"… */
  chamada: string;
  ms: number;
}

export interface RelatoToque {
  rota: string;
  evento: string;
  /** Elemento tocado, no formato da barra da Vercel: tag.classe1.classe2 (curto). */
  alvo: string;
  /** Tempo até o código do toque começar (outra tarefa ocupando a tela). */
  atrasoMs: number;
  /** Tempo rodando o código do toque. */
  processamentoMs: number;
  /** Tempo até a tela desenhar depois do código. */
  apresentacaoMs: number;
  totalMs: number;
  /** Segundos desde a abertura da página (toque logo na abertura = carga pesada). */
  segundosDesdeAbertura: number;
  scripts: ScriptCulpado[];
}

export function origemDoScript(url: string, origemDaPagina: string): { origem: OrigemScript; arquivo: string } {
  if (!url) return { origem: "pagina", arquivo: "(código na própria página)" };
  if (/^(chrome|moz|safari-web)-extension:\/\//.test(url)) return { origem: "extensao", arquivo: url.split("/")[2] ?? "extensão" };
  try {
    const u = new URL(url);
    if (/(^|\.)vercel\.live$/.test(u.hostname) || u.pathname.includes("/_vercel/")) return { origem: "barra-vercel", arquivo: u.pathname.split("/").pop() || u.hostname };
    if (u.origin === origemDaPagina) {
      if (u.pathname.startsWith("/_next/")) return { origem: "app", arquivo: u.pathname.split("/").pop() || u.pathname };
      return { origem: "pagina", arquivo: u.pathname.slice(0, 80) };
    }
    return { origem: "outro", arquivo: u.hostname };
  } catch {
    return { origem: "outro", arquivo: url.slice(0, 80) };
  }
}

/** tag.classe1.classe2, como a barra da Vercel mostra; sem texto nem atributos (nada de dado da pessoa). */
export function descreverAlvo(tag: string | undefined, classes: string | undefined): string {
  if (!tag) return "(sem alvo)";
  const cls = (classes ?? "").split(/\s+/).filter(Boolean).slice(0, 3);
  return [tag.toLowerCase(), ...cls].join(".").slice(0, 120);
}

const num = (v: unknown, max = 600_000) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : 0);
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").slice(0, max) : "");
const ORIGENS: OrigemScript[] = ["app", "extensao", "barra-vercel", "pagina", "outro"];

/** Confere e limpa o que chegou do navegador. Devolve null se não for um relato válido. */
export function validarRelato(corpo: unknown): RelatoToque | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as Record<string, unknown>;
  const totalMs = num(c.totalMs);
  const rota = txt(c.rota, 200).split("?")[0];
  if (totalMs < LIMITE_MS || !rota.startsWith("/")) return null;
  const scripts = (Array.isArray(c.scripts) ? c.scripts : []).slice(0, 5).flatMap((s): ScriptCulpado[] => {
    if (!s || typeof s !== "object") return [];
    const x = s as Record<string, unknown>;
    const origem = ORIGENS.includes(x.origem as OrigemScript) ? (x.origem as OrigemScript) : "outro";
    return [{ origem, arquivo: txt(x.arquivo, 80), chamada: txt(x.chamada, 80), ms: num(x.ms) }];
  });
  return {
    rota,
    evento: txt(c.evento, 30),
    alvo: txt(c.alvo, 120),
    atrasoMs: num(c.atrasoMs),
    processamentoMs: num(c.processamentoMs),
    apresentacaoMs: num(c.apresentacaoMs),
    totalMs,
    segundosDesdeAbertura: num(c.segundosDesdeAbertura, 86_400),
    scripts,
  };
}
