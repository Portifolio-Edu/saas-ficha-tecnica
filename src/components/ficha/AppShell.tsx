"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShellBase } from "./ShellBase";

export function AppShell({
  nomeRestaurante,
  tituloPagina,
  children,
}: {
  nomeRestaurante: string;
  tituloPagina: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const sair = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <ShellBase nomeRestaurante={nomeRestaurante} tituloPagina={tituloPagina} prefixo="" onSair={sair}>
      {children}
    </ShellBase>
  );
}
