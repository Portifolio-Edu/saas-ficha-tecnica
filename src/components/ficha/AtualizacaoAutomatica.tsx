"use client";

// EQUIPE (2026-09-25): o que a cozinha registra no tablet (produção, perda,
// checklist, temperatura, contagem) grava no mesmo banco, mas uma tela do
// gestor já aberta só via o dado novo depois de recarregar. Este componente
// pede ao servidor os dados de novo quando a aba volta a ficar visível e a
// cada `intervaloMs` enquanto está visível. router.refresh() só troca os
// dados vindos do servidor: formulário aberto e texto digitado continuam.
// Usado nas páginas de gestão (Produções, Checklists, Segurança, Estoque,
// Visão geral, Relatórios). Pra desligar, tire <AtualizacaoAutomatica /> da
// página.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AtualizacaoAutomatica({ intervaloMs = 30_000 }: { intervaloMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let ultima = Date.now();
    const atualizar = () => {
      if (document.visibilityState !== "visible") return;
      // Evita duas atualizações seguidas (foco + visibilidade disparam juntos).
      if (Date.now() - ultima < 2_000) return;
      ultima = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(atualizar, intervaloMs);
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, [router, intervaloMs]);
  return null;
}
