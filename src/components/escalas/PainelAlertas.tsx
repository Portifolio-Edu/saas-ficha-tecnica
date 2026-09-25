"use client";

// ESCALAS (2026-09-26): alertas do mês. Críticos primeiro (contingência,
// cobertura em dia de pico, cadastro inválido); depois atenção (cobertura em
// dia comum, restrições, rodízio acima de 3 semanas); por último os ajustes
// automáticos (folga remanejada), recolhidos. Alerta de dia que já passou
// não pede ação: sai da contagem e fica recolhido em "Dias que já passaram".

import { useState } from "react";
import { AlertTriangle, AlertOctagon, Info, ChevronDown, UserX, Users, ShieldAlert } from "lucide-react";
import type { Alerta, DataISO, Severidade } from "@/lib/escalas/tipos";
import { NIVEIS } from "@/lib/escalas/validacao";
import { diaMes, rotuloEquipe, tint } from "./visual";

const ORDEM: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };
const COR: Record<Severidade, { cor: string; texto: string }> = {
  critico: { cor: "var(--etapa-perda)", texto: "var(--etapa-perda-texto)" },
  atencao: { cor: "var(--etapa-producao)", texto: "var(--etapa-producao-texto)" },
  info: { cor: "var(--etapa-estoque)", texto: "var(--etapa-estoque-texto)" },
};

function Icone({ a }: { a: Alerta }) {
  const props = { size: 17, className: "shrink-0 mt-0.5", style: { color: COR[a.severidade].texto } };
  if (a.tipo === "contingencia") return <UserX {...props} />;
  if (a.tipo === "cobertura") return <Users {...props} />;
  if (a.tipo === "restricao") return <ShieldAlert {...props} />;
  if (a.severidade === "critico") return <AlertOctagon {...props} />;
  if (a.severidade === "atencao") return <AlertTriangle {...props} />;
  return <Info {...props} />;
}

export function LinhaAlerta({ a }: { a: Alerta }) {
  const nivel = a.perfil?.nivel ? NIVEIS.find((n) => n.id === a.perfil!.nivel)?.rotulo : null;
  return (
    <li className="flex gap-3 px-4 py-3">
      <Icone a={a} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[var(--tinta)] leading-snug">{a.mensagem}</p>
        {a.tipo === "contingencia" && a.perfil && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[12px] text-[var(--tinta-faint)]">Perfil do extra:</span>
            {[a.perfil.cargo, nivel, ...a.perfil.habilidades].filter(Boolean).map((t) => (
              <span key={t} className="text-[12px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {a.tipo === "cobertura" && a.equipe && <p className="text-[12px] text-[var(--tinta-faint)] mt-0.5">{rotuloEquipe(a.equipe)}</p>}
      </div>
      {a.data && <span className="text-[12px] text-[var(--tinta-faint)] shrink-0 tabular-nums">{diaMes(a.data)}</span>}
    </li>
  );
}

export function PainelAlertas({ alertas, hoje }: { alertas: Alerta[]; hoje: DataISO }) {
  const [verAjustes, setVerAjustes] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [verPassados, setVerPassados] = useState(false);
  const ordenados = [...alertas].sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade] || (a.data ?? "").localeCompare(b.data ?? ""));
  const passou = (a: Alerta) => Boolean(a.data && a.data < hoje);
  const principais = ordenados.filter((a) => a.severidade !== "info" && !passou(a));
  const passados = ordenados.filter((a) => a.severidade !== "info" && passou(a)).sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  const ajustes = ordenados.filter((a) => a.severidade === "info");
  const criticos = principais.filter((a) => a.severidade === "critico").length;
  const visiveis = verTodos ? principais : principais.slice(0, 6);

  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border px-4 py-3.5 text-[14px] flex items-center gap-2.5" style={{ borderColor: tint("var(--etapa-produzido)", 40), background: tint("var(--etapa-produzido)", 8), color: "var(--etapa-produzido-texto)" }}>
        <Info size={17} /> Mês sem alertas: cobertura completa e ninguém faltando.
      </div>
    );
  }

  return (
    <section aria-label="Alertas do mês" className="rounded-xl border overflow-hidden" style={{ borderColor: criticos ? tint("var(--etapa-perda)", 45) : "var(--linha)", background: "var(--panel)" }}>
      <header className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--linha)" }}>
        <h2 className="text-[15px] font-semibold flex-1">Alertas do mês</h2>
        {criticos > 0 && (
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tint("var(--etapa-perda)", 14), color: "var(--etapa-perda-texto)" }}>
            {criticos} {criticos === 1 ? "crítico" : "críticos"}
          </span>
        )}
        <span className="text-[12px] text-[var(--tinta-faint)]">{principais.length} {principais.length === 1 ? "pendente" : "pendentes"}</span>
      </header>
      {principais.length > 0 ? (
        <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
          {visiveis.map((a, i) => (
            <LinhaAlerta key={i} a={a} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[14px] flex items-center gap-2.5" style={{ color: "var(--etapa-produzido-texto)" }}>
          <Info size={17} /> Nada pendente de hoje em diante.
        </p>
      )}
      {principais.length > 6 && (
        <button onClick={() => setVerTodos((v) => !v)} className="w-full min-h-11 px-4 text-[13px] font-medium text-left border-t text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]" style={{ borderColor: "var(--linha)" }}>
          {verTodos ? "Mostrar menos" : `Ver todos os ${principais.length} alertas`}
        </button>
      )}
      <Recolhivel aberto={verPassados} alternar={() => setVerPassados((v) => !v)} lista={passados} rotulo={`${passados.length} ${passados.length === 1 ? "alerta" : "alertas"} de dias que já passaram`} />
      <Recolhivel aberto={verAjustes} alternar={() => setVerAjustes((v) => !v)} lista={ajustes} rotulo={`${ajustes.length} ${ajustes.length === 1 ? "ajuste automático" : "ajustes automáticos"} (folgas remanejadas pra segunda a quinta)`} />
    </section>
  );
}

function Recolhivel({ aberto, alternar, lista, rotulo }: { aberto: boolean; alternar: () => void; lista: Alerta[]; rotulo: string }) {
  if (lista.length === 0) return null;
  return (
    <div className="border-t" style={{ borderColor: "var(--linha)" }}>
      <button onClick={alternar} aria-expanded={aberto} className="w-full min-h-11 px-4 flex items-center gap-2 text-[13px] text-left text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]">
        <ChevronDown size={15} className="shrink-0" style={{ transform: aberto ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
        {rotulo}
      </button>
      {aberto && (
        <ul className="divide-y border-t" style={{ borderColor: "var(--linha)" }}>
          {lista.map((a, i) => (
            <LinhaAlerta key={i} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}
