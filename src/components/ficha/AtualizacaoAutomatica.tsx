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

// DESEMPENHO (2026-10-02): a atualização redesenha a tela; se cair junto com
// um toque, o toque espera (a barra da Vercel mostrou 450 ms no modo cozinha
// logo depois de voltar pra janela). Agora ela espera a pessoa ficar parada
// (PARADO_MS sem toque, tecla ou rolagem), inclusive ao voltar pra aba.
// Antes: router.refresh() na hora do foco e a cada intervalo, mesmo tocando.
const PARADO_MS = 2_000;

export function AtualizacaoAutomatica({ intervaloMs = 30_000 }: { intervaloMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let ultima = Date.now();
    let ultimoToque = 0;
    let adiada = 0;
    const marcar = () => (ultimoToque = Date.now());
    const atualizar = () => {
      if (document.visibilityState !== "visible") return;
      // Evita duas atualizações seguidas (foco + visibilidade disparam juntos).
      if (Date.now() - ultima < 2_000) return;
      const falta = PARADO_MS - (Date.now() - ultimoToque);
      if (falta > 0) {
        window.clearTimeout(adiada);
        adiada = window.setTimeout(atualizar, falta + 50);
        return;
      }
      ultima = Date.now();
      router.refresh();
    };
    // Voltou pra aba/janela: atualiza quando a pessoa parar (o primeiro toque
    // depois de voltar não fica preso na atualização).
    const voltou = () => {
      marcar();
      atualizar();
    };
    const opcoes = { capture: true, passive: true } as const;
    for (const t of ["pointerdown", "keydown", "wheel", "touchstart"] as const) window.addEventListener(t, marcar, opcoes);
    const timer = window.setInterval(atualizar, intervaloMs);
    document.addEventListener("visibilitychange", voltou);
    window.addEventListener("focus", voltou);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(adiada);
      document.removeEventListener("visibilitychange", voltou);
      window.removeEventListener("focus", voltou);
      for (const t of ["pointerdown", "keydown", "wheel", "touchstart"] as const) window.removeEventListener(t, marcar, opcoes);
    };
  }, [router, intervaloMs]);
  return null;
}
