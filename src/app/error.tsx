"use client";

// PLANO 9,5 (2026-09-26): tela de erro do sistema. Antes, qualquer erro no
// servidor mostrava a tela branca do Next ("Application error: a server-side
// exception…"). Agora explica em português, oferece tentar de novo e mostra o
// código do erro pra passar ao suporte (o detalhe técnico fica no log do
// servidor; em produção o Next não manda a mensagem pro navegador).

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { acaoRegistrarErroNavegador } from "@/lib/monitoramento/acoes";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // Erro do servidor já foi gravado lá (tem digest); o do navegador vai agora.
    if (!error.digest) void acaoRegistrarErroNavegador({ mensagem: error.message, rota: window.location.pathname }).catch(() => {});
  }, [error]);

  return (
    <main id="conteudo" className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--fundo)", color: "var(--tinta)" }}>
      <div className="w-full max-w-md rounded-xl border p-7" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "color-mix(in srgb, var(--etapa-perda) 14%, transparent)", color: "var(--etapa-perda-texto)" }}>
          <AlertTriangle size={20} />
        </div>
        <h1 className="text-[18px] font-semibold">Algo não saiu como esperado</h1>
        <p className="text-[14px] text-[var(--tinta-sub)] mt-1.5">
          Nada do que você já tinha salvo foi perdido. Tente de novo; se continuar, fale com o suporte e passe o código abaixo.
        </p>
        {error.digest && (
          <p className="text-[12px] text-[var(--tinta-faint)] mt-3 tabular-nums">
            Código: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="flex gap-2 mt-6">
          <button onClick={reset} className="flex-1 min-h-11 px-4 rounded-lg text-[14px] font-semibold inline-flex items-center justify-center gap-2" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <RotateCcw size={15} /> Tentar de novo
          </button>
          <Link href="/login" className="min-h-11 px-4 rounded-lg border text-[14px] font-medium inline-flex items-center" style={{ borderColor: "var(--linha-forte)" }}>
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
