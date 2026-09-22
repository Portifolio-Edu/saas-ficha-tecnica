"use client";

import { useRouter } from "next/navigation";
import { ShellBase } from "./ShellBase";

// Modo demo (/preview): roda sem sessão Supabase real, então todo link ganha
// o prefixo /preview e "Sair" volta pro índice do demo em vez de deslogar.
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
    <ShellBase nomeRestaurante={nomeRestaurante} tituloPagina={tituloPagina} prefixo="/preview" onSair={() => router.push("/preview")}>
      {children}
    </ShellBase>
  );
}
