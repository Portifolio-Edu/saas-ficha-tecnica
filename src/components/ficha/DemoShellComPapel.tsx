"use client";

// LAYOUT (2026-10-03): o shell da demo com o papel do "Ver como". Saiu de
// DemoShell.tsx pra entrar por import dinâmico: só as seções com menu baixam
// este código (o índice, a cozinha e a consulta não usam).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { BotaoAgenteIa } from "@/components/ia/BotaoAgenteIa";
import { ShellPremium, tituloDaRota } from "./ShellPremium";
import { Card } from "./Card";
import { SeletorPapelDemo, usePapelDemo } from "./PapelDemo";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, podeAcessar, rotaInicial, type Papel } from "@/lib/auth/papeis";

export function DemoShellComPapel({ nomeRestaurante, rota, children }: { nomeRestaurante: string; rota: string; children: React.ReactNode }) {
  const router = useRouter();
  const { papel, pronto } = usePapelDemo();
  const liberado = papel !== "cozinha" && podeAcessar(papel, rota);

  return (
    <ShellPremium
      prefixoRotas="/preview"
      papel={papel}
      nomeRestaurante={nomeRestaurante}
      subtituloRestaurante={
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--aviso)" }} />
          {/* O papel só aparece depois de ler o localStorage (ver PapelDemo.tsx). A
              frase fica num span só: solto, o papel virava outro item do flex e
              ganhava o gap (6px a mais antes de "Dono"). */}
          <span>
            Demonstração · <span className={pronto ? undefined : "invisible"}>{ROTULO_PAPEL[papel]}</span>
          </span>
        </span>
      }
      tituloPagina={tituloDaRota(rota) ?? ""}
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
  );
}

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
