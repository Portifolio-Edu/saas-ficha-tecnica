// CONFIGURAÇÕES (2026-10-01): casca do app logado. Roda no servidor pra ler
// a marca do restaurante (logo e cor de destaque) junto com a página — o
// getClienteAtual tem cache por requisição, então não vai de novo ao banco.
// A cor entra como <style> só com valores da lista conferida
// (src/lib/empresa/cores.ts), nunca o texto do banco direto.
// O layout continua em AppShellCliente/ShellPremium.
// Reverter: `git show 4edfd3f:src/components/ficha/AppShell.tsx` (era o cliente).

import { getClienteAtual } from "@/lib/dados/cliente";
import { cssDaCor } from "@/lib/empresa/cores";
import type { Papel } from "@/lib/auth/papeis";
import { AppShellCliente } from "./AppShellCliente";

export async function AppShell({
  nomeRestaurante,
  papel,
  tituloPagina,
  children,
}: {
  nomeRestaurante: string;
  papel: Papel;
  tituloPagina: string;
  children: React.ReactNode;
}) {
  const cliente = await getClienteAtual();
  const css = cssDaCor(cliente?.corDestaque);
  return (
    <>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <AppShellCliente
        nomeRestaurante={nomeRestaurante}
        papel={papel}
        tituloPagina={tituloPagina}
        nomePessoa={cliente?.nomeMembro ?? nomeRestaurante}
        logoUrl={cliente?.logoUrl ?? null}
      >
        {children}
      </AppShellCliente>
    </>
  );
}
