"use client";

// SISTEMA premium (2026-09-22): o layout (menu, barra superior, tema) agora vem de
// ShellPremium, compartilhado com o app logado. Aqui só fica o que é da demo:
// prefixo /preview nas rotas, selo "Modo demonstração", botão do agente IA
// (simulado, só existe na demo) e o botão de voltar ao índice da demo.
// Versão anterior com layout próprio: `git show 950f86d:src/components/ficha/DemoShell.tsx`.
// O botão flutuante do agente continua fora (ver docs/POLIMENTO.md, seção 4).
//
// EQUIPE (2026-09-25): "Ver como" (dono/gestor/estoquista/cozinha). O menu
// segue o papel escolhido, e a tela que o papel não abre mostra o motivo em
// vez do conteúdo — a mesma regra do app (src/lib/auth/papeis.ts).
// Versão anterior: `git show c966f91:src/components/ficha/DemoShell.tsx`.
//
// LAYOUT (2026-10-03): o DemoShell agora mora em src/app/preview/layout.tsx e
// não remonta mais a cada troca de seção (antes cada page.tsx desenhava o
// próprio; o QA viu o menu remontar em 270 de 270 navegações). O título vem
// da rota (tituloDaRota) e o índice, o modo cozinha e a consulta do celular
// continuam sem o menu, como já eram. O provider do "Ver como" fica por fora,
// então o papel escolhido não volta pra "dono" entre uma tela e outra.
// O shell em si está em DemoShellComPapel.tsx.
// Versão anterior (shell dentro de cada página): `git show c61f9f4:src/components/ficha/DemoShell.tsx`.

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PapelDemoProvider } from "./PapelDemo";

const SEM_MENU = ["/", "/cozinha", "/consulta"];

// O índice, a cozinha e a consulta não usam o menu: com import dinâmico eles não
// baixam o código do shell (sem isso, +9 a 12 kB de First Load em cada um).
// Continua renderizando no servidor, então o HTML das seções é o mesmo.
const DemoShellComPapel = dynamic(() => import("./DemoShellComPapel").then((m) => m.DemoShellComPapel));

export function DemoShell({ nomeRestaurante, children }: { nomeRestaurante: string; children: React.ReactNode }) {
  const rota = (usePathname() ?? "").replace(/^\/preview/, "") || "/";
  const semMenu = SEM_MENU.some((r) => (r === "/" ? rota === "/" : rota === r || rota.startsWith(`${r}/`)));
  return (
    <PapelDemoProvider>
      {semMenu ? (
        children
      ) : (
        <DemoShellComPapel nomeRestaurante={nomeRestaurante} rota={rota}>
          {children}
        </DemoShellComPapel>
      )}
    </PapelDemoProvider>
  );
}
