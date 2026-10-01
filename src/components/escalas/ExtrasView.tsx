"use client";

// PERFIL (2026-09-27): banco de extras (base de talentos). Cada extra tem
// setor, cargos que cobre, nível e praças — os mesmos campos do prontuário
// da equipe, pra que o alerta de contingência encontre quem substitui quem
// faltou (src/lib/escalas/extras.ts). WhatsApp só pra quem consentiu: o
// banco guarda a data do consentimento (LGPD) e sem ele só aparece "Ligar".

import { useEffect, useMemo, useState } from "react";
import { Phone, Pencil, Plus, X, ShieldCheck, Trash2 } from "lucide-react";
import { NIVEIS, PRACAS, chaveTag, rotuloNivel, tagsUnicas } from "@/lib/escalas/perfil";
import { formatarTelefone, normalizarTelefone, validarExtra, type Extra, type ExtraInput } from "@/lib/escalas/extras";
import type { PessoaEscala } from "@/lib/escalas/cadastro";
import type { Setor } from "@/lib/escalas/tipos";
import { ListaTags, SeletorTags } from "./Tags";
import { ROTULO_SETOR, diaMes, tint } from "./visual";
import { iniciais } from "./ProntuarioPessoa";
import { Gaveta } from "./Gaveta";

type Resultado = { ok: true } | { ok: false; erro: string };

const SETORES: Setor[] = ["cozinha", "salao", "bar", "outro"];
const campo = "w-full min-h-11 px-3 rounded-lg border bg-[var(--panel)] text-[15px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]";
const estiloCampo = { borderColor: "var(--linha-forte)", color: "var(--tinta)" } as const;

