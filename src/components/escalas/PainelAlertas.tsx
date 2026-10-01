"use client";

// ESCALAS (2026-09-26): alertas do mês. Críticos primeiro (contingência,
// cobertura em dia de pico, cadastro inválido); depois atenção (cobertura em
// dia comum, restrições, rodízio acima de 3 semanas); por último os ajustes
// automáticos (folga remanejada), recolhidos. Alerta de dia que já passou
// não pede ação: sai da contagem e fica recolhido em "Dias que já passaram".

import { createContext, useContext, useState } from "react";
import { AlertTriangle, AlertOctagon, Info, ChevronDown, UserX, Users, ShieldAlert, Phone, MessageCircle } from "lucide-react";
import type { Alerta, DataISO, Severidade } from "@/lib/escalas/tipos";
import { rotuloNivel } from "@/lib/escalas/perfil";
import { extrasCompativeis, mensagemConvite, normalizarTelefone, type Extra } from "@/lib/escalas/extras";
import { diaMes, rotuloEquipe, tint } from "./visual";
import { Tag } from "./Tags";

/** PERFIL (2026-09-27): banco de extras pro matchmaking dentro dos alertas. */
export const ContextoExtras = createContext<{ extras: Extra[]; restaurante: string; hoje: DataISO; irParaExtras: () => void } | null>(null);

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
  const nivel = rotuloNivel(a.perfil?.nivel);
  return (
    <li className="flex gap-3 px-4 py-3">
      <Icone a={a} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[var(--tinta)] leading-snug">{a.mensagem}</p>
        {a.tipo === "contingencia" && a.perfil && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[12px] text-[var(--tinta-faint)]">Perfil do extra:</span>
            {[a.perfil.cargo, nivel].filter(Boolean).map((t) => (
              <span key={t} className="text-[12px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                {t}
              </span>
            ))}
            {a.perfil.habilidades.map((t) => (
              <Tag key={t} tom="praca">
                {t}
              </Tag>
            ))}
          </div>
        )}
        {a.tipo === "contingencia" && a.perfil && a.data && <CandidatosExtra alerta={a} />}
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

/** Extras compatíveis com quem faltou (setor, nível ≥, praças do prontuário). */
function CandidatosExtra({ alerta }: { alerta: Alerta }) {
  const ctx = useContext(ContextoExtras);
  const [aberto, setAberto] = useState(false);
  if (!ctx || !alerta.perfil || !alerta.data || alerta.data < ctx.hoje) return null;
  const candidatos = extrasCompativeis(alerta.perfil, ctx.extras);
  if (candidatos.length === 0) {
    return (
      <p className="text-[12px] mt-2" style={{ color: "var(--etapa-producao-texto)" }}>
        Nenhum extra compatível no banco.{" "}
        <button onClick={ctx.irParaExtras} className="underline underline-offset-2 font-medium">
          Cadastrar extras
        </button>
      </p>
    );
  }
  const completos = candidatos.filter((c) => c.completo).length;
  return (
    <div className="mt-2">
      <button onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="min-h-9 px-2.5 -ml-2.5 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-semibold hover:bg-[var(--panel-hover)]" style={{ color: "var(--etapa-estoque-texto)" }}>
        <ChevronDown size={15} style={{ transform: aberto ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
        {candidatos.length} {candidatos.length === 1 ? "extra compatível" : "extras compatíveis"}
        {completos > 0 && <span className="font-normal text-[var(--tinta-sub)]">· {completos} {completos === 1 ? "cobre" : "cobrem"} todas as praças</span>}
      </button>
      {aberto && (
        <ul className="mt-1.5 rounded-lg border divide-y" style={{ borderColor: "var(--linha)" }} aria-label="Extras compatíveis">
          {candidatos.slice(0, 6).map((c) => {
            const tel = normalizarTelefone(c.extra.telefone);
            const texto = mensagemConvite(c.extra, { cargo: alerta.perfil!.cargo, data: alerta.data! }, ctx.restaurante);
            return (
              <li key={c.extra.id} className="px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ borderColor: "var(--linha)" }}>
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[14px] font-medium">
                    {c.extra.nome}
                    {c.extra.nivel && <span className="ml-2 text-[12px] font-semibold" style={{ color: "var(--etapa-estoque-texto)" }}>{rotuloNivel(c.extra.nivel)}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.pracasEmComum.map((t) => <Tag key={t} tom="praca">{t}</Tag>)}
                    {c.pracasFaltando.map((t) => (
                      <span key={t} className="inline-flex items-center min-h-6 px-2 rounded-md text-[12px] line-through text-[var(--tinta-faint)]" title="Não domina">
                        {t}
                      </span>
                    ))}
                    {c.pracasEmComum.length === 0 && c.mesmoCargo && <Tag tom="neutro">Mesmo cargo</Tag>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {c.extra.aceitaWhatsapp && (
                    <a href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className="min-h-9 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ background: tint("var(--etapa-produzido)", 16), color: "var(--etapa-produzido-texto)" }}>
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  <a href={`tel:+${tel}`} className="min-h-9 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5" style={{ borderColor: "var(--linha-forte)" }} aria-label={`Ligar pra ${c.extra.nome}`}>
                    <Phone size={14} /> Ligar
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
