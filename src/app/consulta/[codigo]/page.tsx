import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { abrirConsulta } from "@/lib/dados/consulta";
import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { ConsultaFuncionarioView } from "@/components/consulta/ConsultaFuncionarioView";

// CELULAR (2026-09-26): link só de consulta do pessoal da cozinha (gerado em
// Equipe e acessos). Sem login: quem tem o link vê a própria escala, as fichas
// sem custo e os checklists do dia. Nada aqui grava. Link errado, desligado ou
// de pessoa que saiu: a mesma tela "link desligado", sem dar pista.
// Dados: src/lib/dados/consulta.ts (função consulta_por_link no banco).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha cozinha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ConsultaPage({ params }: { params: Promise<{ codigo: string }> }) {
  if (!supabaseConfigurado()) redirect("/preview/consulta");
  const { codigo } = await params;
  const dados = await abrirConsulta(codigo);

  if (!dados) {
    return (
      <CartaoAuth titulo="Este link não abre mais" subtitulo="Ele foi desligado ou trocado por um novo. Peça o link atualizado ao gestor do restaurante.">
        <p className="text-[13px] text-[var(--sub)]">Se você trocou de celular, o gestor gera um link novo em poucos segundos.</p>
      </CartaoAuth>
    );
  }

  const atualizadoAs = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return (
    <>
      {/* Checklist marcado no tablet aparece aqui sozinho (ao voltar pra aba e a cada 1 min). */}
      <AtualizacaoAutomatica intervaloMs={60_000} />
      <ConsultaFuncionarioView dados={dados} atualizadoAs={atualizadoAs} />
    </>
  );
}
