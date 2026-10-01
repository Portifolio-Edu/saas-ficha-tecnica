"use client";

// PLANO 9,5, etapa 3 (2026-09-26): erro no próprio layout raiz (a tela de erro
// normal depende dele). Sem os estilos do sistema: só o essencial, legível.
import { useEffect } from "react";
import { acaoRegistrarErroNavegador } from "@/lib/monitoramento/acoes";

export default function ErroGeral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!error.digest) void acaoRegistrarErroNavegador({ mensagem: error.message, rota: window.location.pathname }).catch(() => {});
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F6F6F7", color: "#16171A" }}>
        <main id="conteudo" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Algo não saiu como esperado</h1>
            <p style={{ fontSize: 14, color: "#4A4D55", margin: 0 }}>
              Nada do que você já tinha salvo foi perdido. Tente de novo; se continuar, fale com o suporte
              {error.digest ? ` e passe o código ${error.digest}` : ""}.
            </p>
            <button onClick={reset} style={{ marginTop: 20, minHeight: 44, padding: "0 16px", borderRadius: 8, border: 0, background: "#16171A", color: "#fff", fontSize: 14, fontWeight: 600 }}>
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
