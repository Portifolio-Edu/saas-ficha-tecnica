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

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Lock, Settings, UserRound } from "lucide-react";
import { MenuConta } from "./MenuConta";
import { EVENTO_MARCA_DEMO, marcaDemo } from "@/components/configuracoes/demo";
import { cssDaCor } from "@/lib/empresa/cores";
import { BotaoAgenteIa } from "@/components/ia/BotaoAgenteIa";
import { ShellPremium } from "./ShellPremium";
import { Card } from "./Card";
import { PapelDemoProvider, SeletorPapelDemo, usePapelDemo } from "./PapelDemo";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, podeAcessar, rotaInicial, type Papel } from "@/lib/auth/papeis";

interface Props {
  nomeRestaurante: string;
  tituloPagina: string;
  children: React.ReactNode;
}

export function DemoShell(props: Props) {
  return (
    <PapelDemoProvider>
      <DemoShellComPapel {...props} />
    </PapelDemoProvider>
  );
}

function DemoShellComPapel({ nomeRestaurante, tituloPagina, children }: Props) {
  const router = useRouter();
  const { papel } = usePapelDemo();
  const rota = (usePathname() ?? "").replace(/^\/preview/, "") || "/";
  const liberado = papel !== "cozinha" && podeAcessar(papel, rota);

  // CONFIGURAÇÕES (2026-10-01): logo e cor escolhidos na demo (guardados no
  // navegador), no menu de todas as telas da demo.
  const [marca, setMarca] = useState<{ logoUrl: string | null; corDestaque: string | null }>({ logoUrl: null, corDestaque: null });
  useEffect(() => {
    const ler = () => setMarca(marcaDemo());
    ler();
    window.addEventListener(EVENTO_MARCA_DEMO, ler);
    return () => window.removeEventListener(EVENTO_MARCA_DEMO, ler);
  }, []);
  const css = cssDaCor(marca.corDestaque);

  return (
    <>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <ShellPremium
        prefixoRotas="/preview"
        logoUrl={marca.logoUrl}
        menuConta={
          <MenuConta
            nome={NOME_DEMO[papel]}
            detalhe={`${ROTULO_PAPEL[papel]} · demonstração`}
            itens={[
              { rotulo: "Minha conta", icone: <UserRound size={16} />, href: "/preview/configuracoes?secao=conta" },
              { rotulo: "Configurações", icone: <Settings size={16} />, href: "/preview/configuracoes" },
              { rotulo: "Sair da demonstração", icone: <ArrowLeft size={16} />, onClick: () => router.push("/preview"), separado: true },
            ]}
          />
        }
        papel={papel}
        nomeRestaurante={nomeRestaurante}
        subtituloRestaurante={
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--aviso)" }} />
            Demonstração · {ROTULO_PAPEL[papel]}
          </span>
        }
        tituloPagina={tituloPagina}
        acaoRodape={{ rotulo: "Voltar ao índice da demonstração", icone: <ArrowLeft size={16} />, onClick: () => router.push("/preview") }}
        extrasCabecalho={
          <>
            <SeletorPapelDemo />
            {/* EQUIPE (2026-09-25): o estoquista também usa o agente, na versão do estoque
                (notas, chegadas, perdas). Antes: só dono e gestor. */}
            {papel !== "cozinha" && <BotaoAgenteIa variante="cabecalho" escopo={papel === "estoquista" ? "estoque" : "completo"} />}
          </>
        }
      >
        {liberado ? children : <SemAcesso papel={papel} />}
      </ShellPremium>
    </>
  );
}

// CONFIGURAÇÕES (2026-10-01): quem "está logado" na demo, por papel.
const NOME_DEMO: Record<Papel, string> = { dono: "Giulia Rossi", gestor: "Marco Bianchi", estoquista: "Paulo Lima", cozinha: "Cozinha" };

function SemAcesso({ papel }: { papel: Papel }) {
  const destino = `/preview${rotaInicial(papel)}`;
  return (
    <Card className="p-8 max-w-xl">
      <div className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-3 border" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }}>
        <Lock size={20} className="text-[var(--tinta-sub)]" />
      </div>
      <h2 className="text-[16px] font-semibold text-[var(--tinta)]">
        {papel === "cozinha" ? "A cozinha usa o modo cozinha" : `O ${ROTULO_PAPEL[papel].toLowerCase()} não vê esta tela`}
      </h2>
      <p className="text-[14px] text-[var(--tinta-sub)] mt-1">{DESCRICAO_PAPEL[papel]}</p>
      <p className="text-[13px] text-[var(--tinta-faint)] mt-2">
        No sistema de verdade o bloqueio é no banco de dados: mesmo por fora do app, esse login não consegue ler estes números.
      </p>
      <Link href={destino} className="inline-flex items-center mt-5 min-h-10 px-4 rounded-lg text-[14px] font-medium" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
        {papel === "cozinha" ? "Abrir o modo cozinha" : `Ir para a tela do ${ROTULO_PAPEL[papel].toLowerCase()}`}
      </Link>
    </Card>
  );
}
