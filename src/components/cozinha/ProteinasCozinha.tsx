"use client";

// PROTEÍNAS (2026-09-25): manipulação de proteínas no modo cozinha. Quem limpa
// a peça pesa antes (bruto), limpa, pesa o que ficou pronto pra usar (limpo)
// e as aparas que vão ser reaproveitadas. O rendimento aparece na hora e é
// comparado com o padrão da casa (fator de correção do cadastro); abaixo do
// padrão, o motivo é obrigatório. É o controle de perda na limpeza, onde
// mais some carne.
// Nenhum valor em R$ aqui: o valor pago por kg é preenchido no servidor com
// o preço do cadastro (função registrar_processamento_cozinha). O gestor vê
// tudo em Manipulação de proteínas, com custo real por kg limpo.
// Reverter: git revert do commit "Manipulação de proteínas no modo cozinha".

import { useEffect, useMemo, useState } from "react";
import { Beef, Scale, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ficha/Toast";
import { nums } from "@/components/ficha/tema";
import { tint } from "@/components/producoes/formato";
import { fmt } from "./bancada";
import type { LoteProteinaCozinha, ProteinaCozinha } from "@/lib/dominio/cozinha";
import type { AcoesCozinha } from "./CozinhaApp";

const MOTIVOS = ["Peça com muita gordura", "Peça fora do padrão do fornecedor", "Descongelou errado", "Corte diferente do padrão"];

/** Tolerância em pontos percentuais abaixo do rendimento padrão. */
const TOLERANCIA_OK = 2;
const TOLERANCIA_ATENCAO = 5;

const num = (t: string) => {
  const n = Number(t.replace(",", ".").trim());
  return t.trim() === "" || !Number.isFinite(n) ? null : n;
};
const kg = (n: number) => `${fmt(n, 3)} kg`;
const pct = (n: number) => `${fmt(n, 1)}%`;

type Situacao = "ok" | "atencao" | "abaixo";
function situacaoDo(rendimento: number, padrao: number): Situacao {
  if (rendimento >= padrao - TOLERANCIA_OK) return "ok";
  if (rendimento >= padrao - TOLERANCIA_ATENCAO) return "atencao";
  return "abaixo";
}
const COR: Record<Situacao, { cor: string; texto: string; rotulo: string }> = {
  ok: { cor: "var(--etapa-produzido)", texto: "var(--etapa-produzido-texto)", rotulo: "Dentro do padrão da casa" },
  atencao: { cor: "var(--etapa-producao)", texto: "var(--etapa-producao-texto)", rotulo: "Um pouco abaixo do padrão" },
  abaixo: { cor: "var(--etapa-perda)", texto: "var(--etapa-perda-texto)", rotulo: "Abaixo do padrão: anote o motivo e avise o gestor" },
};

export function ProteinasCozinha({
  proteinas,
  lotes,
  responsavel,
  acoes,
}: {
  proteinas: ProteinaCozinha[];
  lotes: LoteProteinaCozinha[];
  responsavel: string;
  acoes: AcoesCozinha;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [proteinaId, setProteinaId] = useState<string | null>(proteinas[0]?.id ?? null);
  const [bruto, setBruto] = useState("");
  const [limpo, setLimpo] = useState("");
  const [aparas, setAparas] = useState("");
  const [motivo, setMotivo] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!proteinaId && proteinas[0]) setProteinaId(proteinas[0].id);
  }, [proteinas, proteinaId]);

  const porId = useMemo(() => new Map(proteinas.map((p) => [p.id, p])), [proteinas]);
  const proteina = proteinaId ? porId.get(proteinaId) : undefined;

  if (proteinas.length === 0) {
    return (
      <section className="max-w-xl">
        <h1 className="text-[24px] font-semibold tracking-tight">Manipulação de proteínas</h1>
        <p className="text-[16px] text-[var(--tinta-sub)] mt-2">Nenhuma proteína cadastrada. O gestor cadastra em Insumos, na categoria proteína.</p>
      </section>
    );
  }

  const b = num(bruto);
  const l = num(limpo);
  const a = num(aparas) ?? 0;
  const pronto = b !== null && l !== null && b > 0 && l > 0;
  const passou = pronto && l! + a > b! + 1e-9;
  const rendimento = pronto ? (l! / b!) * 100 : null;
  const padrao = proteina ? 100 / (proteina.fatorPadrao || 1) : null;
  const situacao = rendimento !== null && padrao !== null && !passou ? situacaoDo(rendimento, padrao) : null;
  const descarte = pronto && !passou ? b! - l! - a : null;
  const textoMotivo = (motivo === "Outro" ? outro : motivo ?? "").trim();
  const precisaMotivo = situacao === "abaixo";
  const podeSalvar = !!proteina && pronto && !passou && (!precisaMotivo || !!textoMotivo) && !salvando;

  const registrar = async () => {
    if (!proteina || !pronto || passou) return;
    if (precisaMotivo && !textoMotivo) return mostrarErro("Rendimento abaixo do padrão: escolha ou escreva o motivo.");
    setSalvando(true);
    const r = await acoes.registrarLoteProteina(
      { insumoId: proteina.id, pesoBruto: b!, pesoLimpo: l!, aparas: a, observacao: textoMotivo || null },
      responsavel,
    );
    setSalvando(false);
    if (!r.ok) return mostrarErro(r.erro);
    mostrarSucesso(`Lote de ${proteina.nome} registrado: rendeu ${pct(rendimento!)}.`);
    setBruto("");
    setLimpo("");
    setAparas("");
    setMotivo(null);
    setOutro("");
  };

  return (
    <section>
      <h1 className="text-[24px] font-semibold tracking-tight">Manipulação de proteínas</h1>
      <p className="text-[15px] text-[var(--tinta-sub)] mt-0.5 mb-5">Pese a peça antes e depois de limpar. O rendimento aparece na hora.</p>

      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {/* 1. Qual proteína */}
          <div>
            <h2 className="text-[17px] font-semibold mb-2">1. Qual peça</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {proteinas.map((p) => {
                const ativa = p.id === proteinaId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProteinaId(p.id)}
                    aria-pressed={ativa}
                    className="min-h-16 rounded-xl border px-3 py-2 text-left"
                    style={{ borderColor: ativa ? "var(--tinta)" : "var(--linha-forte)", background: ativa ? tint("var(--tinta)", 6) : "var(--panel)" }}
                  >
                    <span className="block text-[16px] font-semibold leading-snug">{p.nome}</span>
                    <span className="block text-[13px] text-[var(--tinta-sub)]" style={nums}>padrão: rende {pct(100 / (p.fatorPadrao || 1))}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pesos */}
          <div>
            <h2 className="text-[17px] font-semibold mb-2">2. Pese</h2>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <CampoPeso rotulo="Bruto" ajuda="como chegou" valor={bruto} onChange={setBruto} />
              <CampoPeso rotulo="Limpo" ajuda="pronto pra usar" valor={limpo} onChange={setLimpo} />
              <CampoPeso rotulo="Aparas" ajuda="vão ser reaproveitadas (opcional)" valor={aparas} onChange={setAparas} />
            </div>
          </div>

          {/* 3. Resultado */}
          {passou && (
            <p role="alert" className="rounded-xl px-4 py-3 text-[16px] font-medium flex items-center gap-2" style={{ background: tint("var(--etapa-perda)", 10), color: "var(--etapa-perda-texto)" }}>
              <AlertTriangle size={18} /> O limpo mais as aparas passam do bruto. Confira a balança.
            </p>
          )}
          {situacao && rendimento !== null && padrao !== null && (
            <div className="rounded-xl border p-4" style={{ borderColor: tint(COR[situacao].cor, 45), background: tint(COR[situacao].cor, 7) }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-medium" style={{ color: COR[situacao].texto }}>{COR[situacao].rotulo}</span>
                <span className="text-[14px] text-[var(--tinta-sub)]" style={nums}>padrão {pct(padrao)}</span>
              </div>
              <div className="text-[40px] font-semibold leading-tight mt-1" style={{ ...nums, color: COR[situacao].texto }}>
                rendeu {pct(rendimento)}
              </div>
              {/* Barra: rendimento contra o padrão (traço) */}
              <div className="relative h-3 rounded-full mt-2" style={{ background: tint("var(--tinta)", 10) }} aria-hidden>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, rendimento)}%`, background: COR[situacao].cor }} />
                <div className="absolute -top-1 -bottom-1 w-0.5" style={{ left: `${Math.min(100, padrao)}%`, background: "var(--tinta)" }} />
              </div>
              <p className="text-[15px] text-[var(--tinta-sub)] mt-2.5" style={nums}>
                Descarte {kg(Math.max(0, descarte ?? 0))}
                {a > 0 ? ` · aparas ${kg(a)}` : ""}
              </p>
            </div>
          )}

          {situacao && situacao !== "ok" && (
            <div>
              <h2 className="text-[17px] font-semibold mb-2">O que aconteceu? {precisaMotivo ? "" : <span className="font-normal text-[var(--tinta-sub)]">(opcional)</span>}</h2>
              <div className="grid grid-cols-2 gap-2">
                {[...MOTIVOS, "Outro"].map((m) => {
                  const ativo = motivo === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMotivo(ativo ? null : m)}
                      aria-pressed={ativo}
                      className="min-h-14 rounded-xl border px-3 text-[15px] font-medium text-left"
                      style={{ borderColor: ativo ? "var(--tinta)" : "var(--linha-forte)", background: ativo ? tint("var(--tinta)", 6) : "var(--panel)" }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              {motivo === "Outro" && (
                <input
                  autoFocus
                  value={outro}
                  onChange={(e) => setOutro(e.target.value)}
                  placeholder="Conte o que aconteceu"
                  aria-label="Outro motivo"
                  className="mt-2 w-full min-h-14 px-4 rounded-xl border bg-[var(--panel)] text-[16px] outline-none"
                  style={{ borderColor: "var(--linha-forte)" }}
                />
              )}
            </div>
          )}

          <button
            onClick={registrar}
            disabled={!podeSalvar}
            className="w-full min-h-16 rounded-xl inline-flex items-center justify-center gap-2 text-[17px] font-semibold disabled:opacity-45"
            style={{ background: "var(--tinta)", color: "var(--panel)" }}
          >
            <Check size={19} strokeWidth={2.6} />
            {salvando ? "Registrando..." : proteina ? `Registrar lote de ${proteina.nome}` : "Registrar lote"}
          </button>
        </div>

        {/* Últimos lotes */}
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold mb-2">Últimos lotes</h2>
          {lotes.length === 0 ? (
            <p className="text-[15px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-6 text-center" style={{ borderColor: "var(--linha-forte)" }}>
              Nenhum lote registrado ainda.
            </p>
          ) : (
            <ul className="rounded-xl border overflow-hidden bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
              {lotes.slice(0, 20).map((lote, n) => {
                const p = porId.get(lote.insumoId);
                const rend = lote.pesoBruto > 0 ? (lote.pesoLimpo / lote.pesoBruto) * 100 : 0;
                const s = p ? situacaoDo(rend, 100 / (p.fatorPadrao || 1)) : "ok";
                return (
                  <li key={lote.id} className={`px-4 py-3 ${n > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--linha)" }}>
                    <div className="flex items-center gap-3">
                      <Beef size={18} className="text-[var(--tinta-faint)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[16px] font-medium truncate">{p?.nome ?? "Proteína"}</div>
                        <div className="text-[13px] text-[var(--tinta-sub)]" style={nums}>
                          {new Date(lote.processadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {lote.responsavel}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[16px] font-semibold" style={{ ...nums, color: COR[s].texto }}>{pct(rend)}</div>
                        <div className="text-[12px] text-[var(--tinta-sub)] flex items-center gap-1 justify-end" style={nums}>
                          <Scale size={11} /> {kg(lote.pesoBruto)} → {kg(lote.pesoLimpo)}
                        </div>
                      </div>
                    </div>
                    {lote.observacao && <p className="text-[13px] text-[var(--tinta-sub)] mt-1 pl-[30px]">{lote.observacao}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function CampoPeso({ rotulo, ajuda, valor, onChange }: { rotulo: string; ajuda: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="rounded-xl border px-4 pt-2.5 pb-2 bg-[var(--panel)] block focus-within:ring-2 focus-within:ring-[var(--marca-suave)]" style={{ borderColor: "var(--linha-forte)" }}>
      <span className="block text-[15px] font-semibold">{rotulo}</span>
      <span className="block text-[12px] text-[var(--tinta-sub)]">{ajuda}</span>
      <span className="flex items-baseline gap-1.5 mt-1">
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
          inputMode="decimal"
          placeholder="0,000"
          aria-label={`Peso ${rotulo.toLowerCase()} em kg`}
          className="w-full min-w-0 bg-transparent outline-none text-[30px] font-semibold"
          style={nums}
        />
        <span className="text-[17px] text-[var(--tinta-sub)]">kg</span>
      </span>
    </label>
  );
}
