"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Bot, Sparkles, Mic, Camera } from "lucide-react";

// PLANO 9,5 (2026-09-28): o modal do agente (~40 KB) só baixa quando alguém
// abre o agente pela primeira vez; antes vinha junto com toda página.
const AgenteIaModal = dynamic(() => import("./AgenteIaModal").then((m) => m.AgenteIaModal), { ssr: false });

export function BotaoAgenteIa({
  variante = "flutuante",
  className = "",
  escopo = "completo",
}: {
  variante?: "flutuante" | "cabecalho" | "inline";
  className?: string;
  /** EQUIPE (2026-09-25): "estoque" pro estoquista (ver AgenteIaModal). O
   * `key={escopo}` recria a conversa quando o papel muda (a mensagem de
   * boas-vindas depende do escopo). */
  escopo?: "completo" | "estoque";
}) {
  const [aberto, setAberto] = useState(false);
  const [jaAbriu, setJaAbriu] = useState(false);
  const abrir = () => {
    setJaAbriu(true);
    setAberto(true);
  };
  const [focoId, setFocoId] = useState<string | null>(null);
  const [focoNome, setFocoNome] = useState<string | null>(null);

  // Escutar eventos customizados de qualquer parte do app para abrir o agente com foco específico
  useEffect(() => {
    const escutarAbertura = (e: Event) => {
      const detail = (e as CustomEvent<{ insumoId?: string; insumoNome?: string }>).detail || {};
      setFocoId(detail.insumoId || null);
      setFocoNome(detail.insumoNome || null);
      abrir();
    };

    window.addEventListener("abrir-agente-ia", escutarAbertura);
    return () => window.removeEventListener("abrir-agente-ia", escutarAbertura);
  }, []);

  const fechar = () => {
    setAberto(false);
    setFocoId(null);
    setFocoNome(null);
  };

  if (variante === "cabecalho") {
    return (
      <>
        <button
          onClick={() => abrir()}
          // SISTEMA premium: botão neutro da barra (borda 1px, 40px), no mesmo idioma do
          // botão de tema. Antes: pílula com degradê azul-violeta e ponto verde pulsando
          // (que sugeria "online" num agente que é só demonstração).
          className={`flex items-center gap-2 px-3 min-h-10 rounded-lg border text-[13px] font-medium transition-colors hover:bg-[var(--panel-hover)] ${className}`}
          style={{ background: "var(--panel)", borderColor: "var(--linha)", color: "var(--tinta)" }}
          title="Demonstração do agente de IA (imagens, áudios e WhatsApp)"
        >
          <Bot size={16} style={{ color: "var(--marca)" }} />
          <span className="hidden sm:inline">Agente IA</span>
          <span className="text-[11px] font-medium px-1.5 py-px rounded border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
            demo
          </span>
        </button>

        {jaAbriu && <AgenteIaModal
          key={escopo}
          escopo={escopo}
          aberto={aberto}
          onFechar={fechar}
          insumoFocoId={focoId}
          insumoFocoNome={focoNome}
        />}
      </>
    );
  }

  if (variante === "inline") {
    return (
      <>
        <button
          onClick={() => abrir()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-extrabold transition-all ${className}`}
          style={{
            background: "rgba(124, 58, 237, 0.1)",
            borderColor: "rgba(124, 58, 237, 0.3)",
            color: "#7C3AED",
          }}
        >
          <Sparkles size={13} />
          <span>Preencher com IA</span>
        </button>

        {jaAbriu && <AgenteIaModal
          key={escopo}
          escopo={escopo}
          aberto={aberto}
          onFechar={fechar}
          insumoFocoId={focoId}
          insumoFocoNome={focoNome}
        />}
      </>
    );
  }

  // Só montado no DemoShell: o agente é simulado e ainda não existe em produção.
  // Variante flutuante padrão (fixo no canto inferior direito)
  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 font-sans select-none">
        <button
          onClick={() => abrir()}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full text-white shadow-xl transition-all hover:scale-105 active:scale-95 border border-white/20"
          style={{
            background: "linear-gradient(135deg, #1E40AF 0%, #6D28D9 50%, #059669 100%)",
            boxShadow: "0 10px 25px -5px rgba(109, 40, 217, 0.5)",
          }}
        >
          <div className="relative flex items-center justify-center">
            <Bot size={20} strokeWidth={2.4} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-purple-900 animate-ping" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-black tracking-tight leading-none">
                Agente IA Cozinha
              </span>
              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-white/15 text-white border border-white/30">
                Demo
              </span>
            </div>
            <span className="text-[10px] text-white/80 font-medium leading-none mt-0.5 flex items-center gap-1">
              <Camera size={10} /> Imagens · <Mic size={10} /> Áudios · WhatsApp
            </span>
          </div>
        </button>
      </div>

      {jaAbriu && <AgenteIaModal
        key={escopo}
        escopo={escopo}
        aberto={aberto}
        onFechar={fechar}
        insumoFocoId={focoId}
        insumoFocoNome={focoNome}
      />}
    </>
  );
}

/** Helper global para abrir o agente de qualquer lugar do código */
export function abrirAgenteIaComFoco(insumoId?: string, insumoNome?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("abrir-agente-ia", {
        detail: { insumoId, insumoNome },
      })
    );
  }
}
