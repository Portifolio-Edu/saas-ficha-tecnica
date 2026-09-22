"use client";

// SISTEMA premium (2026-09-22): o layout (menu, barra superior, tema) agora vem de
// ShellPremium, compartilhado com o app logado. Aqui só fica o que é da demo:
// prefixo /preview nas rotas, selo "Modo demonstração", botão do agente IA
// (simulado, só existe na demo) e o botão de voltar ao índice da demo.
// Versão anterior com layout próprio: `git show 950f86d:src/components/ficha/DemoShell.tsx`.
// O botão flutuante do agente continua fora (ver docs/POLIMENTO.md, seção 4).

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BotaoAgenteIa } from "@/components/ia/BotaoAgenteIa";
import { ShellPremium } from "./ShellPremium";

export function DemoShell({
  nomeRestaurante,
  tituloPagina,
  children,
}: {
  nomeRestaurante: string;
  tituloPagina: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <ShellPremium
      prefixoRotas="/preview"
      nomeRestaurante={nomeRestaurante}
      subtituloRestaurante={
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--aviso)" }} />
          Modo demonstração
        </span>
      }
      tituloPagina={tituloPagina}
      acaoRodape={{ rotulo: "Voltar ao índice da demonstração", icone: <ArrowLeft size={16} />, onClick: () => router.push("/preview") }}
      extrasCabecalho={<BotaoAgenteIa variante="cabecalho" />}
    >
      {children}
    </ShellPremium>
  );
}
