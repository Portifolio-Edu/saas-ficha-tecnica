"use client";

// AGENTE IA (2026-09-26): botão do agente de verdade no cabeçalho do sistema
// (dono, gestor e estoquista). A janela só baixa quando abre pela 1ª vez.
import { useState } from "react";
import dynamic from "next/dynamic";
import { Bot } from "lucide-react";

const AgenteChat = dynamic(() => import("./AgenteChat").then((m) => m.AgenteChat), { ssr: false });

export function BotaoAgente({ nomeRestaurante }: { nomeRestaurante: string }) {
  const [aberto, setAberto] = useState(false);
  const [jaAbriu, setJaAbriu] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          setJaAbriu(true);
          setAberto(true);
        }}
        aria-label="Agente IA"
        className="flex items-center gap-2 px-3 min-h-10 rounded-lg border text-[13px] font-medium hover:bg-[var(--panel-hover)]"
        style={{ background: "var(--panel)", borderColor: "var(--linha)", color: "var(--tinta)" }}
      >
        <Bot size={16} style={{ color: "var(--marca)" }} aria-hidden />
        <span className="hidden sm:inline">Agente IA</span>
      </button>
      {jaAbriu && <AgenteChat aberto={aberto} onFechar={() => setAberto(false)} nomeRestaurante={nomeRestaurante} />}
    </>
  );
}
