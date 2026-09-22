"use client";

// SISTEMA premium (2026-09-22): o layout (menu, barra superior, tema) agora vem de
// ShellPremium, compartilhado com a demo. Aqui só fica o que é do app logado:
// rotas sem prefixo e o botão de sair da conta (Supabase).
// Versão anterior com layout próprio: `git show 950f86d:src/components/ficha/AppShell.tsx`.

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ShellPremium } from "./ShellPremium";

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
    <ShellPremium
      nomeRestaurante={nomeRestaurante}
      tituloPagina={tituloPagina}
      acaoRodape={{ rotulo: "Sair da conta", icone: <LogOut size={16} />, onClick: sair }}
    >
      {children}
    </ShellPremium>
  );
}
