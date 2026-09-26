"use client";

// AGENTE IA (2026-09-26): o agente de verdade no sistema (a demo continua em
// AgenteIaModal, só na /preview). Conversa com o agente do n8n pela rota
// /api/agente/mensagem: texto, foto (nota, rótulo), áudio gravado aqui, PDF e
// XML de NF-e. O que o agente quer gravar aparece como proposta com
// Confirmar/Cancelar — nada é gravado sem a pessoa confirmar.
// Aba WhatsApp: a pessoa liga o próprio número ao agente (código ATIVAR).
// Abre direto no <body> (portal) — o cabeçalho tem desfoque, ver POLIMENTO §31.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, Check, FileText, Loader2, Mic, MessageCircle, Paperclip, Send, Square, X } from "lucide-react";
import { acaoDesvincularWhatsapp, acaoEstadoWhatsapp, acaoVincularWhatsapp, type EstadoWhatsapp } from "@/lib/agente/acoesWhatsapp";
import { formatarTelefone } from "@/lib/telefone";

interface Mensagem {
  id: number;
  de: "pessoa" | "agente" | "erro";
  texto: string;
  anexos?: string[];
}

interface Proposta {
  id: string;
  resumo: string;
}

const ACEITOS = "image/*,audio/*,application/pdf,.pdf,.xml,text/xml,application/xml";

/** **negrito** e quebras de linha, sem HTML do agente. */
function TextoAgente({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("\n").map((linha, i) => (
        <span key={i} className="block min-h-[1em]">
          {linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) => (parte.startsWith("**") && parte.endsWith("**") ? <strong key={j}>{parte.slice(2, -2)}</strong> : parte))}
        </span>
      ))}
    </>
  );
}

