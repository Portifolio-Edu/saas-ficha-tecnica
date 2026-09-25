"use client";

// EQUIPE (2026-09-25): modo cozinha na demo, com ações simuladas (nada é
// gravado). Mesmos componentes do aparelho pareado de verdade.

import Link from "next/link";
import { CozinhaApp, type AcoesCozinha } from "@/components/cozinha/CozinhaApp";
import type { ComponentProps } from "react";

const ok = async () => {
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true as const };
};

const acoesDemo: AcoesCozinha = {
  marcarItem: ok,
  desmarcarItem: ok,
  registrarTemperatura: ok,
  registrarProducao: ok,
  atualizarProducao: ok,
  enviarContagem: ok,
};

export function CozinhaDemo(props: Omit<ComponentProps<typeof CozinhaApp>, "acoes" | "rodape">) {
  return (
    <CozinhaApp
      {...props}
      acoes={acoesDemo}
      rodape={
        <>
          Demonstração: nada é salvo. No restaurante, este é o tablet da cozinha, conectado sem senha.{" "}
          <Link href="/preview/equipe" className="underline underline-offset-2">Ver a tela Equipe</Link>
        </>
      }
    />
  );
}
