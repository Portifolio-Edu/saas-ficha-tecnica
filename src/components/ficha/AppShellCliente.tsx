"use client";

// SISTEMA premium (2026-09-22): o layout (menu, barra superior, tema) agora vem de
// ShellPremium, compartilhado com a demo. Aqui só fica o que é do app logado:
// rotas sem prefixo e o botão de sair da conta (Supabase).
// Versão anterior com layout próprio: `git show 950f86d:src/components/ficha/AppShell.tsx`.
//
// CONFIGURAÇÕES (2026-10-01): virou a parte do navegador do AppShell (que
// agora roda no servidor e lê logo e cor). Ganhou o menu da conta no topo.
// Antes: `git show 4edfd3f:src/components/ficha/AppShell.tsx`.

import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ShellPremium } from "./ShellPremium";
import { BotaoAgente } from "@/components/ia/BotaoAgente";
import { MenuConta } from "./MenuConta";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/papeis";

export function AppShellCliente({
  nomeRestaurante,
  papel,
  tituloPagina,
  nomePessoa,
  logoUrl,
  children,
}: {
  nomeRestaurante: string;
  /** EQUIPE (2026-09-25): filtra o menu pelo papel de quem está logado. */
  papel: Papel;
  tituloPagina: string;
  nomePessoa: string;
  logoUrl: string | null;
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
      papel={papel}
      nomeRestaurante={nomeRestaurante}
      tituloPagina={tituloPagina}
      logoUrl={logoUrl}
      menuConta={
        <MenuConta
          nome={nomePessoa}
          detalhe={`${ROTULO_PAPEL[papel]} · ${nomeRestaurante}`}
          itens={[
            { rotulo: "Minha conta", icone: <UserRound size={16} />, href: "/configuracoes?secao=conta" },
            { rotulo: "Configurações", icone: <Settings size={16} />, href: "/configuracoes" },
            { rotulo: "Sair", icone: <LogOut size={16} />, onClick: sair, separado: true },
          ]}
        />
      }
      acaoRodape={{ rotulo: "Sair da conta", icone: <LogOut size={16} />, onClick: sair }}
      // AGENTE IA (2026-09-26): o agente de verdade (n8n), pra quem usa o agente.
      extrasCabecalho={papel === "dono" || papel === "gestor" || papel === "estoquista" ? <BotaoAgente nomeRestaurante={nomeRestaurante} /> : undefined}
    >
      {children}
    </ShellPremium>
  );
}