export function AgenteChat({ aberto, onFechar, nomeRestaurante }: { aberto: boolean; onFechar: () => void; nomeRestaurante: string }) {
  const [aba, setAba] = useState<"conversa" | "whatsapp">("conversa");
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { id: 0, de: "agente", texto: `Oi! Sou o agente do ${nomeRestaurante}. Mande uma foto da nota fiscal, o XML da NF-e, a foto do rótulo de um insumo ou um áudio — ou pergunte do estoque, das fichas e da produção.\n\nAntes de gravar qualquer coisa eu mostro o que vou fazer e espero você confirmar.` },
  ]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [decidindo, setDecidindo] = useState<string | null>(null);
  const [gravando, setGravando] = useState<{ inicio: number } | null>(null);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const fim = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const seq = useRef(1);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);

  useEffect(() => fim.current?.scrollIntoView({ block: "end" }), [mensagens, propostas, enviando]);

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - gravando.inicio) / 1000)), 500);
    return () => clearInterval(t);
  }, [gravando]);

  const adicionar = (m: Omit<Mensagem, "id">) => setMensagens((atual) => [...atual, { ...m, id: seq.current++ }]);

  const enviar = async (arquivosExtra: File[] = []) => {
    const lista = [...arquivos, ...arquivosExtra];
    const t = texto.trim();
    if ((!t && lista.length === 0) || enviando) return;
    adicionar({ de: "pessoa", texto: t, anexos: lista.map((f) => f.name) });
    setTexto("");
    setArquivos([]);
    setEnviando(true);
    try {
      const form = new FormData();
      form.set("texto", t);
      for (const f of lista) form.append("arquivos", f);
      const r = await fetch("/api/agente/mensagem", { method: "POST", body: form });
      const corpo = (await r.json().catch(() => ({}))) as { resposta?: string; propostas?: Proposta[]; erro?: string };
      if (!r.ok || !corpo.resposta) throw new Error(corpo.erro ?? "O agente não respondeu agora.");
      adicionar({ de: "agente", texto: corpo.resposta });
      setPropostas(corpo.propostas ?? []);
    } catch (e) {
      adicionar({ de: "erro", texto: e instanceof Error ? e.message : "Erro desconhecido." });
    } finally {
      setEnviando(false);
    }
  };

  const decidir = async (p: Proposta, acao: "confirmar" | "cancelar") => {
    setDecidindo(p.id);
    try {
      const r = await fetch(`/api/agente/propostas/${p.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao }) });
      const corpo = (await r.json().catch(() => ({}))) as { resultado?: string; erro?: string };
      if (!r.ok) throw new Error(corpo.erro ?? "Não deu certo.");
      adicionar({ de: "agente", texto: `${acao === "confirmar" ? "✅" : "↩️"} ${corpo.resultado}` });
      setPropostas((atual) => atual.filter((x) => x.id !== p.id));
    } catch (e) {
      adicionar({ de: "erro", texto: e instanceof Error ? e.message : "Erro desconhecido." });
    } finally {
      setDecidindo(null);
    }
  };

  const gravar = async () => {
    if (gravando) {
      gravador.current?.stop();
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(fluxo);
      partes.current = [];
      rec.ondataavailable = (e) => e.data.size && partes.current.push(e.data);
      rec.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());
        setGravando(null);
        setSegundos(0);
        const tipo = rec.mimeType || "audio/webm";
        const audio = new File(partes.current, `audio-${Date.now()}.${tipo.includes("ogg") ? "ogg" : tipo.includes("mp4") ? "m4a" : "webm"}`, { type: tipo.split(";")[0] });
        void enviar([audio]);
      };
      gravador.current = rec;
      rec.start();
      setGravando({ inicio: Date.now() });
    } catch {
      adicionar({ de: "erro", texto: "Não consegui usar o microfone. Libere o acesso no navegador." });
    }
  };

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agente IA"
        className="w-full max-w-2xl h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2rem)] max-h-[760px] rounded-2xl flex flex-col overflow-hidden border"
        style={{ background: "var(--panel)", borderColor: "var(--linha-forte)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center gap-x-3 gap-y-2.5" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
              <Bot size={21} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[var(--tinta)] leading-tight">Agente IA</h2>
              <p className="text-[12px] text-[var(--tinta-sub)] truncate">{nomeRestaurante} · foto, áudio, PDF e XML</p>
            </div>
          </div>
          <div role="tablist" aria-label="Agente" className="order-3 w-full sm:order-none sm:w-auto flex p-0.5 rounded-lg border text-[13px] font-medium" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
            {(
              [
                ["conversa", "Conversa"],
                ["whatsapp", "WhatsApp"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className="flex-1 sm:flex-none min-h-10 sm:min-h-8 px-3 rounded-md"
                style={aba === id ? { background: "var(--tinta)", color: "var(--panel)" } : { color: "var(--tinta-sub)" }}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="order-2 sm:order-none shrink-0 w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]">
            <X size={18} />
          </button>
        </div>

        {aba === "whatsapp" ? (
          <AbaWhatsapp />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3" aria-live="polite">
              {mensagens.map((m) => (
                <div key={m.id} className={`flex ${m.de === "pessoa" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed"
                    style={
                      m.de === "pessoa"
                        ? { background: "var(--tinta)", color: "var(--panel)" }
                        : m.de === "erro"
                          ? { background: "var(--danger-soft)", color: "var(--danger)" }
                          : { background: "var(--panel-elevated)", color: "var(--tinta)", border: "1px solid var(--linha)" }
                    }
                  >
                    {m.texto && <TextoAgente texto={m.texto} />}
                    {m.anexos && m.anexos.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.anexos.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 text-[12px] opacity-80">
                            <FileText size={12} aria-hidden /> {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {propostas.map((p) => (
                <section key={p.id} aria-label="Proposta esperando confirmação" className="rounded-xl border p-3.5" style={{ borderColor: "color-mix(in srgb, var(--aviso) 45%, var(--linha))", background: "color-mix(in srgb, var(--aviso) 7%, var(--panel))" }}>
                  <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--aviso)" }}>Esperando você confirmar</div>
                  <p className="text-[14px] text-[var(--tinta)] mt-1">{p.resumo}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => decidir(p, "confirmar")} disabled={decidindo !== null} className="min-h-10 px-3.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                      <Check size={15} /> {decidindo === p.id ? "Gravando…" : "Confirmar"}
                    </button>
                    <button onClick={() => decidir(p, "cancelar")} disabled={decidindo !== null} className="min-h-10 px-3.5 rounded-lg border text-[13px] font-medium disabled:opacity-60" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
                      Cancelar
                    </button>
                  </div>
                </section>
              ))}

              {enviando && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3.5 py-2.5 text-[14px] inline-flex items-center gap-2" style={{ background: "var(--panel-elevated)", color: "var(--tinta-sub)", border: "1px solid var(--linha)" }}>
                    <Loader2 size={15} className="animate-spin" aria-hidden /> O agente está vendo…
                  </div>
                </div>
              )}
              <div ref={fim} />
            </div>

            <div className="border-t px-3 sm:px-4 py-3" style={{ borderColor: "var(--linha)" }}>
              {arquivos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {arquivos.map((f, i) => (
                    <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 text-[12.5px] pl-2.5 pr-1 min-h-8 rounded-full border" style={{ borderColor: "var(--linha-forte)" }}>
                      {f.name.length > 28 ? `${f.name.slice(0, 25)}…` : f.name}
                      <button onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))} aria-label={`Tirar ${f.name}`} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--panel-hover)]">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={entrada}
                  type="file"
                  accept={ACEITOS}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const novos = Array.from(e.target.files ?? []);
                    setArquivos((a) => [...a, ...novos].slice(0, 3));
                    e.target.value = "";
                  }}
                />
                <button onClick={() => entrada.current?.click()} aria-label="Anexar foto, áudio, PDF ou XML" disabled={enviando} className="shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)] disabled:opacity-60" style={{ borderColor: "var(--linha)" }}>
                  <Paperclip size={18} />
                </button>
                <button
                  onClick={gravar}
                  aria-label={gravando ? "Parar e enviar o áudio" : "Gravar áudio"}
                  disabled={enviando && !gravando}
                  className="shrink-0 h-11 min-w-11 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[13px] font-medium disabled:opacity-60"
                  style={gravando ? { background: "var(--sinal)", color: "#fff", borderColor: "var(--sinal)" } : { borderColor: "var(--linha)", color: "var(--tinta-sub)" }}
                >
                  {gravando ? <Square size={15} /> : <Mic size={18} />}
                  {gravando && `0:${String(segundos).padStart(2, "0")}`}
                </button>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void enviar();
                    }
                  }}
                  rows={1}
                  aria-label="Mensagem para o agente"
                  placeholder="Pergunte ou peça algo…"
                  className="flex-1 min-w-0 resize-none max-h-32 rounded-xl border px-3.5 py-2.5 text-[14px] bg-[var(--panel)] text-[var(--tinta)] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]"
                  style={{ borderColor: "var(--linha-forte)" }}
                />
                <button onClick={() => void enviar()} disabled={enviando || (!texto.trim() && !arquivos.length)} aria-label="Enviar" className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-40" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                  <Send size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function AbaWhatsapp() {
  const [estado, setEstado] = useState<EstadoWhatsapp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState<{ codigo: string; numeroAgente: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    const r = await acaoEstadoWhatsapp();
    if (r.ok) {
      setEstado(r.dados);
      if (r.dados.telefone) setTelefone(formatarTelefone(r.dados.telefone));
    } else setErro(r.erro);
  };
  useEffect(() => {
    void carregar();
  }, []);

  const gerar = async () => {
    setOcupado(true);
    setErro(null);
    const r = await acaoVincularWhatsapp(telefone);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setCodigo({ codigo: r.dados.codigo, numeroAgente: r.dados.numeroAgente });
    setEstado((e) => (e ? { ...e, telefone: r.dados.telefone, verificado: false } : e));
  };

  const desvincular = async () => {
    if (!window.confirm("Desligar o seu WhatsApp do agente?")) return;
    const r = await acaoDesvincularWhatsapp();
    if (!r.ok) return setErro(r.erro);
    setCodigo(null);
    setEstado((e) => (e ? { ...e, telefone: null, verificado: false } : e));
    setTelefone("");
  };

  const numeroAgente = codigo?.numeroAgente || estado?.numeroAgente || "";
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
      <div className="flex items-start gap-3">
        <MessageCircle size={20} className="shrink-0 mt-0.5 text-[var(--tinta-faint)]" aria-hidden />
        <p className="text-[14px] text-[var(--tinta-sub)]">
          Fale com o agente pelo seu WhatsApp: mande foto da nota, áudio ou pergunte do estoque. Ele só responde pra números ativados e só enxerga o que você enxerga no sistema.
        </p>
      </div>

      {estado?.verificado && estado.telefone ? (
        <div className="rounded-xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--sucesso) 40%, var(--linha))" }}>
          <div className="text-[14px] font-semibold text-[var(--tinta)]">Ativado: {formatarTelefone(estado.telefone)}</div>
          {numeroAgente && <p className="text-[13px] text-[var(--tinta-sub)] mt-1">Número do agente: {formatarTelefone(numeroAgente)}</p>}
          <button onClick={desvincular} className="mt-3 min-h-10 px-3 rounded-lg border text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)", color: "var(--danger)" }}>
            Desligar meu WhatsApp
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[12.5px] font-medium text-[var(--tinta-sub)] mb-1.5">Seu WhatsApp</span>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="(11) 98765-4321" className="w-full min-h-11 px-3 rounded-lg border bg-[var(--panel)] text-[var(--tinta)] text-[15px] outline-none" style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          <button onClick={gerar} disabled={ocupado} className="min-h-11 px-4 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            {ocupado ? "Gerando…" : "Gerar código de ativação"}
          </button>
          {codigo && (
            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
              <p className="text-[14px] text-[var(--tinta)]">
                Do seu WhatsApp, mande esta mensagem {numeroAgente ? <>pro número <b>{formatarTelefone(numeroAgente)}</b></> : "pro número do agente"}:
              </p>
              <p className="text-[22px] font-semibold tracking-widest text-[var(--tinta)] tabular-nums">ATIVAR {codigo.codigo}</p>
              <p className="text-[12.5px] text-[var(--tinta-sub)]">Vale 15 minutos. Depois de ativar, feche e abra esta aba pra ver.</p>
              {numeroAgente && (
                <a href={`https://wa.me/${numeroAgente}?text=${encodeURIComponent(`ATIVAR ${codigo.codigo}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
                  <MessageCircle size={15} /> Abrir no WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {erro && <p role="alert" className="text-[13px] rounded-lg px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{erro}</p>}
    </div>
  );
}