export function ExtrasView({
  extras,
  pessoas,
  aoSalvar,
  aoRemover,
}: {
  extras: Extra[];
  pessoas: PessoaEscala[];
  aoSalvar: (id: string | null, e: ExtraInput) => Promise<Resultado>;
  aoRemover: (id: string) => Promise<Resultado>;
}) {
  const [editando, setEditando] = useState<Extra | "novo" | null>(null);
  const [setor, setSetor] = useState<Setor | "todos">("todos");
  const lista = extras.filter((e) => setor === "todos" || e.setor === setor).sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  return (
    <section aria-label="Banco de extras" className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-[16px] font-semibold">Banco de extras</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-2xl">
            Quando alguém falta, o alerta de contingência mostra os extras daqui que cobrem o setor, o nível e as praças de quem faltou.
          </p>
        </div>
        <button onClick={() => setEditando("novo")} className="min-h-10 px-4 rounded-lg inline-flex items-center gap-2 text-[14px] font-semibold" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          <Plus size={16} /> Adicionar extra
        </button>
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Setor">
          {(["todos", ...SETORES] as const).map((s) => (
            <button key={s} role="radio" aria-checked={setor === s} onClick={() => setSetor(s)} className="min-h-10 px-3 rounded-lg border text-[13px] font-medium" style={setor === s ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
              {s === "todos" ? `Todos (${extras.length})` : `${ROTULO_SETOR[s]} (${extras.filter((e) => e.setor === s).length})`}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-[14px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-10 text-center" style={{ borderColor: "var(--linha-forte)" }}>
          {extras.length === 0 ? "Nenhum extra cadastrado. Adicione quem você costuma chamar quando falta alguém." : "Nenhum extra nesse setor."}
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lista.map((e) => (
            <li key={e.id} className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--linha)", background: "var(--panel)", opacity: e.ativo ? 1 : 0.6 }}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0" style={{ background: tint("var(--etapa-producao)", 14), color: "var(--etapa-producao-texto)" }} aria-hidden>
                  {iniciais(e.nome)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate">{e.nome}{!e.ativo && <span className="ml-2 text-[12px] font-medium text-[var(--tinta-faint)]">inativo</span>}</div>
                  <div className="text-[13px] text-[var(--tinta-sub)] truncate">{ROTULO_SETOR[e.setor]} · {e.cargos.join(", ")}</div>
                </div>
                {e.nivel && (
                  <span className="text-[12px] font-semibold px-2 py-1 rounded-md shrink-0" style={{ background: tint("var(--etapa-estoque)", 16), color: "var(--etapa-estoque-texto)" }}>
                    {rotuloNivel(e.nivel)}
                  </span>
                )}
              </div>
              <ListaTags tags={e.pracas} tom="praca" max={5} vazio="Sem praças informadas" />
              <div className="mt-auto pt-3 border-t flex items-center gap-2 text-[12px]" style={{ borderColor: "var(--linha)" }}>
                {e.aceitaWhatsapp ? (
                  <span className="inline-flex items-center gap-1.5" style={{ color: "var(--etapa-produzido-texto)" }}>
                    <ShieldCheck size={14} /> WhatsApp autorizado{e.consentimentoEm ? ` em ${diaMes(e.consentimentoEm.slice(0, 10))}` : ""}
                  </span>
                ) : (
                  <span className="text-[var(--tinta-faint)]">Sem autorização pra WhatsApp: só ligação</span>
                )}
              </div>
              <div className="flex gap-2">
                <a href={`tel:+${normalizarTelefone(e.telefone)}`} className="flex-1 min-h-10 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center justify-center gap-2 tabular-nums" style={{ borderColor: "var(--linha-forte)" }}>
                  <Phone size={14} /> {formatarTelefone(e.telefone)}
                </a>
                <button onClick={() => setEditando(e)} aria-label={`Editar ${e.nome}`} className="min-h-10 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-2" style={{ borderColor: "var(--linha-forte)" }}>
                  <Pencil size={14} /> Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <FormExtra
          extra={editando === "novo" ? null : editando}
          pessoas={pessoas}
          aoSalvar={aoSalvar}
          aoRemover={aoRemover}
          aoFechar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

function FormExtra({
  extra,
  pessoas,
  aoSalvar,
  aoRemover,
  aoFechar,
}: {
  extra: Extra | null;
  pessoas: PessoaEscala[];
  aoSalvar: (id: string | null, e: ExtraInput) => Promise<Resultado>;
  aoRemover: (id: string) => Promise<Resultado>;
  aoFechar: () => void;
}) {
  const [e, setE] = useState<ExtraInput>(() => ({
    nome: extra?.nome ?? "",
    telefone: extra ? formatarTelefone(extra.telefone) : "",
    setor: extra?.setor ?? "cozinha",
    cargos: extra?.cargos ?? [],
    nivel: extra?.nivel ?? null,
    pracas: extra?.pracas ?? [],
    aceitaWhatsapp: extra?.aceitaWhatsapp ?? false,
    ativo: extra?.ativo ?? true,
    nota: extra?.nota ?? null,
  }));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const atualizar = (parcial: Partial<ExtraInput>) => {
    setErro(null);
    setE((a) => ({ ...a, ...parcial }));
  };
  useEffect(() => {
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  // Cargos sugeridos: os que a equipe usa naquele setor.
  const cargos = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pessoas) if (p.setor === e.setor && p.cargo && !m.has(chaveTag(p.cargo))) m.set(chaveTag(p.cargo), p.cargo);
    return [...m.values()].sort((a, b) => a.localeCompare(b));
  }, [pessoas, e.setor]);

  const salvar = async () => {
    const entrada = { ...e, cargos: tagsUnicas(e.cargos), pracas: tagsUnicas(e.pracas) };
    const problema = validarExtra(entrada);
    if (problema) return setErro(problema);
    setSalvando(true);
    const r = await aoSalvar(extra?.id ?? null, entrada);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    aoFechar();
  };
  const remover = async () => {
    if (!extra || !window.confirm(`Tirar ${extra.nome} do banco de extras? Se só quiser pausar, desmarque "Disponível".`)) return;
    const r = await aoRemover(extra.id);
    if (!r.ok) return setErro(r.erro);
    aoFechar();
  };

  return (
    <Gaveta rotulo={extra ? `Extra: ${extra.nome}` : "Novo extra"} largura={560} aoFechar={aoFechar}>
      <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        <h2 className="text-[17px] font-semibold flex-1">{extra ? extra.nome : "Novo extra"}</h2>
        <button onClick={aoFechar} aria-label="Fechar" className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:bg-[var(--panel-hover)]">
          <X size={20} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-5 flex-1">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[13px] font-medium mb-1.5">Nome</span>
            <input value={e.nome} onChange={(ev) => atualizar({ nome: ev.target.value })} className={campo} style={estiloCampo} autoFocus={!extra} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-medium mb-1.5">Telefone com DDD</span>
            <input value={e.telefone} onChange={(ev) => atualizar({ telefone: ev.target.value })} inputMode="tel" placeholder="(11) 98765-4321" className={`${campo} tabular-nums`} style={estiloCampo} />
          </label>
        </div>

        <div>
          <span className="block text-[13px] font-medium mb-1.5">Setor</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Setor do extra">
            {SETORES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={e.setor === s} onClick={() => atualizar({ setor: s })} className="min-h-11 px-2 rounded-lg border text-[14px] font-medium" style={e.setor === s ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                {ROTULO_SETOR[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-medium mb-1.5">Cargos que cobre</span>
          <SeletorTags rotulo="Cargos que cobre" tom="neutro" sugestoes={cargos} valor={e.cargos} onChange={(v) => atualizar({ cargos: v })} placeholder="Ex.: Cozinheiro" />
        </div>

        <div>
          <span className="block text-[13px] font-medium mb-1.5">Nível</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" role="radiogroup" aria-label="Nível do extra">
            {[{ id: null, rotulo: "Não sei" }, ...NIVEIS].map((n) => (
              <button key={n.id ?? "nenhum"} type="button" role="radio" aria-checked={e.nivel === n.id} onClick={() => atualizar({ nivel: n.id })} className="min-h-10 px-2 rounded-lg border text-[13px] font-medium" style={e.nivel === n.id ? { background: tint("var(--etapa-estoque)", 14), borderColor: "var(--etapa-estoque)", color: "var(--etapa-estoque-texto)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                {n.rotulo}
              </button>
            ))}
          </div>
          {!e.nivel && <p className="text-[12px] text-[var(--tinta-faint)] mt-1.5">Sem nível, o extra só aparece pra vagas de quem também está sem nível.</p>}
        </div>

        <div>
          <span className="block text-[13px] font-medium mb-1.5">Praças que domina</span>
          <SeletorTags rotulo="Praças do extra" tom="praca" sugestoes={PRACAS[e.setor]} valor={e.pracas} onChange={(v) => atualizar({ pracas: v })} placeholder="Outra praça…" />
        </div>

        <label className="flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer" style={{ borderColor: e.aceitaWhatsapp ? "var(--etapa-produzido)" : "var(--linha-forte)", background: e.aceitaWhatsapp ? tint("var(--etapa-produzido)", 7) : undefined }}>
          <input type="checkbox" checked={e.aceitaWhatsapp} onChange={(ev) => atualizar({ aceitaWhatsapp: ev.target.checked })} className="w-4 h-4 mt-0.5" />
          <span>
            <span className="block text-[14px] font-medium">A pessoa autorizou receber convites de trabalho pelo WhatsApp</span>
            <span className="block text-[12px] text-[var(--tinta-sub)] mt-0.5">A data da autorização fica registrada (LGPD). Sem ela, o sistema só oferece ligar.</span>
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={e.ativo} onChange={(ev) => atualizar({ ativo: ev.target.checked })} className="w-4 h-4" />
          <span className="text-[14px]">Disponível pra chamar</span>
        </label>

        <label className="block">
          <span className="block text-[13px] font-medium mb-1.5">Observação</span>
          <textarea value={e.nota ?? ""} onChange={(ev) => atualizar({ nota: ev.target.value || null })} rows={2} maxLength={500} placeholder="Ex.: só pode à noite; mora perto" className={`${campo} py-2.5`} style={estiloCampo} />
        </label>
      </div>

      <footer className="sticky bottom-0 px-5 py-4 border-t space-y-3" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        {erro && (
          <p role="alert" className="text-[14px] rounded-lg px-3 py-2" style={{ background: tint("var(--etapa-perda)", 10), color: "var(--etapa-perda-texto)" }}>
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          {extra && (
            <button onClick={remover} aria-label="Tirar do banco" className="min-h-11 w-11 rounded-lg border flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--etapa-perda-texto)]" style={{ borderColor: "var(--linha-forte)" }}>
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={aoFechar} className="min-h-11 px-4 rounded-lg border text-[14px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className="flex-1 min-h-11 px-4 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            {salvando ? "Salvando..." : extra ? "Salvar extra" : "Adicionar extra"}
          </button>
        </div>
      </footer>
    </Gaveta>
  );
}

